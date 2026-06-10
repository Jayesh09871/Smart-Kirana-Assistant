// In-memory fallback store when MongoDB is unavailable
// Data is persisted on globalThis to survive Next.js hot reloads in development

interface StoreMerchant {
  _id: string;
  name: string;
  phone: string;
  shopName: string;
  language: 'en' | 'hi';
  businessType: string;
  createdAt: Date;
}

interface StoreCustomer {
  _id: string;
  merchantId: string;
  name: string;
  phone: string;
  totalUdhar: number;
  totalPaid: number;
  balance: number;
  createdAt: Date;
}

interface StoreTransaction {
  _id: string;
  merchantId: string;
  customerId: string;
  type: 'udhar' | 'payment';
  amount: number;
  description: string;
  items: string[];
  date: Date;
  synced: boolean;
  createdAt: Date;
}

interface StoreProduct {
  _id: string;
  merchantId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  lastRestocked?: Date;
  createdAt: Date;
}

interface StoreReminder {
  _id: string;
  merchantId: string;
  customerId: string;
  type: 'payment' | 'restock' | 'general';
  message: string;
  dueDate: Date;
  sent: boolean;
  customerName?: string;
  createdAt: Date;
}

// Persist idCounter on globalThis to avoid ID collisions across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __memStoreIdCounter: number | undefined;
  // eslint-disable-next-line no-var
  var __memStoreInstance: MemoryStore | undefined;
  // eslint-disable-next-line no-var
  var __useMemoryStore: boolean | undefined;
}

function genId(): string {
  if (global.__memStoreIdCounter === undefined) global.__memStoreIdCounter = 1000;
  global.__memStoreIdCounter += 1;
  return `mem_${global.__memStoreIdCounter}_${Date.now()}`;
}

class MemoryStore {
  merchants: StoreMerchant[] = [];
  customers: StoreCustomer[] = [];
  transactions: StoreTransaction[] = [];
  products: StoreProduct[] = [];
  reminders: StoreReminder[] = [];
  seeded = false;

  // Merchant
  findMerchant(phone: string): StoreMerchant | undefined {
    return this.merchants.find((m) => m.phone === phone);
  }

  findMerchantById(id: string): StoreMerchant | undefined {
    return this.merchants.find((m) => m._id === id);
  }

  createMerchant(data: Partial<StoreMerchant>): StoreMerchant {
    const existing = data.phone ? this.findMerchant(data.phone) : undefined;
    if (existing) return existing;
    const merchant: StoreMerchant = {
      _id: data._id || genId(),
      name: data.name || 'Merchant',
      phone: data.phone || '',
      shopName: data.shopName || 'My Shop',
      language: data.language || 'en',
      businessType: data.businessType || 'grocery',
      createdAt: new Date(),
    };
    this.merchants.push(merchant);
    return merchant;
  }

  updateMerchant(id: string, data: Partial<StoreMerchant>): StoreMerchant | undefined {
    const m = this.merchants.find((x) => x._id === id);
    if (!m) return undefined;
    Object.assign(m, data);
    return m;
  }

