export interface Merchant {
  _id?: string;
  name: string;
  phone: string;
  shopName: string;
  language: 'en' | 'hi';
  businessType: string;
  password?: string;
  createdAt?: Date;
}

export interface Customer {
  _id?: string;
  merchantId: string;
  name: string;
  phone?: string;
  totalUdhar: number;
  totalPaid: number;
  balance: number;
  createdAt?: Date;
}

export interface Transaction {
  _id?: string;
  merchantId: string;
  customerId: string;
  type: 'udhar' | 'payment';
  amount: number;
  description?: string;
  items?: string[];
  date: Date;
  synced: boolean;
  createdAt?: Date;
}

export interface Product {
  _id?: string;
  merchantId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  lastRestocked?: Date;
  createdAt?: Date;
}

export interface Reminder {
  _id?: string;
  merchantId: string;
  customerId: string;
  customerName?: string;
  type: 'payment' | 'restock' | 'general';
  message: string;
  dueDate: Date;
  sent: boolean;
  createdAt?: Date;
}

export interface DashboardData {
  totalUdhar: number;
  todayPayments: number;
  lowStockCount: number;
  dailySales: number;
  recentTransactions: (Transaction & { customerName?: string })[];
  weeklySales: { day: string; amount: number }[];
}

export interface ReportData {
  totalSales: number;
  totalUdhar: number;
  totalPayments: number;
  lowStockItems: Product[];
  topCustomers: { name: string; amount: number; transactions: number }[];
  salesByDay: { day: string; amount: number }[];
  pendingDues: (Customer & { lastTransaction?: Date })[];
}

export interface AIParsedEntry {
  customerName?: string;
  amount?: number;
  action: 'udhar' | 'payment';
  items?: string[];
  description?: string;
  confidence: number;
}

export interface AIParsedOrder {
  customerName: string;
  items: OrderItem[];
  notes?: string;
  confidence: number;
}

export interface StockPrediction {
  productName: string;
  currentStock: number;
  daysToFinish: number;
  dailyUsage: number;
  suggestion: string;
}

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
}

export interface Order {
  _id?: string;
  merchantId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  whatsappMessageId?: string;
  createdAt?: Date;
}

export interface WhatsAppMessage {
  _id?: string;
  merchantId: string;
  fromPhone: string;
  toPhone: string;
  messageBody: string;
  messageId: string;
  status: 'received' | 'processed' | 'reviewed' | 'failed';
  parsedOrder?: string;
  createdAt?: Date;
}

export interface WhatsAppDashboardData {
  totalWhatsAppOrders: number;
  ordersToday: number;
  whatsAppRevenue: number;
  mostOrderedProducts: { productName: string; count: number }[];
  lowStockProducts: Product[];
}

export type Theme = 'light' | 'dark';
