'use client';

import { formatCurrency, getInitials } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CheckCircle, IndianRupee, Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  balance: number;
  totalUdhar: number;
  totalPaid: number;
}

export default function CustomerRemindersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingCustomerId, setSendingCustomerId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers');
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
    fetchCustomers();
  }, [fetchCustomers]);

  const getMessageTemplate = (customer: Customer) => {
    if (customer.balance > 0) {
      return `Namaste ${customer.name},

Aapko ${formatCurrency(customer.balance)} ka pending udhar hai Kirana Store par. Kripya jaldi se payment kar den.

Dhanyavaad!`;
    } else if (customer.balance < 0) {
      return `Namaste ${customer.name},

Aapka account settled ho gaya hai! Aapke paas ${formatCurrency(Math.abs(customer.balance))} ka advance balance hai.

Dhanyavaad!`;
    } else {
      return `Namaste ${customer.name},

Aapka account completely settled hai. Koi pending payment nahi hai.

Dhanyavaad!`;
    }
  };

  const sendWhatsAppMessage = async (customer: Customer) => {
    if (!customer.phone) {
      toast.error('No phone number for this customer');
      return;
    }
    setSendingCustomerId(customer._id);
    const msg = encodeURIComponent(getMessageTemplate(customer));
    const phoneWithCountry = customer.phone.startsWith('91') ? customer.phone : `91${customer.phone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${msg}`, '_blank');
    setSendingCustomerId(null);
  };

  const customersWithUdhar = customers.filter(c => c.balance > 0);
  const customersSettled = customers.filter(c => c.balance <= 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Reminders</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Send WhatsApp messages to customers</p>
      </div>

      {/* Udhaar Customers Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <IndianRupee size={16} className="text-red-500" />
          Customers with Pending Udhar ({customersWithUdhar.length})
        </h3>
        <div className="space-y-2">
          {customersWithUdhar.map((customer, i) => (
            <motion.div
              key={customer._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-slate-700">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {getInitials(customer.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {customer.phone}
                  </p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-sm font-bold text-red-500">
                    {formatCurrency(customer.balance)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">pending</p>
                </div>
                <button
                  onClick={() => sendWhatsAppMessage(customer)}
                  disabled={sendingCustomerId === customer._id}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {sendingCustomerId === customer._id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </motion.div>
          ))}
          {customersWithUdhar.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No pending udhar customers</p>
            </div>
          )}
        </div>
      </div>

      {/* Settled Customers Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-500" />
          Settled Customers ({customersSettled.length})
        </h3>
        <div className="space-y-2">
          {customersSettled.map((customer, i) => (
            <motion.div
              key={customer._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 + (customersWithUdhar.length * 0.03) }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-slate-700">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {getInitials(customer.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {customer.phone}
                  </p>
                </div>
                <div className="text-right mr-2">
                  <p className={`text-sm font-bold ${customer.balance < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                    {customer.balance < 0 ? `+${formatCurrency(Math.abs(customer.balance))}` : '₹0'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {customer.balance < 0 ? 'advance' : 'settled'}
                  </p>
                </div>
                <button
                  onClick={() => sendWhatsAppMessage(customer)}
                  disabled={sendingCustomerId === customer._id}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {sendingCustomerId === customer._id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </motion.div>
          ))}
          {customersSettled.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No settled customers</p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
