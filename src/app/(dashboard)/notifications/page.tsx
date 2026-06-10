'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageCircle, Clock, AlertTriangle, IndianRupee } from 'lucide-react';
import { getRelativeTime } from '@/lib/utils';

interface Reminder {
  _id: string;
  type: 'payment' | 'restock' | 'general';
  message: string;
  dueDate: string;
  sent: boolean;
  customerName?: string;
}

export default function NotificationsPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = (reminder: Reminder) => {
    const msg = encodeURIComponent(reminder.message);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <IndianRupee size={16} className="text-red-500" />;
      case 'restock':
        return <AlertTriangle size={16} className="text-amber-500" />;
      default:
        return <Bell size={16} className="text-blue-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'restock':
        return 'bg-amber-50 dark:bg-amber-900/20';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {reminders.length} pending
        </span>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse h-20"
            />
          ))
        ) : reminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No notifications</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Reminders will appear here automatically
            </p>
          </div>
        ) : (
          reminders.map((reminder, i) => (
            <motion.div
              key={reminder._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getIconBg(reminder.type)}`}>
                  {getIcon(reminder.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{reminder.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getRelativeTime(reminder.dueDate)}
                    </span>
                    {reminder.customerName && (
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        {reminder.customerName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => sendWhatsAppReminder(reminder)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
                  title="Send WhatsApp reminder"
                >
                  <MessageCircle size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
