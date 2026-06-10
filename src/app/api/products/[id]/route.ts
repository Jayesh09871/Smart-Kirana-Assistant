import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { getMerchantIdFromRequest } from '@/lib/auth';
import { memStore } from '@/lib/store';

function isMemId(id: string): boolean {
  return id.startsWith('mem_');
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

    // Build clean update fields
    const updateFields: Record<string, unknown> = {};
    if (body.stock !== undefined && body.stock !== null) updateFields.stock = Number(body.stock);
    if (body.price !== undefined && body.price !== null) updateFields.price = Number(body.price);
    if (body.name !== undefined) updateFields.name = String(body.name);
    if (body.category !== undefined) updateFields.category = String(body.category);
    if (body.minStock !== undefined && body.minStock !== null) updateFields.minStock = Number(body.minStock);
    if (body.unit !== undefined) updateFields.unit = String(body.unit);

    // Memory IDs: go directly to memory store (avoids MongoDB CastError)
    if (isMemId(params.id)) {
      const product = memStore.updateProduct(params.id, updateFields);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ product });
    }

    try {
      await dbConnect();
      const updateData: Record<string, unknown> = { ...updateFields };
      if (updateData.stock !== undefined) updateData.lastRestocked = new Date();

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      const product = await Product.findOneAndUpdate(
        { _id: params.id, merchantId }, { $set: updateData }, { new: true }
      );
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ product });
    } catch {
      const product = memStore.updateProduct(params.id, updateFields);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ product });
    }
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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
      const deleted = memStore.deleteProduct(params.id);
      if (!deleted) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    try {
      await dbConnect();
      const product = await Product.findOneAndDelete({ _id: params.id, merchantId });
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    } catch {
      const deleted = memStore.deleteProduct(params.id);
      if (!deleted) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
