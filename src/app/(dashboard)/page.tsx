'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  Plus,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, getGreeting, getRelativeTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import toast from 'react-hot-toast';

interface DashboardData {
  totalUdhar: number;
  todayPayments: number;
  lowStockCount: number;
  dailySales: number;
  weeklySales: { day: string; amount: number }[];
  recentTransactions: Array<{
    _id: string;
    customerName: string;
    type: string;
    amount: number;
    date: string;
    description: string;
  }>;
}

export default function DashboardPage() {
  const { merchant } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: t('dashboard.totalUdhar'),
      value: formatCurrency(data?.totalUdhar || 0),
      icon: IndianRupee,
      color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
    },
    {
      label: t('dashboard.todayPayments'),
      value: formatCurrency(data?.todayPayments || 0),
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
    },
    {
      label: t('dashboard.lowStock'),
      value: data?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      label: t('dashboard.dailySales'),
      value: formatCurrency(data?.dailySales || 0),
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {merchant?.name?.split(' ')[0] || 'Shopkeeper'}!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.title')}
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <button
          onClick={() => router.push('/entry/add')}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-colors shadow-lg shadow-primary-500/20"
        >
          <Plus size={22} />
          <span className="text-xs font-medium">{t('dashboard.addEntry')}</span>
        </button>
        <button
          onClick={() => router.push('/customers/add')}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <UserPlus size={22} className="text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('dashboard.addCustomer')}</span>
        </button>
        <button
          onClick={() => router.push('/entry/add?type=payment')}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <CreditCard size={22} className="text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment</span>
        </button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.iconBg}`}>
                  <Icon size={14} className={stat.color.split(' ')[1]} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Weekly Sales Chart */}
      {data?.weeklySales && data.weeklySales.some((d) => d.amount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('dashboard.weeklySales')}
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklySales}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ fill: '#16a34a', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"
      >
        <div className="p-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('dashboard.recentActivity')}
          </h3>
          <button
            onClick={() => router.push('/customers')}
            className="text-xs text-primary-600 dark:text-primary-400 font-medium"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {data?.recentTransactions?.slice(0, 5).map((txn) => (
            <div key={txn._id} className="px-4 py-3 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  txn.type === 'udhar'
                    ? 'bg-red-50 dark:bg-red-900/30'
                    : 'bg-green-50 dark:bg-green-900/30'
                }`}
              >
                {txn.type === 'udhar' ? (
                  <ArrowUpRight size={16} className="text-red-500" />
                ) : (
                  <ArrowDownLeft size={16} className="text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {txn.customerName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getRelativeTime(txn.date)}
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  txn.type === 'udhar' ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {txn.type === 'udhar' ? '+' : '-'}
                {formatCurrency(txn.amount)}
              </p>
            </div>
          ))}
          {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">Start by adding a customer or entry</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
