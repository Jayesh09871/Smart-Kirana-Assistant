'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  IndianRupee,
  Package,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ReportData {
  totalSales: number;
  totalUdhar: number;
  totalPayments: number;
  lowStockItems: Array<{ name: string; stock: number; minStock: number }>;
  topCustomers: Array<{ name: string; amount: number; transactions: number }>;
  salesByDay: Array<{ day: string; amount: number }>;
  pendingDues: Array<{ _id: string; name: string; balance: number }>;
}

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('week');

  useEffect(() => {
    fetchReports();
  }, [range]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Total Sales', value: formatCurrency(data?.totalSales || 0), icon: TrendingUp, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Udhar', value: formatCurrency(data?.totalUdhar || 0), icon: IndianRupee, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { label: 'Payments Received', value: formatCurrency(data?.totalPayments || 0), icon: Users, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
    { label: 'Low Stock Items', value: data?.lowStockItems?.length || 0, icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reports</h2>
        <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-0.5">
          {['week', 'month', 'all'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === r
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {r === 'all' ? 'All Time' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <Icon size={14} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Sales Chart */}
      {data?.salesByDay && data.salesByDay.some((d) => d.amount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sales Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesByDay}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Top Customers Pie */}
      {data?.topCustomers && data.topCustomers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Customers</h3>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.topCustomers} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                    {data.topCustomers.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {data.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{c.name}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Dues */}
      {data?.pendingDues && data.pendingDues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"
        >
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pending Dues</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {data.pendingDues.map((due) => (
              <div key={due._id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">{due.name}</span>
                <span className="text-sm font-bold text-red-500">{formatCurrency(due.balance)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Low Stock */}
      {data?.lowStockItems && data.lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"
        >
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Package size={14} />
              Low Stock Items
            </h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {data.lowStockItems.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-medium">{item.stock} left</span>
                  <span className="text-xs text-gray-400">(min: {item.minStock})</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
