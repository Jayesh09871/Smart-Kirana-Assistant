'use client';

import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  ChevronRight,
  Download,
  Globe,
  Info,
  Loader2,
  LogOut,
  MessageSquare,
  Moon,
  Save,
  Store,
  Sun,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { merchant, updateMerchant, logout } = useAuth();
  const { t, setLang: setI18nLang } = useI18n();
  const [darkMode, setDarkMode] = useState(false);
  const [name, setName] = useState(merchant?.name || '');
  const [shopName, setShopName] = useState(merchant?.shopName || '');
  const [language, setLanguage] = useState<'en' | 'hi'>(merchant?.language || 'en');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(merchant?.whatsappPhoneNumber || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLanguage(merchant?.language || 'en');
  }, [merchant?.language]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kirana_theme', newMode ? 'dark' : 'light');
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, shopName, language, whatsappPhoneNumber }),
      });
      if (res.ok) {
        updateMerchant({ name, shopName, language: language as 'en' | 'hi', whatsappPhoneNumber });
        setI18nLang(language as 'en' | 'hi');
        toast.success('Profile updated!');
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { icon: BarChart3, label: t('settings.reports'), action: () => router.push('/reports') },
    { icon: Bell, label: t('settings.notifications'), action: () => router.push('/notifications') },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 space-y-4"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-700">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <Store size={22} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {merchant?.shopName || 'My Shop'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {merchant?.phone || ''}
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
            <User size={11} className="inline mr-1" />
            {t('settings.yourName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
            <Store size={11} className="inline mr-1" />
            {t('settings.shopName')}
          </label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
            <MessageSquare size={11} className="inline mr-1" />
            WhatsApp Phone Number (with country code, e.g., 916377362324)
          </label>
          <input
            type="text"
            value={whatsappPhoneNumber}
            onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
            placeholder="916377362324"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
            <Globe size={11} className="inline mr-1" />
            {t('settings.language')}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
          </select>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t('settings.saveChanges')}
        </button>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
      >
        <button
          onClick={toggleDarkMode}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon size={18} className="text-indigo-500" />
            ) : (
              <Sun size={18} className="text-amber-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {darkMode ? t('settings.darkMode') : t('settings.lightMode')}
            </span>
          </div>
          <div
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
              darkMode ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700"
      >
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        ))}

        <button
          onClick={() => {
            const data = { exportedAt: new Date().toISOString(), merchant: merchant?.shopName };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kirana-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            toast.success('Data exported!');
          }}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Download size={18} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.exportData')}</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.about')}</span>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Smart Kirana Assistant</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Version 1.0.0 | AI-powered shop management
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Built for local merchants with love
        </p>
      </motion.div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <LogOut size={18} />
        {t('settings.logout')}
      </button>
    </div>
  );
}
