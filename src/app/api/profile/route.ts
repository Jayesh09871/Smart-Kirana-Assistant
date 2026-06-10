import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Merchant from '@/models/Merchant';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function GET() {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isValidObjectId(merchantId)) {
      const merchant = memStore.findMerchantById(merchantId);
      if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ merchant });
    }

    try {
      await dbConnect();
      const merchant = await Merchant.findById(merchantId).select('-password');
      if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ merchant });
    } catch {
      const merchant = memStore.findMerchantById(merchantId);
      if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ merchant });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, shopName, language, businessType } = await request.json();

    if (!isValidObjectId(merchantId)) {
      const merchant = memStore.updateMerchant(merchantId, { name, shopName, language, businessType });
      return NextResponse.json({ merchant });
    }

    try {
      await dbConnect();
      const merchant = await Merchant.findByIdAndUpdate(
        merchantId, { $set: { name, shopName, language, businessType } }, { new: true }
      ).select('-password');
      return NextResponse.json({ merchant });
    } catch {
      const merchant = memStore.updateMerchant(merchantId, { name, shopName, language, businessType });
      return NextResponse.json({ merchant });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
