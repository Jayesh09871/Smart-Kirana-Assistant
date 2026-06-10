import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Customer from '@/models/Customer';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!isValidObjectId(merchantId)) {
      const transactions = memStore.findTransactions(merchantId, customerId || undefined, limit);
      return NextResponse.json({ transactions });
    }

    try {
      await dbConnect();
      const query: Record<string, unknown> = { merchantId };
      if (customerId) query.customerId = customerId;
      const transactions = await Transaction.find(query).sort({ date: -1 }).limit(limit);
      return NextResponse.json({ transactions });
    } catch {
      const transactions = memStore.findTransactions(merchantId, customerId || undefined, limit);
      return NextResponse.json({ transactions });
    }
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const customerId = body.customerId as string;
    const type = body.type as 'udhar' | 'payment';
    const amount = Number(body.amount);
    const description = (body.description as string) || '';
    const items = (body.items as string[]) || [];
    const date = body.date ? new Date(body.date as string) : new Date();

    if (!customerId || !type || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Customer ID, type, and valid amount required' },
        { status: 400 }
      );
    }

    if (!isValidObjectId(merchantId)) {
      const transaction = memStore.createTransaction({ merchantId, customerId, type, amount, description, items, date });
      return NextResponse.json({ transaction }, { status: 201 });
    }

    try {
      await dbConnect();
      const transaction = await Transaction.create({
        merchantId, customerId, type, amount,
        description, items, date, synced: true,
      });

      const updateField =
        type === 'udhar'
          ? { $inc: { totalUdhar: amount, balance: amount } }
          : { $inc: { totalPaid: amount, balance: -amount } };
      await Customer.findByIdAndUpdate(customerId, updateField);

      return NextResponse.json({ transaction }, { status: 201 });
    } catch {
      const transaction = memStore.createTransaction({
        merchantId, customerId, type, amount,
        description, items, date,
      });
      return NextResponse.json({ transaction }, { status: 201 });
    }
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
