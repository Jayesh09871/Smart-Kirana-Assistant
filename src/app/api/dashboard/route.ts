import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // If merchantId is not a valid ObjectId (e.g., dev_ prefix), use memory store directly
    if (!isValidObjectId(merchantId)) {
      const data = memStore.getDashboardData(merchantId);
      return NextResponse.json(data);
    }

    try {
      await dbConnect();
      const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

      const customers = await Customer.find({ merchantId });
      const totalUdhar = customers.reduce((sum, c) => sum + c.balance, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPayments = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, type: 'payment', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const dailySales = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, type: 'udhar', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const lowStockCount = await Product.countDocuments({
        merchantId, $expr: { $lte: ['$stock', '$minStock'] },
      });

      const recentTransactions = await Transaction.find({ merchantId }).sort({ date: -1 }).limit(10).lean();
      const customerIds = Array.from(new Set(recentTransactions.map((t) => t.customerId.toString())));
      const customerMap = await Customer.find({ _id: { $in: customerIds } }).lean();
      const nameMap = new Map(customerMap.map((c) => [c._id.toString(), c.name]));
      const enrichedTransactions = recentTransactions.map((t) => ({
        ...t, customerName: nameMap.get(t.customerId.toString()) || 'Unknown',
      }));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const weeklyData = await Transaction.aggregate([
        { $match: { merchantId: merchantObjectId, date: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, udhar: { $sum: { $cond: [{ $eq: ['$type', 'udhar'] }, '$amount', 0] } } } },
        { $sort: { _id: 1 } },
      ]);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklySales = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = weeklyData.find((w) => w._id === dateStr);
        weeklySales.push({ day: dayNames[d.getDay()], amount: dayData ? dayData.udhar : 0 });
      }

      return NextResponse.json({
        totalUdhar, todayPayments: todayPayments[0]?.total || 0,
        dailySales: dailySales[0]?.total || 0, lowStockCount,
        recentTransactions: enrichedTransactions, weeklySales,
      });
    } catch {
      // Fallback to memory store
      const data = memStore.getDashboardData(merchantId);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
