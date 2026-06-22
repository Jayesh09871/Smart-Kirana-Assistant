'use client';

import { useI18n } from '@/context/I18nContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Edit2,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  X,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface OrderItem {
  _id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
}

interface Customer {
  _id: string;
  name: string;
  phone?: string;
}

interface Order {
  _id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  customer?: Customer;
}

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPayload, setDebugPayload] = useState('');
  const [sendingDebug, setSendingDebug] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'pending') params.set('status', 'pending');
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrder = async (orderId: string, status: 'confirmed' | 'cancelled', items?: OrderItem[], customerName?: string, notes?: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, items, customerName, notes }),
      });
      if (res.ok) {
        toast.success(status === 'confirmed' ? 'Order confirmed!' : 'Order cancelled');
        setEditingOrder(null);
        await fetchOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update order');
      }
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    if (!editingOrder) return;
    const newItems = [...editingOrder.items];
    if (field === 'quantity') {
      (newItems[index][field] as number) = Number(value);
    } else {
      (newItems[index][field] as string) = value as string;
    }
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!editingOrder) return;
    const newItems = editingOrder.items.filter((_, i) => i !== index);
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const addItem = () => {
    if (!editingOrder) return;
    const newItems = [...editingOrder.items, { productName: '', quantity: 1, unit: 'pcs' }];
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const sendDebugPayload = async () => {
    if (!debugPayload.trim()) return;
    setSendingDebug(true);
    try {
      let payload;
      try {
        payload = JSON.parse(debugPayload);
      } catch {
        toast.error('Invalid JSON');
        return;
      }
      const res = await fetch('/api/whatsapp/test-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('Debug payload response:', data);
      if (res.ok && data.success) {
        toast.success('Payload processed!');
        await fetchOrders();
      } else {
        toast.error(data.error || 'Failed to process payload');
      }
    } catch (err) {
      console.error('Failed to send debug payload:', err);
      toast.error('Failed to send debug payload');
    } finally {
      setSendingDebug(false);
    }
  };

  const checkUnprocessed = async () => {
    try {
      const res = await fetch('/api/whatsapp/unprocessed');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(`Failed to check: ${err.error}`);
        return;
      }
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        let processed = 0;
        let failed = 0;
        for (const msg of data.messages) {
          try {
            const postRes = await fetch('/api/whatsapp/unprocessed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId: msg.messageId })
            });
            if (postRes.ok) {
              processed++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
        }
        if (failed > 0) {
          toast.error(`Processed ${processed}, failed ${failed}`);
        } else {
          toast.success(`Processed ${processed} messages!`);
        }
        await fetchOrders();
      } else {
        toast.success('No unprocessed messages');
      }
    } catch (err) {
      console.error('Error checking unprocessed:', err);
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp Orders</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review and confirm orders from customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkUnprocessed}
            className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            Check Messages
          </button>
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300"
          >
            {debugMode ? 'Hide Debug' : 'Debug'}
          </button>
        </div>
      </div>

      {debugMode && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Test Meta Payload</h3>
          <textarea
            value={debugPayload}
            onChange={(e) => setDebugPayload(e.target.value)}
            placeholder='Paste your Meta webhook payload here...'
            rows={8}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono"
          />
          <button
            onClick={sendDebugPayload}
            disabled={sendingDebug || !debugPayload.trim()}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium py-2 rounded-xl disabled:opacity-50"
          >
            {sendingDebug ? 'Processing...' : 'Process Payload'}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
          }`}
        >
          All Orders
        </button>
      </div>

      {/* Order List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Orders from WhatsApp will appear here</p>
          </div>
        ) : (
          orders.map((order, i) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Order Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                      <Phone size={18} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{order.customerPhone}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === 'pending'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : order.status === 'confirmed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 dark:text-gray-300">{item.productName}</span>
                        <span className="text-gray-400 dark:text-gray-500">x{item.quantity}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                    {order.notes}
                  </p>
                )}

                {/* Actions */}
                {order.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <button
                      onClick={() => setEditingOrder(order)}
                      className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => updateOrder(order._id, 'cancelled')}
                      disabled={updatingId === order._id}
                      className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {updatingId === order._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    </button>
                    <button
                      onClick={() => updateOrder(order._id, 'confirmed', order.items, order.customerName, order.notes)}
                      disabled={updatingId === order._id}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {updatingId === order._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setEditingOrder(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Order</h3>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Customer Name</label>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Items</label>
                    <button
                      onClick={addItem}
                      className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>
                  {editingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                        placeholder="Product"
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-center"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="w-16 px-2 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        {['pcs', 'kg', 'ltr', 'g', 'ml', 'pack'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editingOrder.notes || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingOrder(null)}
                    className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateOrder(editingOrder._id, 'confirmed', editingOrder.items, editingOrder.customerName, editingOrder.notes)}
                    disabled={updatingId === editingOrder._id}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {updatingId === editingOrder._id ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Save & Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
