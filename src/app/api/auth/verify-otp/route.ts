import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Merchant from '@/models/Merchant';
import { verifyOTP, generateToken, setAuthCookie } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, name, shopName } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
    }

    // For development, also accept "123456" as a universal OTP
    const isValid = verifyOTP(phone, otp) || (process.env.NODE_ENV === 'development' && otp === '123456');

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    let merchantData;

    // Try MongoDB, fall back to in-memory merchant if unavailable
    try {
      await dbConnect();
      let merchant = await Merchant.findOne({ phone });

      if (!merchant) {
        merchant = await Merchant.create({
          phone,
          name: name || 'Merchant',
          shopName: shopName || 'My Shop',
          language: 'en',
          businessType: 'grocery',
        });
      } else if (name || shopName) {
        if (name) merchant.name = name;
        if (shopName) merchant.shopName = shopName;
        await merchant.save();
      }

      const token = generateToken(merchant._id.toString());
      setAuthCookie(token);

      merchantData = {
        id: merchant._id.toString(),
        name: merchant.name,
        phone: merchant.phone,
        shopName: merchant.shopName,
        language: merchant.language,
      };
    } catch (dbError) {
      console.warn('[DEV] MongoDB unavailable, using fallback auth:', (dbError as Error).message);

      // Fallback: generate token with phone-based ID and set cookie
      const fallbackId = `dev_${phone}`;
      
      // Create merchant in memory store if not exists
      let memMerchant = memStore.findMerchant(phone);
      if (!memMerchant) {
        memMerchant = memStore.createMerchant({
          _id: fallbackId,
          phone,
          name: name || 'Merchant',
          shopName: shopName || 'My Shop',
          language: 'en',
          businessType: 'grocery',
        });
      } else if (name || shopName) {
        memStore.updateMerchant(memMerchant._id, { name: name || memMerchant.name, shopName: shopName || memMerchant.shopName });
      }

      const token = generateToken(fallbackId);
      setAuthCookie(token);

      merchantData = {
        id: fallbackId,
        name: name || memMerchant.name,
        phone,
        shopName: shopName || memMerchant.shopName,
        language: 'en',
      };
    }

    return NextResponse.json({
      success: true,
      merchant: merchantData,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
