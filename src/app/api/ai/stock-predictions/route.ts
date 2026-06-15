import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { getStockPredictions } from '@/lib/groq';
import { memStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let products: { name: string; stock: number; minStock: number }[] = [];
    let recentTxns: { items: string[]; date: Date }[] = [];

    if (!isValidObjectId(merchantId)) {
      // Use memory store directly for non-ObjectId merchant IDs
      const memProducts = memStore.findProducts(merchantId);
      products = memProducts.map((p) => ({ name: p.name, stock: p.stock, minStock: p.minStock }));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const memTxns = memStore.findTransactions(merchantId, undefined, 200).filter((t) => t.date >= sevenDaysAgo);
      recentTxns = memTxns.map((t) => ({ items: t.items || [], date: t.date }));
    } else {
      try {
      await dbConnect();
      const dbProducts = await Product.find({ merchantId }).lean();
      products = dbProducts.map((p) => ({ name: p.name, stock: p.stock, minStock: p.minStock }));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dbTxns = await Transaction.find({ merchantId, date: { $gte: sevenDaysAgo } })
        .select('items date').lean();
      recentTxns = dbTxns.map((t) => ({ items: t.items || [], date: t.date }));
      } catch {
        // Fallback to memory store
        const memProducts = memStore.findProducts(merchantId);
        products = memProducts.map((p) => ({ name: p.name, stock: p.stock, minStock: p.minStock }));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const memTxns = memStore.findTransactions(merchantId, undefined, 200).filter((t) => t.date >= sevenDaysAgo);
        recentTxns = memTxns.map((t) => ({ items: t.items || [], date: t.date }));
      }
    }

    const predictions = await getStockPredictions(products, recentTxns);
    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('Stock predictions error:', error);
    return NextResponse.json({ error: 'Failed to get predictions' }, { status: 500 });
  }
}
