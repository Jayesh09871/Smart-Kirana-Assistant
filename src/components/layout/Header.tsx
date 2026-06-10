'use client';

import { useAuth } from '@/context/AuthContext';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const { merchant } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 safe-top">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {merchant?.shopName || 'Smart Kirana'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {merchant?.name || 'Welcome'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi size={14} className="text-primary-500" />
            ) : (
              <WifiOff size={14} className="text-red-500" />
            )}
          </div>
          <button
            onClick={() => router.push('/notifications')}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
