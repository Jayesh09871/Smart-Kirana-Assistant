import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Merchant from '@/models/Merchant';
import Customer from '@/models/Customer';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import Reminder from '@/models/Reminder';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { memStore } from '@/lib/store';

export async function POST() {
  try {
    const merchantData = {
      name: 'Rajesh Kumar',
      phone: '9876543210',
      shopName: 'Kumar Kirana Store',
      language: 'en' as const,
      businessType: 'grocery',
    };

    let merchantId: string;

    try {
      await dbConnect();

      const merchant = await Merchant.findOneAndUpdate(
        { phone: '9876543210' }, merchantData,
        { upsert: true, new: true }
      );

      merchantId = merchant._id.toString();

      await Customer.deleteMany({ merchantId });
      await Transaction.deleteMany({ merchantId });
      await Product.deleteMany({ merchantId });
      await Reminder.deleteMany({ merchantId });

      const customerData = [
        { name: 'Ramesh Sharma', phone: '9876543211' },
        { name: 'Shyam Verma', phone: '9876543212' },
        { name: 'Priya Singh', phone: '9876543213' },
        { name: 'Mohan Gupta', phone: '9876543214' },
        { name: 'Sunita Devi', phone: '9876543215' },
        { name: 'Anil Kumar', phone: '9876543216' },
        { name: 'Geeta Bai', phone: '9876543217' },
        { name: 'Vijay Patel', phone: '9876543218' },
        { name: 'Lakshmi Nair', phone: '9876543219' },
        { name: 'Deepak Joshi', phone: '9876543220' },
        { name: 'Kamla Ben', phone: '9876543221' },
        { name: 'Suresh Yadav', phone: '9876543222' },
      ];

      const customers = await Customer.insertMany(
        customerData.map((c) => ({ ...c, merchantId, totalUdhar: 0, totalPaid: 0, balance: 0 }))
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transactions: any[] = [];
      const now = new Date();
      customers.forEach((customer, idx) => {
        const numTxns = 2 + (idx % 3);
        for (let j = 0; j < numTxns; j++) {
          const daysAgo = Math.floor(Math.random() * 30);
          const date = new Date(now);
          date.setDate(date.getDate() - daysAgo);
          date.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
          const isUdhar = Math.random() > 0.3;
          const amount = Math.floor(Math.random() * 900 + 100);
          transactions.push({
            merchantId, customerId: customer._id,
            type: isUdhar ? 'udhar' : 'payment', amount,
            description: isUdhar ? 'Saman udhar' : 'Payment received',
            items: isUdhar ? ['Atta', 'Dal', 'Cheeni'].slice(0, Math.floor(Math.random() * 3) + 1) : [],
            date, synced: true,
          });
        }
      });

      const createdTxns = await Transaction.insertMany(transactions);
      for (const customer of customers) {
        const custTxns = createdTxns.filter((t) => t.customerId.toString() === customer._id.toString());
        const totalUdhar = custTxns.filter((t) => t.type === 'udhar').reduce((s, t) => s + t.amount, 0);
        const totalPaid = custTxns.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
        await Customer.findByIdAndUpdate(customer._id, { totalUdhar, totalPaid, balance: totalUdhar - totalPaid });
      }

      const products = [
        { name: 'Atta (Wheat Flour)', category: 'Staples', price: 45, stock: 25, minStock: 10, unit: 'kg' },
        { name: 'Basmati Rice', category: 'Staples', price: 80, stock: 30, minStock: 10, unit: 'kg' },
        { name: 'Toor Dal', category: 'Pulses', price: 120, stock: 8, minStock: 10, unit: 'kg' },
        { name: 'Moong Dal', category: 'Pulses', price: 110, stock: 15, minStock: 8, unit: 'kg' },
        { name: 'Cheeni (Sugar)', category: 'Staples', price: 42, stock: 3, minStock: 10, unit: 'kg' },
        { name: 'Namak (Salt)', category: 'Staples', price: 20, stock: 50, minStock: 20, unit: 'kg' },
        { name: 'Sarson Tel', category: 'Oils', price: 160, stock: 12, minStock: 5, unit: 'ltr' },
        { name: 'Refined Oil', category: 'Oils', price: 130, stock: 4, minStock: 5, unit: 'ltr' },
        { name: 'Chai Patti (Tea)', category: 'Beverages', price: 250, stock: 6, minStock: 3, unit: 'kg' },
        { name: 'Doodh (Milk)', category: 'Dairy', price: 56, stock: 20, minStock: 10, unit: 'ltr' },
        { name: 'Paneer', category: 'Dairy', price: 320, stock: 2, minStock: 3, unit: 'kg' },
        { name: 'Biscuits (Parle-G)', category: 'Snacks', price: 10, stock: 100, minStock: 50, unit: 'pcs' },
        { name: 'Maggi Noodles', category: 'Snacks', price: 14, stock: 45, minStock: 20, unit: 'pcs' },
        { name: 'Sabun (Soap)', category: 'Household', price: 35, stock: 30, minStock: 10, unit: 'pcs' },
        { name: 'Surf (Detergent)', category: 'Household', price: 95, stock: 7, minStock: 5, unit: 'kg' },
        { name: 'Besan', category: 'Staples', price: 70, stock: 10, minStock: 5, unit: 'kg' },
        { name: 'Haldi (Turmeric)', category: 'Spices', price: 180, stock: 3, minStock: 2, unit: 'kg' },
        { name: 'Mirch Powder', category: 'Spices', price: 220, stock: 2, minStock: 2, unit: 'kg' },
        { name: 'Jeera (Cumin)', category: 'Spices', price: 350, stock: 1, minStock: 2, unit: 'kg' },
      ];
      await Product.insertMany(products.map((p) => ({ ...p, merchantId })));

      const highBalanceCustomers = await Customer.find({ merchantId, balance: { $gt: 500 } });
      const reminders = highBalanceCustomers.slice(0, 5).map((c) => ({
        merchantId, customerId: c._id, type: 'payment' as const,
        message: `${c.name} has pending balance of ₹${c.balance}. Send payment reminder.`,
        dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), sent: false,
      }));
      if (reminders.length > 0) await Reminder.insertMany(reminders);

    } catch {
      // MongoDB unavailable - use memory store
      console.warn('[SEED] MongoDB unavailable, seeding in-memory store');
      const fallbackId = 'dev_9876543210';
      merchantId = fallbackId;
      memStore.createMerchant({ _id: fallbackId, ...merchantData });
      memStore.seedDemoData(fallbackId);
    }

    const token = generateToken(merchantId);
    setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Seed data created successfully',
      merchant: { id: merchantId, phone: '9876543210', shopName: merchantData.shopName },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
