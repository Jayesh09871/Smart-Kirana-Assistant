import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import Reminder from '@/models/Reminder';
import { getMerchantIdFromRequest } from '@/lib/auth';
import { memStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Helper: check if ID is from memory store
function isMemId(id: string): boolean {
  return id.startsWith('mem_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Memory IDs: go directly to memory store
    if (isMemId(params.id)) {
      const customer = memStore.findCustomerById(params.id);
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      const transactions = memStore.findTransactions(merchantId, params.id);
      return NextResponse.json({ customer, transactions });
    }

    try {
      await dbConnect();
      const customer = await Customer.findOne({ _id: params.id, merchantId });
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      const transactions = await Transaction.find({ merchantId, customerId: params.id }).sort({ date: -1 });
      return NextResponse.json({ customer, transactions });
    } catch {
      const customer = memStore.findCustomerById(params.id);
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      const transactions = memStore.findTransactions(merchantId, params.id);
      return NextResponse.json({ customer, transactions });
    }
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (isMemId(params.id)) {
      const customer = memStore.updateCustomer(params.id, body as Record<string, unknown>);
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ customer });
    }

    try {
      await dbConnect();
      const customer = await Customer.findOneAndUpdate(
        { _id: params.id, merchantId }, { $set: body }, { new: true }
      );
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ customer });
    } catch {
      const customer = memStore.updateCustomer(params.id, body as Record<string, unknown>);
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ customer });
    }
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (isMemId(params.id)) {
      const deleted = memStore.deleteCustomer(params.id);
      if (!deleted) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    try {
      await dbConnect();
      const customer = await Customer.findOneAndDelete({ _id: params.id, merchantId });
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      await Transaction.deleteMany({ merchantId, customerId: params.id });
      await Reminder.deleteMany({ merchantId, customerId: params.id });
      return NextResponse.json({ success: true });
    } catch {
      const deleted = memStore.deleteCustomer(params.id);
      if (!deleted) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
