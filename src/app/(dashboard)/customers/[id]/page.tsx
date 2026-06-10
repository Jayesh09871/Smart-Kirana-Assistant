'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  MessageCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  balance: number;
  totalUdhar: number;
  totalPaid: number;
}

interface Transaction {
  _id: string;
  type: 'udhar' | 'payment';
  amount: number;
  description: string;
  date: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setTransactions(data.transactions);
      } else {
        // Customer not found (stale ID) — go back to list
        toast.error('Customer not found, refreshing list...');
        router.push('/customers');
      }
    } catch {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = () => {
    if (!customer?.phone) {
      toast.error('No phone number for this customer');
      return;
    }
    const msg = encodeURIComponent(
      `Namaste ${customer.name},\n\nAapka ${customer.balance > 0 ? `₹${customer.balance} ka pending udhar` : 'account settled'} hai Kumar Kirana Store pe.\n\nDhanyavaad!`
    );
    window.open(`https://wa.me/91${customer.phone}?text=${msg}`, '_blank');
  };

  const deleteCustomer = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Customer deleted');
        router.push('/customers');
      } else {
        toast.error('Failed to delete customer');
      }
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-center text-gray-500 py-12">Customer not found</p>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Details</h2>
      </div>

      {/* Customer Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary-700 dark:text-primary-400">
              {getInitials(customer.name)}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{customer.name}</h3>
            {customer.phone && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Phone size={12} />
                {customer.phone}
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
            <p className="text-xs text-red-500 dark:text-red-400 mb-1">Total Udhar</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-300">
              {formatCurrency(customer.totalUdhar)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
            <p className="text-xs text-green-500 dark:text-green-400 mb-1">Total Paid</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-300">
              {formatCurrency(customer.totalPaid)}
            </p>
          </div>
          <div
            className={`rounded-xl p-3 text-center ${
              customer.balance > 0
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : 'bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <p
              className={`text-xs mb-1 ${
                customer.balance > 0
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-blue-500 dark:text-blue-400'
              }`}
            >
              Balance
            </p>
            <p
              className={`text-sm font-bold ${
                customer.balance > 0
                  ? 'text-amber-600 dark:text-amber-300'
                  : 'text-blue-600 dark:text-blue-300'
              }`}
            >
              {formatCurrency(Math.abs(customer.balance))}
              {customer.balance > 0 ? ' due' : customer.balance < 0 ? ' advance' : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/entry/add?customerId=${customer._id}&type=udhar`)}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            Add Udhar
          </button>
          <button
            onClick={() => router.push(`/entry/add?customerId=${customer._id}&type=payment`)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            Record Payment
          </button>
          <button
            onClick={sendWhatsAppReminder}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-colors"
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 p-2.5 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              Delete <strong>{customer.name}</strong> and all their transactions? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteCustomer}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction Ledger */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Transaction History
        </h3>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            transactions.map((txn, i) => (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-slate-700"
              >
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
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {txn.description || (txn.type === 'udhar' ? 'Udhar' : 'Payment')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(txn.date)}</p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    txn.type === 'udhar' ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {txn.type === 'udhar' ? '+' : '-'}
                  {formatCurrency(txn.amount)}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
