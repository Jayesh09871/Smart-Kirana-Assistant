import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { getUseMemoryStore, memStore } from '@/lib/store';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Transaction from '@/models/Transaction';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orderId = params.id;

    // Check if using memory store
    if (getUseMemoryStore() || !isValidObjectId(merchantId)) {
      const order = memStore.findOrderById(orderId);
      if (!order || order.merchantId !== merchantId) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Remove from memory store
      memStore.orders = memStore.orders.filter(o => o._id !== orderId);
      return NextResponse.json({ success: true });
    }

    // Using MongoDB
    await dbConnect();
    const result = await Order.deleteOne({ _id: orderId, merchantId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status, items, customerName, notes } = await request.json();
    const orderId = params.id;

    // Check if using memory store
    if (getUseMemoryStore() || !isValidObjectId(merchantId)) {
      const order = memStore.findOrderById(orderId);
      if (!order || order.merchantId !== merchantId) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const updatedOrder = memStore.updateOrder(orderId, {
        status,
        items,
        customerName,
        notes,
      });

      if (status === 'confirmed') {
        // Create a transaction for the confirmed order
        const customer = memStore.customers.find(c => c._id === order.customerId);
        if (customer) {
          memStore.createTransaction({
            merchantId,
            customerId: customer._id,
            type: 'udhar',
            amount: 0, // We don't have prices for items yet
            description: 'WhatsApp order confirmed',
            items: items?.map((i: { productName: string }) => i.productName) || [],
          });
        }
      }

      return NextResponse.json({ order: updatedOrder });
    }

    // Using MongoDB
    await dbConnect();
    const order = await Order.findOne({ _id: orderId, merchantId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (items) order.items = items;
    if (customerName) order.customerName = customerName;
    if (notes) order.notes = notes;
    order.status = status;
    await order.save();

    if (status === 'confirmed') {
      // Find or create customer
      let customer = await Customer.findOne({ merchantId, phone: order.customerPhone });
      if (!customer) {
        customer = await Customer.create({
          merchantId,
          name: order.customerName,
          phone: order.customerPhone,
          totalUdhar: 0,
          totalPaid: 0,
          balance: 0,
        });
      }

      // Create transaction
      await Transaction.create({
        merchantId,
        customerId: customer._id,
        type: 'udhar',
        amount: 0, // We don't have prices for items yet
        description: 'WhatsApp order confirmed',
        items: items?.map((i: { productName: string }) => i.productName) || [],
        synced: true,
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
