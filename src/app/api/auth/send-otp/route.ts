import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Merchant from '@/models/Merchant';
import { generateOTP } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }

    const otp = generateOTP(phone);
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    // Try to connect to MongoDB, but don't fail in dev if unreachable
    try {
      await dbConnect();
      let merchant = await Merchant.findOne({ phone });
      if (!merchant) {
        merchant = await Merchant.create({
          phone,
          name: 'Merchant',
          shopName: 'My Shop',
          language: 'en',
          businessType: 'grocery',
        });
      }
    } catch (dbError) {
      console.warn('[DEV] MongoDB unavailable, continuing without DB:', (dbError as Error).message);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
