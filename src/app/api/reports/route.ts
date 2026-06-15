import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { memStore } from '@/lib/store';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';

    // If merchantId is not a valid ObjectId, use memory store directly
    if (!isValidObjectId(merchantId)) {
      const data = memStore.getReportData(merchantId, range);
      return NextResponse.json(data);
    }

    try {
      await dbConnect();
      let startDate = new Date();
      if (range === 'week') startDate.setDate(startDate.getDate() - 7);
      else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);
      else startDate = new Date(0);

      const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
      const salesAgg = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, date: { $gte: startDate } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]);

      const totalUdhar = salesAgg.find((s) => s._id === 'udhar')?.total || 0;
      const totalPayments = salesAgg.find((s) => s._id === 'payment')?.total || 0;
      const lowStockItems = await Product.find({ merchantId, $expr: { $lte: ['$stock', '$minStock'] } }).lean();

      const topCustomers = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, date: { $gte: startDate }, type: 'udhar' } },
        { $group: { _id: '$customerId', amount: { $sum: '$amount' }, transactions: { $sum: 1 } } },
        { $sort: { amount: -1 } }, { $limit: 5 },
      ]);

      const topCustomerIds = topCustomers.map((c) => c._id);
      const customerNames = await Customer.find({ _id: { $in: topCustomerIds } }).lean();
      const nameMap = new Map(customerNames.map((c) => [c._id.toString(), c.name]));
      const enrichedTopCustomers = topCustomers.map((c) => ({
        name: nameMap.get(c._id.toString()) || 'Unknown', amount: c.amount, transactions: c.transactions,
      }));

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const salesByDayAgg = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, date: { $gte: startDate }, type: 'udhar' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]);

      const daysCount = range === 'week' ? 7 : 30;
      const salesByDay = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = salesByDayAgg.find((w) => w._id === dateStr);
        salesByDay.push({ day: range === 'week' ? dayNames[d.getDay()] : d.getDate().toString(), amount: dayData ? dayData.amount : 0 });
      }

      const pendingDues = await Customer.find({ merchantId, balance: { $gt: 0 } }).sort({ balance: -1 }).limit(10).lean();

      return NextResponse.json({
        totalSales: totalUdhar, totalUdhar, totalPayments,
        lowStockItems, topCustomers: enrichedTopCustomers, salesByDay, pendingDues,
      });
    } catch {
      const data = memStore.getReportData(merchantId, range);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
