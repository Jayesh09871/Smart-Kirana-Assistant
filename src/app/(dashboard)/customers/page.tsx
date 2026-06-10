'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Plus, UserCircle } from 'lucide-react';
import { formatCurrency, getInitials } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  balance: number;
  totalUdhar: number;
  totalPaid: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async (searchQuery?: string) => {
    try {
      const res = await fetch(`/api/customers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      } else {
        toast.error('Failed to load customers');
      }
    } catch {
      toast.error('Network error loading customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(search);
  }, [fetchCustomers, search]);

  // Refetch when page becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCustomers(search);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchCustomers, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchCustomers(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('customers.title')}</h2>
        <button
          onClick={() => router.push('/customers/add')}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('customers.add')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('customers.search')}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('customers.noCustomers')}</p>
            <button
              onClick={() => router.push('/customers/add')}
              className="mt-3 text-primary-600 dark:text-primary-400 text-sm font-medium"
            >
              Add your first customer
            </button>
          </div>
        ) : (
          customers.map((customer, i) => (
            <motion.div
              key={customer._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => router.push(`/customers/${customer._id}`)}
                className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                    {getInitials(customer.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {customer.phone || 'No phone'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      customer.balance > 0
                        ? 'text-red-500'
                        : customer.balance < 0
                        ? 'text-green-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {customer.balance > 0 ? formatCurrency(customer.balance) : customer.balance < 0 ? `+${formatCurrency(Math.abs(customer.balance))}` : '₹0'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {customer.balance > 0 ? 'pending' : customer.balance < 0 ? 'advance' : 'settled'}
                  </p>
                </div>
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
