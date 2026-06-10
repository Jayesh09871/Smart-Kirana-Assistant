'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  name: string;
  phone: string;
}

export default function AddEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomer = searchParams.get('customerId') || '';
  const preSelectedType = searchParams.get('type') || 'udhar';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(preSelectedCustomer);
  const [type, setType] = useState<'udhar' | 'payment'>(preSelectedType as 'udhar' | 'payment');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch {
      // silent
    } finally {
      setFetchingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          type,
          amount: parseFloat(amount),
          description: description || (type === 'udhar' ? 'Udhar entry' : 'Payment received'),
        }),
      });
      if (res.ok) {
        toast.success(
          type === 'udhar' ? `₹${amount} udhar added!` : `₹${amount} payment recorded!`
        );
        router.back();
      } else {
        toast.error('Failed to add entry');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1 flex border border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setType('udhar')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              type === 'udhar'
                ? 'bg-red-500 text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Udhar (Credit)
          </button>
          <button
            type="button"
            onClick={() => setType('payment')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              type === 'payment'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Payment Received
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 space-y-4">
          {/* Customer Select */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
              Customer *
            </label>
            {fetchingCustomers ? (
              <div className="h-12 bg-gray-50 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
              Amount (₹) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white text-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
              min="1"
              autoFocus
            />
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2">
              {[100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  ₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Atta, Dal, Cheeni"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
            type === 'udhar'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Check size={18} />
              {type === 'udhar' ? 'Add Udhar Entry' : 'Record Payment'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
