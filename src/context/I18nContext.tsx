'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Lang = 'en' | 'hi';

const translations: Record<string, Record<Lang, string>> = {
  // Navigation
  'nav.dashboard': { en: 'Home', hi: 'होम' },
  'nav.customers': { en: 'Customers', hi: 'ग्राहक' },
  'nav.orders': { en: 'Orders', hi: 'ऑर्डर' },
  'nav.inventory': { en: 'Inventory', hi: 'इन्वेंटरी' },
  'nav.ai': { en: 'AI', hi: 'AI' },
  'nav.settings': { en: 'Settings', hi: 'सेटिंग्स' },

  // Dashboard
  'dashboard.title': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'dashboard.totalUdhar': { en: 'Total Udhar', hi: 'कुल उधार' },
  'dashboard.todayPayments': { en: 'Today Payments', hi: 'आज भुगतान' },
  'dashboard.dailySales': { en: 'Daily Sales', hi: 'दैनिक बिक्री' },
  'dashboard.lowStock': { en: 'Low Stock', hi: 'कम स्टॉक' },
  'dashboard.weeklySales': { en: 'Weekly Sales', hi: 'साप्ताहिक बिक्री' },
  'dashboard.recentActivity': { en: 'Recent Activity', hi: 'हाल की गतिविधि' },
  'dashboard.quickActions': { en: 'Quick Actions', hi: 'त्वरित कार्य' },
  'dashboard.addEntry': { en: 'Add Entry', hi: 'एंट्री जोड़ें' },
  'dashboard.addCustomer': { en: 'Add Customer', hi: 'ग्राहक जोड़ें' },
  'dashboard.addProduct': { en: 'Add Product', hi: 'प्रोडक्ट जोड़ें' },
  'dashboard.viewAll': { en: 'View All', hi: 'सभी देखें' },
  'dashboard.noActivity': { en: 'No recent activity', hi: 'कोई हाल की गतिविधि नहीं' },

  // Customers
  'customers.title': { en: 'Customers', hi: 'ग्राहक' },
  'customers.add': { en: 'Add', hi: 'जोड़ें' },
  'customers.search': { en: 'Search customers...', hi: 'ग्राहक खोजें...' },
  'customers.noCustomers': { en: 'No customers found', hi: 'कोई ग्राहक नहीं मिला' },
  'customers.addTitle': { en: 'Add Customer', hi: 'ग्राहक जोड़ें' },
  'customers.name': { en: 'Customer Name *', hi: 'ग्राहक का नाम *' },
  'customers.phone': { en: 'Phone Number', hi: 'फ़ोन नंबर' },
  'customers.addBtn': { en: 'Add Customer', hi: 'ग्राहक जोड़ें' },
  'customers.balance': { en: 'Balance', hi: 'शेष' },
  'customers.totalUdhar': { en: 'Total Udhar', hi: 'कुल उधार' },
  'customers.totalPaid': { en: 'Total Paid', hi: 'कुल भुगतान' },
  'customers.ledger': { en: 'Ledger', hi: 'बही खाता' },
  'customers.noTransactions': { en: 'No transactions yet', hi: 'अभी तक कोई लेनदेन नहीं' },
  'customers.sendReminder': { en: 'Send Reminder', hi: 'रिमाइंडर भेजें' },

  // Inventory
  'inventory.title': { en: 'Inventory', hi: 'इन्वेंटरी' },
  'inventory.add': { en: 'Add', hi: 'जोड़ें' },
  'inventory.search': { en: 'Search products...', hi: 'प्रोडक्ट खोजें...' },
  'inventory.noProducts': { en: 'No products found', hi: 'कोई प्रोडक्ट नहीं मिला' },
  'inventory.lowStock': { en: 'items low on stock', hi: 'आइटम कम स्टॉक में' },
  'inventory.addProduct': { en: 'Add Product', hi: 'प्रोडक्ट जोड़ें' },
  'inventory.lowStockAlert': { en: 'Low stock! Min:', hi: 'कम स्टॉक! न्यूनतम:' },

  // AI Assistant
  'ai.title': { en: 'AI Assistant', hi: 'AI सहायक' },
  'ai.whatsapp': { en: 'WhatsApp', hi: 'WhatsApp' },
  'ai.voice': { en: 'Voice', hi: 'आवाज़' },
  'ai.predictions': { en: 'Predictions', hi: 'पूर्वानुमान' },
  'ai.pasteMessage': { en: 'Paste a WhatsApp message or type in Hinglish', hi: 'WhatsApp मैसेज पेस्ट करें या हिंगलिश में टाइप करें' },
  'ai.inputPlaceholder': { en: 'Paste WhatsApp message or type...', hi: 'WhatsApp मैसेज पेस्ट करें या टाइप करें...' },
  'ai.voiceInstruction': { en: 'Tap the mic and speak in Hindi, Hinglish, or English', hi: 'माइक टैप करें और हिंदी, हिंगलिश या अंग्रेजी में बोलें' },
  'ai.listening': { en: 'Listening... Tap to stop', hi: 'सुन रहा है... रोकने के लिए टैप करें' },
  'ai.tapToSpeak': { en: 'Tap to start speaking', hi: 'बोलना शुरू करने के लिए टैप करें' },
  'ai.noPredictions': { en: 'No predictions available yet', hi: 'अभी तक कोई पूर्वानुमान नहीं' },
  'ai.analyzeNow': { en: 'Analyze Now', hi: 'अभी विश्लेषण करें' },
  'ai.analyzing': { en: 'Analyzing stock patterns...', hi: 'स्टॉक पैटर्न का विश्लेषण...' },
  'ai.confirmEntry': { en: 'Confirm Entry', hi: 'एंट्री कन्फर्म करें' },
  'ai.confirm': { en: 'Confirm', hi: 'कन्फर्म' },
  'ai.entrySaved': { en: 'Entry saved', hi: 'एंट्री सेव हो गई' },
  'ai.restock': { en: 'Restock', hi: 'रिस्टॉक' },

  // Entry
  'entry.addTitle': { en: 'Add Entry', hi: 'एंट्री जोड़ें' },
  'entry.selectCustomer': { en: 'Select Customer', hi: 'ग्राहक चुनें' },
  'entry.udhar': { en: 'Udhar (Credit)', hi: 'उधार' },
  'entry.payment': { en: 'Payment', hi: 'भुगतान' },
  'entry.amount': { en: 'Amount (₹)', hi: 'राशि (₹)' },
  'entry.description': { en: 'Description', hi: 'विवरण' },
  'entry.save': { en: 'Save Entry', hi: 'एंट्री सेव करें' },

  // Reports
  'reports.title': { en: 'Reports', hi: 'रिपोर्ट' },
  'reports.week': { en: 'Week', hi: 'सप्ताह' },
  'reports.month': { en: 'Month', hi: 'महीना' },
  'reports.all': { en: 'All', hi: 'सभी' },
  'reports.totalSales': { en: 'Total Sales', hi: 'कुल बिक्री' },
  'reports.totalUdhar': { en: 'Total Udhar', hi: 'कुल उधार' },
  'reports.totalPayments': { en: 'Total Payments', hi: 'कुल भुगतान' },
  'reports.topCustomers': { en: 'Top Customers', hi: 'शीर्ष ग्राहक' },
  'reports.pendingDues': { en: 'Pending Dues', hi: 'बकाया राशि' },
  'reports.salesChart': { en: 'Sales Chart', hi: 'बिक्री चार्ट' },
  'reports.lowStockItems': { en: 'Low Stock Items', hi: 'कम स्टॉक आइटम' },

  // Notifications
  'notifications.title': { en: 'Notifications', hi: 'सूचनाएं' },
  'notifications.noNotifications': { en: 'No notifications', hi: 'कोई सूचना नहीं' },

  // Settings
  'settings.title': { en: 'Settings', hi: 'सेटिंग्स' },
  'settings.yourName': { en: 'Your Name', hi: 'आपका नाम' },
  'settings.shopName': { en: 'Shop Name', hi: 'दुकान का नाम' },
  'settings.language': { en: 'Language', hi: 'भाषा' },
  'settings.saveChanges': { en: 'Save Changes', hi: 'बदलाव सेव करें' },
  'settings.darkMode': { en: 'Dark Mode', hi: 'डार्क मोड' },
  'settings.lightMode': { en: 'Light Mode', hi: 'लाइट मोड' },
  'settings.reports': { en: 'Reports', hi: 'रिपोर्ट' },
  'settings.notifications': { en: 'Notifications', hi: 'सूचनाएं' },
  'settings.exportData': { en: 'Export Data', hi: 'डेटा एक्सपोर्ट करें' },
  'settings.logout': { en: 'Logout', hi: 'लॉगआउट' },
  'settings.about': { en: 'About', hi: 'के बारे में' },

  // Login
  'login.title': { en: 'Smart Kirana', hi: 'स्मार्ट किराना' },
  'login.subtitle': { en: 'Your AI Shop Assistant', hi: 'आपका AI दुकान सहायक' },
  'login.phone': { en: 'Phone Number', hi: 'फ़ोन नंबर' },
  'login.otp': { en: 'OTP', hi: 'OTP' },
  'login.sendOtp': { en: 'Send OTP', hi: 'OTP भेजें' },
  'login.verify': { en: 'Verify & Login', hi: 'सत्यापित करें और लॉगिन करें' },
  'login.demo': { en: 'Try Demo', hi: 'डेमो आज़माएं' },
  'login.name': { en: 'Your Name (optional)', hi: 'आपका नाम (वैकल्पिक)' },
  'login.shopName': { en: 'Shop Name (optional)', hi: 'दुकान का नाम (वैकल्पिक)' },

  // Common
  'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
  'common.save': { en: 'Save', hi: 'सेव' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'common.delete': { en: 'Delete', hi: 'हटाएं' },
  'common.edit': { en: 'Edit', hi: 'संपादित करें' },
  'common.back': { en: 'Back', hi: 'वापस' },
  'common.error': { en: 'Something went wrong', hi: 'कुछ गलत हो गया' },
  'common.success': { en: 'Success!', hi: 'सफल!' },
  'common.rupees': { en: '₹', hi: '₹' },
};

interface I18nContextType {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: (key: string) => key,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const { merchant, updateMerchant } = useAuth();
  const lang: Lang = (merchant?.language as Lang) || 'en';

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  };

  const setLang = (newLang: Lang) => {
    updateMerchant({ language: newLang });
  };

  const value = useMemo(() => ({ lang, t, setLang }), [lang, merchant]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
