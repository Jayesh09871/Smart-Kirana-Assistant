'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface Merchant {
  id: string;
  name: string;
  phone: string;
  shopName: string;
  language: 'en' | 'hi';
  whatsappPhoneNumber?: string;
}

interface AuthContextType {
  merchant: Merchant | null;
  isLoading: boolean;
  login: (phone: string, otp: string, name?: string, shopName?: string) => Promise<boolean>;
  logout: () => void;
  updateMerchant: (data: Partial<Merchant>) => void;
}

const AuthContext = createContext<AuthContextType>({
  merchant: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  updateMerchant: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have stored merchant info
    const stored = localStorage.getItem('kirana_merchant');
    if (stored) {
      try {
        setMerchant(JSON.parse(stored));
      } catch {
        localStorage.removeItem('kirana_merchant');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (phone: string, otp: string, name?: string, shopName?: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp, name, shopName }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        const merchantData = data.merchant;
        setMerchant(merchantData);
        localStorage.setItem('kirana_merchant', JSON.stringify(merchantData));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    setMerchant(null);
    localStorage.removeItem('kirana_merchant');
    document.cookie = 'kirana_token=; path=/; max-age=0';
  }, []);

  const updateMerchant = useCallback((data: Partial<Merchant>) => {
    setMerchant((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem('kirana_merchant', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ merchant, isLoading, login, logout, updateMerchant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
