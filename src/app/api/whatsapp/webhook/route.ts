import { parseWhatsAppOrder } from '@/lib/groq';
import dbConnect from '@/lib/mongodb';
import { memStore } from '@/lib/store';
import Customer from '@/models/Customer';
import Merchant from '@/models/Merchant';
import Order from '@/models/Order';
import WhatsAppMessage from '@/models/WhatsAppMessage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Verify webhook (Meta's challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[Webhook] Verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received message:', JSON.stringify(body, null, 2));

    // Validate it's a WhatsApp message
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const message = body.entry[0].changes[0].value.messages[0];
    const metadata = body.entry[0].changes[0].value.metadata;

    const fromPhone = message.from;
    const toPhone = metadata.phone_number_id;
    const messageBody = message.text?.body || '';
    const messageId = message.id;

    console.log(`[Webhook] From: ${fromPhone}, To Phone ID: ${toPhone}, Message: ${messageBody}`);

    // First try MongoDB (this is the main fix!)
    try {
      await dbConnect();
      
      console.log('[Webhook] Looking for merchant in MongoDB...');
      let merchant = await Merchant.findOne({ whatsappPhoneNumber: fromPhone });
      console.log('[Webhook] Merchant by whatsappPhoneNumber:', merchant);
      
      if (!merchant) {
        const phoneWithoutCountry = fromPhone.replace(/^91/, '');
        merchant = await Merchant.findOne({ phone: phoneWithoutCountry });
        console.log('[Webhook] Merchant by phone:', merchant);
      }
      
      if (!merchant) {
        merchant = await Merchant.findOne();
        console.log('[Webhook] First merchant found:', merchant);
      }
      
      if (merchant) {
        console.log('[Webhook] Using merchant with ID:', merchant._id);

        // Check if WhatsApp message already exists
        let whatsappMsg = await WhatsAppMessage.findOne({ messageId });
        if (!whatsappMsg) {
          whatsappMsg = await WhatsAppMessage.create({
            merchantId: merchant._id,
            fromPhone,
            toPhone,
            messageBody,
            messageId,
            status: 'received',
          });
        } else {
          console.log('[Webhook] Found existing message, skipping');
          if (whatsappMsg.status === 'processed' && whatsappMsg.orderId) {
            return NextResponse.json({ success: true, orderId: whatsappMsg.orderId }, { status: 200 });
          }
        }

        // Parse the order
        const parsedOrder = await parseWhatsAppOrder(messageBody);
        console.log('[Webhook] Parsed order:', parsedOrder);

        // Find or create customer
        let customer = await Customer.findOne({ merchantId: merchant._id, phone: fromPhone });
        if (!customer) {
          customer = await Customer.create({
            merchantId: merchant._id,
            name: parsedOrder.customerName,
            phone: fromPhone,
            totalUdhar: 0,
            totalPaid: 0,
            balance: 0,
          });
        }

        // Create the order
        const order = await Order.create({
          merchantId: merchant._id,
          customerId: customer._id,
          customerName: parsedOrder.customerName,
          customerPhone: fromPhone,
          items: parsedOrder.items,
          notes: parsedOrder.notes,
          status: 'pending',
          whatsappMessageId: whatsappMsg._id,
        });

        // Update message
        whatsappMsg.status = 'processed';
        whatsappMsg.orderId = order._id;
        await whatsappMsg.save();

        console.log('[Webhook] Order created in MongoDB:', order._id);
        return NextResponse.json({ success: true, orderId: order._id }, { status: 200 });
      }
      
    } catch (mongoErr) {
      console.error('[Webhook] MongoDB failed, falling back to memory store', mongoErr);
    }

    // Fallback to memory store if MongoDB fails/doesn't work
    console.log('[Webhook] Falling back to memory store');
    let merchant = memStore.merchants[0];
    if (!merchant) {
      merchant = memStore.createMerchant({
        _id: 'dev_default',
        name: 'Test Merchant',
        phone: 'default',
        shopName: 'Test Shop'
      });
    }

    // Check for existing message in memory
    const existingMsg = memStore.whatsappMessages.find(m => m.messageId === messageId);
    if (existingMsg && existingMsg.status === 'processed') {
      console.log('[Webhook] Message already processed in memory');
      return NextResponse.json({ success: true, orderId: existingMsg.orderId }, { status: 200 });
    }

    const whatsappMsg = memStore.createWhatsAppMessage({
      merchantId: merchant._id,
      fromPhone,
      toPhone,
      messageBody,
      messageId,
      status: 'received'
    });

    const parsedOrder = await parseWhatsAppOrder(messageBody);
    let customer = memStore.customers.find(c => c.merchantId === merchant._id && c.phone === fromPhone);
    if (!customer) {
      customer = memStore.createCustomer({
        merchantId: merchant._id,
        name: parsedOrder.customerName,
        phone: fromPhone
      });
    }

    const order = memStore.createOrder({
      merchantId: merchant._id,
      customerId: customer._id,
      customerName: parsedOrder.customerName,
      customerPhone: fromPhone,
      items: parsedOrder.items,
      notes: parsedOrder.notes,
      status: 'pending'
    });

    const msgIndex = memStore.whatsappMessages.findIndex(m => m._id === whatsappMsg._id);
    if (msgIndex !== -1) {
      memStore.whatsappMessages[msgIndex].status = 'processed';
      memStore.whatsappMessages[msgIndex].orderId = order._id;
    }

    console.log('[Webhook] Order created in memory:', order._id);
    return NextResponse.json({ success: true, orderId: order._id });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
