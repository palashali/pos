import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Edit, Package, AlertCircle, ArrowUpDown, X, History } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Products() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ quantity: '', reason: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const handleApprove = async (id: number) => {
    try {
      await apiFetch(`/api/products/${id}/approve`, { method: 'POST' });
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to approve product');
    }
  };

  const handleViewHistory = async (product: any) => {
    try {
      const data = await apiFetch(`/api/products/${product.id}/history`);
      setHistoryData(data);
      setIsHistoryModalOpen(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      alert('Failed to load product history');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    try {
      const [prodData, catData] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories')
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: any) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` 
        },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        setNewCategory({ name: '', description: '' });
        fetchData();
        alert('Category added successfully!');
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleCategoryDelete = async (id: number) => {
    if (!confirm('Are you sure? This might affect products in this category.')) return;
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleStockAdjust = async (e: any) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/products/${adjustingProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` 
        },
        body: JSON.stringify({
          quantity: Number(stockAdjustment.quantity),
          reason: stockAdjustment.reason
        })
      });

      if (response.ok) {
        setIsStockModalOpen(false);
        setAdjustingProduct(null);
        setStockAdjustment({ quantity: '', reason: '' });
        fetchData();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Product Inventory</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Edit size={20} />
            Categories
          </button>
          <button 
            onClick={() => navigate('/add-product')}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or barcode..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product: any) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="text-slate-400" size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.barcode || 'No barcode'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{product.category_name || 'Uncategorized'}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">৳{product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${product.stock <= product.low_stock_threshold ? 'text-rose-600' : 'text-slate-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {product.stock <= product.low_stock_threshold ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold w-fit">
                          <AlertCircle size={12} />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold w-fit">
                          In Stock
                        </span>
                      )}
                      {product.is_approved === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold w-fit">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && product.is_approved === 0 && (
                        <button 
                          onClick={() => handleApprove(product.id)}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
                        >
                          Approve
                        </button>
                      )}
                      <button 
                        onClick={() => handleViewHistory(product)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View History"
                      >
                        <History size={18} />
                      </button>
                      <button 
                        onClick={() => { 
                          setAdjustingProduct(product); 
                          setStockAdjustment({ quantity: '', reason: '' });
                          setIsStockModalOpen(true); 
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Adjust Stock"
                      >
                        <ArrowUpDown size={18} />
                      </button>
                      <button 
                        onClick={() => navigate(`/edit-product/${product.id}`)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit Product"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Adjust Stock</h2>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-sm text-slate-500">Product</div>
                <div className="font-bold text-slate-900">{adjustingProduct.name}</div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-bold text-slate-900">{adjustingProduct.stock}</span>
                </div>
              </div>
              
              <form onSubmit={handleStockAdjust} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Adjustment Quantity</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required 
                      placeholder="e.g. 5 or -3"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={stockAdjustment.quantity}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Use positive numbers to add stock, negative to reduce.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Reason (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. New shipment, Damaged goods"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={stockAdjustment.reason}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">Save Adjustment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && historyData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History className="text-indigo-600" />
                Product History
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-2">Product Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-indigo-600/70 block">Added By</span>
                    <span className="font-medium text-indigo-900">{historyData.product.added_by_name || 'System / Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-600/70 block">Added On</span>
                    <span className="font-medium text-indigo-900">
                      {new Date(historyData.product.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-600/70 block">Purchase Price (Cost)</span>
                    <span className="font-medium text-indigo-900">৳{historyData.product.cost_price?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-600/70 block">Selling Price</span>
                    <span className="font-medium text-indigo-900">৳{historyData.product.price?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 mb-4">Stock Adjustment Logs</h3>
              {historyData.logs && historyData.logs.length > 0 ? (
                <div className="space-y-3">
                  {historyData.logs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.type === 'in' ? 'Stock In' : 'Stock Out'}
                          </span>
                          <span className="font-bold text-slate-900">{log.quantity} units</span>
                        </div>
                        <div className="text-sm text-slate-600">{log.reason || 'No reason provided'}</div>
                        {log.type === 'in' && (log.cost_price !== null || log.price !== null) && (
                          <div className="flex gap-3 mt-1 text-xs text-slate-500">
                            {log.cost_price !== null && <span>Cost: ৳{log.cost_price.toFixed(2)}</span>}
                            {log.price !== null && <span>Selling: ৳{log.price.toFixed(2)}</span>}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">By: {log.user_name || 'Unknown'}</div>
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  No stock adjustment history found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Manage Categories</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <form onSubmit={handleCategorySubmit} className="space-y-3">
                <input 
                  placeholder="Category Name" 
                  required 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
                <input 
                  placeholder="Description (Optional)" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                  Add Category
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Existing Categories</h3>
                {categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700">{cat.name}</span>
                    <button onClick={() => handleCategoryDelete(cat.id)} className="text-rose-400 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