  // Customer
  findCustomers(merchantId: string, search?: string): StoreCustomer[] {
    let result = this.customers.filter((c) => c.merchantId === merchantId);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(s));
    }
    return result.sort((a, b) => b.balance - a.balance || b.createdAt.getTime() - a.createdAt.getTime());
  }

  findCustomerById(id: string): StoreCustomer | undefined {
    return this.customers.find((c) => c._id === id);
  }

  createCustomer(data: Partial<StoreCustomer> & { merchantId: string; name: string }): StoreCustomer {
    const customer: StoreCustomer = {
      _id: data._id || genId(),
      merchantId: data.merchantId,
      name: data.name,
      phone: data.phone || '',
      totalUdhar: 0,
      totalPaid: 0,
      balance: 0,
      createdAt: new Date(),
    };
    this.customers.push(customer);
    return customer;
  }

  updateCustomer(id: string, data: Partial<StoreCustomer>): StoreCustomer | undefined {
    const c = this.customers.find((x) => x._id === id);
    if (!c) return undefined;
    Object.assign(c, data);
    return c;
  }

  deleteCustomer(id: string): boolean {
    const idx = this.customers.findIndex((x) => x._id === id);
    if (idx === -1) return false;
    this.customers.splice(idx, 1);
    // Also remove all transactions for this customer
    this.transactions = this.transactions.filter((t) => t.customerId !== id);
    // Remove reminders for this customer
    this.reminders = this.reminders.filter((r) => r.customerId !== id);
    return true;
  }

  // Transaction
  findTransactions(merchantId: string, customerId?: string, limit = 50): StoreTransaction[] {
    let result = this.transactions.filter((t) => t.merchantId === merchantId);
    if (customerId) result = result.filter((t) => t.customerId === customerId);
    return result.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
  }

  createTransaction(data: {
    merchantId: string;
    customerId: string;
    type: 'udhar' | 'payment';
    amount: number;
    description?: string;
    items?: string[];
    date?: Date;
  }): StoreTransaction {
    const txn: StoreTransaction = {
      _id: genId(),
      merchantId: data.merchantId,
      customerId: data.customerId,
      type: data.type,
      amount: data.amount,
      description: data.description || '',
      items: data.items || [],
      date: data.date || new Date(),
      synced: true,
      createdAt: new Date(),
    };
    this.transactions.push(txn);

    // Update customer balance
    const customer = this.findCustomerById(data.customerId);
    if (customer) {
      if (data.type === 'udhar') {
        customer.totalUdhar += data.amount;
        customer.balance += data.amount;
      } else {
        customer.totalPaid += data.amount;
        customer.balance -= data.amount;
      }
    }

    return txn;
  }

  // Product
  findProducts(merchantId: string, category?: string, search?: string): StoreProduct[] {
    let result = this.products.filter((p) => p.merchantId === merchantId);
    if (category && category !== 'All') result = result.filter((p) => p.category === category);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(s));
    }
    return result.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  }

  findProductById(id: string): StoreProduct | undefined {
    return this.products.find((p) => p._id === id);
  }

  createProduct(data: Partial<StoreProduct> & { merchantId: string; name: string; price: number }): StoreProduct {
    const product: StoreProduct = {
      _id: data._id || genId(),
      merchantId: data.merchantId,
      name: data.name,
      category: data.category || 'General',
      price: data.price,
      stock: data.stock || 0,
      minStock: data.minStock || 5,
      unit: data.unit || 'pcs',
      lastRestocked: data.lastRestocked,
      createdAt: new Date(),
    };
    this.products.push(product);
    return product;
  }

  updateProduct(id: string, data: Partial<StoreProduct>): StoreProduct | undefined {
    const p = this.products.find((x) => x._id === id);
    if (!p) return undefined;
    if (data.stock !== undefined) {
      p.stock = data.stock;
      p.lastRestocked = new Date();
    }
    if (data.price !== undefined) p.price = data.price;
    if (data.name !== undefined) p.name = data.name;
    if (data.category !== undefined) p.category = data.category;
    if (data.minStock !== undefined) p.minStock = data.minStock;
    if (data.unit !== undefined) p.unit = data.unit;
    return p;
  }

  deleteProduct(id: string): boolean {
    const idx = this.products.findIndex((x) => x._id === id);
    if (idx === -1) return false;
    this.products.splice(idx, 1);
    return true;
  }

  // Reminder
  findReminders(merchantId: string): StoreReminder[] {
    return this.reminders
      .filter((r) => r.merchantId === merchantId)
      .map((r) => {
        const cust = this.findCustomerById(r.customerId);
        return { ...r, customerName: cust?.name || '' };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  createReminder(data: Partial<StoreReminder> & { merchantId: string; message: string }): StoreReminder {
    const reminder: StoreReminder = {
      _id: genId(),
      merchantId: data.merchantId,
      customerId: data.customerId || '',
      type: data.type || 'general',
      message: data.message,
      dueDate: data.dueDate || new Date(),
      sent: false,
      createdAt: new Date(),
    };
    this.reminders.push(reminder);
    return reminder;
  }

  // Dashboard aggregation
  getDashboardData(merchantId: string) {
    const customers = this.customers.filter((c) => c.merchantId === merchantId);
    const totalUdhar = customers.reduce((s, c) => s + c.balance, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPayments = this.transactions
      .filter((t) => t.merchantId === merchantId && t.type === 'payment' && t.date >= today)
      .reduce((s, t) => s + t.amount, 0);

    const dailySales = this.transactions
      .filter((t) => t.merchantId === merchantId && t.type === 'udhar' && t.date >= today)
      .reduce((s, t) => s + t.amount, 0);

    const lowStockCount = this.products.filter(
      (p) => p.merchantId === merchantId && p.stock <= p.minStock
    ).length;

    const recentTxns = this.findTransactions(merchantId, undefined, 10).map((t) => {
      const cust = this.findCustomerById(t.customerId);
      return { ...t, customerName: cust?.name || 'Unknown' };
    });

    // Weekly sales
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklySales = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const amount = this.transactions
        .filter(
          (t) =>
            t.merchantId === merchantId &&
            t.type === 'udhar' &&
            t.date >= dayStart &&
            t.date <= dayEnd
        )
        .reduce((s, t) => s + t.amount, 0);
      weeklySales.push({ day: dayNames[d.getDay()], amount });
    }

    return {
      totalUdhar,
      todayPayments,
      dailySales,
      lowStockCount,
      recentTransactions: recentTxns,
      weeklySales,
    };
  }

  // Reports aggregation
  getReportData(merchantId: string, range: string) {
    let startDate = new Date();
    if (range === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else startDate = new Date(0);

    const txns = this.transactions.filter(
      (t) => t.merchantId === merchantId && t.date >= startDate
    );
    const totalUdhar = txns.filter((t) => t.type === 'udhar').reduce((s, t) => s + t.amount, 0);
    const totalPayments = txns.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

    const lowStockItems = this.products.filter(
      (p) => p.merchantId === merchantId && p.stock <= p.minStock
    );

    // Top customers
    const customerTotals: Record<string, { amount: number; transactions: number }> = {};
    txns
      .filter((t) => t.type === 'udhar')
      .forEach((t) => {
        if (!customerTotals[t.customerId]) customerTotals[t.customerId] = { amount: 0, transactions: 0 };
        customerTotals[t.customerId].amount += t.amount;
        customerTotals[t.customerId].transactions++;
      });

    const topCustomers = Object.entries(customerTotals)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([cid, data]) => ({
        name: this.findCustomerById(cid)?.name || 'Unknown',
        amount: data.amount,
        transactions: data.transactions,
      }));

    // Sales by day
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysCount = range === 'week' ? 7 : 30;
    const salesByDay = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const amount = this.transactions
        .filter(
          (t) =>
            t.merchantId === merchantId && t.type === 'udhar' && t.date >= dayStart && t.date <= dayEnd
        )
        .reduce((s, t) => s + t.amount, 0);
      salesByDay.push({
        day: range === 'week' ? dayNames[d.getDay()] : d.getDate().toString(),
        amount,
      });
    }

    const pendingDues = this.customers
      .filter((c) => c.merchantId === merchantId && c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    return {
      totalSales: totalUdhar,
      totalUdhar,
      totalPayments,
      lowStockItems,
      topCustomers,
      salesByDay,
      pendingDues,
    };
  }

  // Seed demo data
  seedDemoData(merchantId: string) {
    if (this.seeded) return;
    this.seeded = true;

    // Clear
    this.customers = [];
    this.transactions = [];
    this.products = [];
    this.reminders = [];

    const customerNames = [
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

    const customers = customerNames.map((c) =>
      this.createCustomer({ merchantId, name: c.name, phone: c.phone })
    );

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
        this.createTransaction({
          merchantId,
          customerId: customer._id,
          type: isUdhar ? 'udhar' : 'payment',
          amount,
          description: isUdhar ? 'Saman udhar' : 'Payment received',
          items: isUdhar ? ['Atta', 'Dal', 'Cheeni'].slice(0, Math.floor(Math.random() * 3) + 1) : [],
          date,
        });
      }
    });

    const products = [
      { name: 'Atta (Wheat Flour)', category: 'Staples', price: 45, stock: 25, minStock: 10, unit: 'kg' },
      { name: 'Basmati Rice', category: 'Staples', price: 80, stock: 30, minStock: 10, unit: 'kg' },
      { name: 'Toor Dal', category: 'Pulses', price: 120, stock: 8, minStock: 10, unit: 'kg' },
      { name: 'Moong Dal', category: 'Pulses', price: 110, stock: 15, minStock: 8, unit: 'kg' },
      { name: 'Cheeni (Sugar)', category: 'Staples', price: 42, stock: 3, minStock: 10, unit: 'kg' },
      { name: 'Namak (Salt)', category: 'Staples', price: 20, stock: 50, minStock: 20, unit: 'kg' },
      { name: 'Sarson Tel (Mustard Oil)', category: 'Oils', price: 160, stock: 12, minStock: 5, unit: 'ltr' },
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
    products.forEach((p) => this.createProduct({ merchantId, ...p }));

    // Create reminders for high-balance customers
    this.customers
      .filter((c) => c.merchantId === merchantId && c.balance > 500)
      .slice(0, 5)
      .forEach((c) => {
        this.createReminder({
          merchantId,
          customerId: c._id,
          type: 'payment',
          message: `${c.name} has pending balance of ₹${c.balance}. Send payment reminder.`,
          dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        });
      });
  }
}

// Singleton persisted on globalThis to survive Next.js hot reloads
if (!global.__memStoreInstance) {
  global.__memStoreInstance = new MemoryStore();
}
export const memStore = global.__memStoreInstance;

// Helper to check if we should use memory store
export function setUseMemoryStore(val: boolean) {
  global.__useMemoryStore = val;
}

export function getUseMemoryStore(): boolean {
  return global.__useMemoryStore ?? false;
}
