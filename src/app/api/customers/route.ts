import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    if (!isValidObjectId(merchantId)) {
      const customers = memStore.findCustomers(merchantId, search || undefined);
      return NextResponse.json({ customers });
    }

    try {
      await dbConnect();
      const query: Record<string, unknown> = { merchantId };
      if (search) query.name = { $regex: search, $options: 'i' };
      const customers = await Customer.find(query).sort({ balance: -1, createdAt: -1 });
      return NextResponse.json({ customers });
    } catch {
      const customers = memStore.findCustomers(merchantId, search || undefined);
      return NextResponse.json({ customers });
    }
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { name?: string; phone?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, phone } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    if (!isValidObjectId(merchantId)) {
      const customer = memStore.createCustomer({ merchantId, name: name.trim(), phone });
      return NextResponse.json({ customer }, { status: 201 });
    }

    try {
      await dbConnect();
      const customer = await Customer.create({
        merchantId, name: name.trim(), phone: phone || '', totalUdhar: 0, totalPaid: 0, balance: 0,
      });
      return NextResponse.json({ customer }, { status: 201 });
    } catch {
      const customer = memStore.createCustomer({ merchantId, name: name.trim(), phone });
      return NextResponse.json({ customer }, { status: 201 });
    }
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
