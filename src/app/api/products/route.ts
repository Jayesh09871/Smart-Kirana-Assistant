import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (!isValidObjectId(merchantId)) {
      const products = memStore.findProducts(merchantId, category || undefined, search || undefined);
      return NextResponse.json({ products });
    }

    try {
      await dbConnect();
      const query: Record<string, unknown> = { merchantId };
      if (category && category !== 'All') query.category = category;
      if (search) query.name = { $regex: search, $options: 'i' };
      const products = await Product.find(query).sort({ stock: 1, name: 1 });
      return NextResponse.json({ products });
    } catch {
      const products = memStore.findProducts(merchantId, category || undefined, search || undefined);
      return NextResponse.json({ products });
    }
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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

    const name = body.name as string;
    const price = Number(body.price);
    const category = (body.category as string) || 'General';
    const stock = Number(body.stock) || 0;
    const minStock = Number(body.minStock) || 5;
    const unit = (body.unit as string) || 'pcs';

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    if (!isValidObjectId(merchantId)) {
      const product = memStore.createProduct({ merchantId, name: name.trim(), category, price, stock, minStock, unit });
      return NextResponse.json({ product }, { status: 201 });
    }

    try {
      await dbConnect();
      const product = await Product.create({
        merchantId, name: name.trim(), category, price, stock, minStock, unit,
      });
      return NextResponse.json({ product }, { status: 201 });
    } catch {
      const product = memStore.createProduct({ merchantId, name: name.trim(), category, price, stock, minStock, unit });
      return NextResponse.json({ product }, { status: 201 });
    }
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
