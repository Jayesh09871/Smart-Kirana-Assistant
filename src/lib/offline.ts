const OFFLINE_QUEUE_KEY = 'kirana_offline_queue';
const SYNC_STATUS_KEY = 'kirana_sync_status';

export interface OfflineEntry {
  id: string;
  type: 'transaction' | 'customer' | 'product';
  action: 'create' | 'update';
  data: Record<string, unknown>;
  timestamp: number;
}

export function addToOfflineQueue(entry: OfflineEntry): void {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  queue.push(entry);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): OfflineEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

export function setSyncStatus(status: 'synced' | 'syncing' | 'pending' | 'offline'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_STATUS_KEY, status);
  window.dispatchEvent(new Event('sync-status-changed'));
}

export function getSyncStatus(): string {
  if (typeof window === 'undefined') return 'synced';
  return localStorage.getItem(SYNC_STATUS_KEY) || 'synced';
}

export async function syncOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  setSyncStatus('syncing');

  for (const entry of queue) {
    try {
      const endpoint = getEndpoint(entry.type, entry.action);
      await fetch(endpoint, {
        method: entry.action === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry.data, offlineId: entry.id }),
      });
    } catch {
      setSyncStatus('pending');
      return;
    }
  }

  clearOfflineQueue();
  setSyncStatus('synced');
}

function getEndpoint(type: string, _action: string): string {
  switch (type) {
    case 'transaction':
      return '/api/transactions';
    case 'customer':
      return '/api/customers';
    case 'product':
      return '/api/products';
    default:
      return '/api/transactions';
  }
}
