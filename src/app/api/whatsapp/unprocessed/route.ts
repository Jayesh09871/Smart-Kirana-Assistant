import { getMerchantIdFromRequest } from '@/lib/auth';
import { parseWhatsAppOrder } from '@/lib/groq';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import WhatsAppMessage from '@/models/WhatsAppMessage';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) {
      console.error('Unprocessed GET: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Unprocessed GET: Fetching for merchant:', merchantId);
    
    await dbConnect();
    
    const unprocessed = await WhatsAppMessage.find({ 
      merchantId, 
      status: 'received' 
    }).sort({ createdAt: -1 });
    
    console.log('Unprocessed GET: Found', unprocessed.length, 'messages');
    
    return NextResponse.json({ messages: unprocessed });
  } catch (error) {
    console.error('Unprocessed GET Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) {
      console.error('Unprocessed POST: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { messageId } = await request.json();
    console.log('Unprocessed POST: Processing messageId:', messageId);
    
    await dbConnect();
    
    const msg = await WhatsAppMessage.findOne({ messageId, merchantId });
    if (!msg) {
      console.error('Unprocessed POST: Message not found');
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    if (msg.status === 'processed' && msg.orderId) {
      console.log('Unprocessed POST: Message already processed');
      const order = await Order.findById(msg.orderId);
      return NextResponse.json({ success: true, order, alreadyProcessed: true });
    }
    
    const parsed = await parseWhatsAppOrder(msg.messageBody);
    console.log('Unprocessed POST: Parsed order:', parsed);
    
    let customer = await Customer.findOne({ merchantId, phone: msg.fromPhone });
    if (!customer) {
      customer = await Customer.create({
        merchantId,
        name: parsed.customerName,
        phone: msg.fromPhone,
        totalUdhar: 0,
        totalPaid: 0,
        balance: 0
      });
      console.log('Unprocessed POST: Created new customer');
    }
    
    const order = await Order.create({
      merchantId,
      customerId: customer._id,
      customerName: parsed.customerName,
      customerPhone: msg.fromPhone,
      items: parsed.items,
      notes: parsed.notes,
      status: 'pending',
      whatsappMessageId: msg._id
    });
    
    console.log('Unprocessed POST: Created order:', order._id);
    
    msg.status = 'processed';
    msg.orderId = order._id;
    await msg.save();
    
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Unprocessed POST Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
