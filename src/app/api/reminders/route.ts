import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Reminder from '@/models/Reminder';
import Customer from '@/models/Customer';
import { getMerchantIdFromRequest, isValidObjectId } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function GET() {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isValidObjectId(merchantId)) {
      const reminders = memStore.findReminders(merchantId);
      return NextResponse.json({ reminders });
    }

    try {
      await dbConnect();
      const reminders = await Reminder.find({ merchantId }).sort({ dueDate: 1 }).lean();
      const customerIds = reminders.map((r) => r.customerId).filter(Boolean);
      if (customerIds.length > 0) {
        const customers = await Customer.find({ _id: { $in: customerIds } }).lean();
        const nameMap = new Map(customers.map((c) => [c._id.toString(), c.name]));
        reminders.forEach((r) => {
          if (r.customerId) (r as Record<string, unknown>).customerName = nameMap.get(r.customerId.toString()) || '';
        });
      }
      return NextResponse.json({ reminders });
    } catch {
      const reminders = memStore.findReminders(merchantId);
      return NextResponse.json({ reminders });
    }
  } catch (error) {
    console.error('Get reminders error:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchantId = getMerchantIdFromRequest();
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { customerId, type, message, dueDate } = await request.json();

    if (!isValidObjectId(merchantId)) {
      const reminder = memStore.createReminder({ merchantId, customerId, type, message, dueDate: dueDate ? new Date(dueDate) : undefined });
      return NextResponse.json({ reminder }, { status: 201 });
    }

    try {
      await dbConnect();
      const reminder = await Reminder.create({
        merchantId, customerId: customerId || null,
        type: type || 'general', message, dueDate: dueDate || new Date(),
      });
      return NextResponse.json({ reminder }, { status: 201 });
    } catch {
      const reminder = memStore.createReminder({ merchantId, customerId, type, message, dueDate: dueDate ? new Date(dueDate) : undefined });
      return NextResponse.json({ reminder }, { status: 201 });
    }
  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}
