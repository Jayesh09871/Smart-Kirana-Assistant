'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, syncOfflineQueue, setSyncStatus, getSyncStatus } from '@/lib/offline';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatusState] = useState('synced');
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    const handleSyncStatus = () => {
      setSyncStatusState(getSyncStatus());
      setQueueCount(getOfflineQueue().length);
    };

    setIsOnline(navigator.onLine);
    handleSyncStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status-changed', handleSyncStatus);

    // Periodic sync check
    const interval = setInterval(handleSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status-changed', handleSyncStatus);
      clearInterval(interval);
    };
  }, []);

  const sync = useCallback(async () => {
    await syncOfflineQueue();
    setSyncStatusState(getSyncStatus());
    setQueueCount(getOfflineQueue().length);
  }, []);

  return { isOnline, syncStatus, queueCount, sync };
}
