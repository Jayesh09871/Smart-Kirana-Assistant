import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { NextRequest, NextResponse } from 'next/server';
import { memStore, getUseMemoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Get orders
export async function GET(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    console.log('[Orders API] Merchant ID from request:', merchantId);
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Check if using memory store
    if (getUseMemoryStore() || !isValidObjectId(merchantId)) {
      console.log('[Orders API] Using memory store');
      const orders = memStore.findOrders(merchantId, status || undefined);
      console.log('[Orders API] Found', orders.length, 'orders in memory store');
      return NextResponse.json({ orders });
    }

    await dbConnect();
    const query: Record<string, unknown> = { merchantId };
    if (status) query.status = status;

    console.log('[Orders API] Query:', query);

    const orders = await Order.find(query)
      .populate('customerId')
      .sort({ createdAt: -1 });

    console.log('[Orders API] Found', orders.length, 'orders');

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
