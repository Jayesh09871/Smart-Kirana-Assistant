'use client';

import { useI18n } from '@/context/I18nContext';
import { MessageSquare, MoreHorizontal, Package, Sparkles, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/inventory', labelKey: 'nav.inventory', icon: Package },
  { href: '/customers', labelKey: 'nav.customers', icon: Users },
  { href: '/orders', labelKey: 'nav.orders', icon: MessageSquare },
  { href: '/ai-assistant', labelKey: 'nav.ai', icon: Sparkles },
  { href: '/settings', labelKey: 'nav.settings', icon: MoreHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 safe-bottom z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
