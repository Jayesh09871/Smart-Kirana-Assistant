'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Package,
  Minus,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
}

const categories = ['All', 'Staples', 'Pulses', 'Oils', 'Spices', 'Dairy', 'Beverages', 'Snacks', 'Household'];

export default function InventoryPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add product form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newUnit, setNewUnit] = useState('pcs');
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        toast.error('Failed to load products');
      }
    } catch {
      toast.error('Network error loading products');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      if (res.ok) {
        // Refetch to get fresh data from DB
        await fetchProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update stock');
        await fetchProducts();
      }
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) {
      toast.error('Name and price are required');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          price: parseFloat(newPrice),
          stock: parseInt(newStock) || 0,
          minStock: parseInt(newMinStock) || 5,
          unit: newUnit,
        }),
      });
      if (res.ok) {
        toast.success('Product added!');
        setShowAddModal(false);
        setNewName('');
        setNewPrice('');
        setNewStock('');
        setNewMinStock('5');
        setNewCategory('General');
        setNewUnit('pcs');
        await fetchProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to add product');
      }
    } catch {
      toast.error('Failed to add product');
    } finally {
      setAddLoading(false);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Product deleted');
        await fetchProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete product');
      }
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const getStockColor = (product: Product) => {
    if (product.stock <= product.minStock * 0.5) return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
    if (product.stock <= product.minStock) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('inventory.title')}</h2>
          {lowStockCount > 0 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle size={12} />
              {lowStockCount} {t('inventory.lowStock')}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('inventory.add')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setTimeout(fetchProducts, 300);
          }}
          placeholder={t('inventory.search')}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('inventory.noProducts')}</p>
          </div>
        ) : (
          products.map((product, i) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Package size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(product.price)}/{product.unit}
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{product.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget({ id: product._id, name: product.name })}
                  disabled={deletingId === product._id}
                  className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-30"
                >
                  {deletingId === product._id ? (
                    <Loader2 size={14} className="text-red-500 animate-spin" />
                  ) : (
                    <Trash2 size={14} className="text-red-500" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStock(product._id, product.stock - 1)}
                    disabled={updatingId === product._id || product.stock <= 0}
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30"
                  >
                    <Minus size={14} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold min-w-[40px] text-center ${getStockColor(product)}`}
                  >
                    {updatingId === product._id ? '...' : product.stock}
                  </span>
                  <button
                    onClick={() => updateStock(product._id, product.stock + 1)}
                    disabled={updatingId === product._id}
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30"
                  >
                    <Plus size={14} className="text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
              {product.stock <= product.minStock && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                  <AlertTriangle size={11} />
                  {t('inventory.lowStockAlert')} {product.minStock} {product.unit}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('inventory.addProduct')}</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={addProduct} className="space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Product name *"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Price (₹) *"
                    className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="Stock"
                    className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="px-3 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    placeholder="Min Stock"
                    className="px-3 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="px-3 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    {['pcs', 'kg', 'ltr', 'g', 'ml', 'pack'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {addLoading ? <Loader2 size={20} className="animate-spin" /> : t('inventory.addProduct')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !deletingId && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
            >
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Product?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Are you sure you want to delete <strong className="text-gray-700 dark:text-gray-200">{deleteTarget.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deletingId}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteProduct}
                  disabled={!!deletingId}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {deletingId ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
