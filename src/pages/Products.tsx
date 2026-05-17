import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Trash2, Edit, Package, AlertCircle, ArrowUpDown, X, History, Printer } from 'lucide-react';
import { apiFetch } from '../utils/api';
import JsBarcode from 'jsbarcode';

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize search term if query param filter=pending is present
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') === 'pending' ? 'pending' : '';
  const [searchTerm, setSearchTerm] = useState(initialFilter);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ quantity: '', reason: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false);
  const [bulkPrintItems, setBulkPrintItems] = useState<any[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [showPriceInLabels, setShowPriceInLabels] = useState(true);

  const handleBulkPrint = () => {
    if (bulkPrintItems.length === 0) {
      alert('Please add some products to print labels.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print labels.');
      return;
    }

    const labelsData: any[] = [];
    
    // Process each product in bulkPrintItems
    for (const item of bulkPrintItems) {
      if (!item.barcode) continue;
      
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, item.barcode, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 14,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10
        });
        const barcodeDataUrl = canvas.toDataURL("image/png");
        
        for (let i = 0; i < item.printQuantity; i++) {
          labelsData.push({
            name: item.name,
            price: item.price,
            barcodeImg: barcodeDataUrl,
            shopName: settings?.shop_name || 'Feha Moon Collection'
          });
        }
      } catch (e) {
        console.error('Barcode generation failed for:', item.name, e);
      }
    }

    if (labelsData.length === 0) {
      alert('No valid barcodes found to print.');
      printWindow.close();
      return;
    }

    const labelsHtml = labelsData.map(label => `
      <div class="label">
        <div class="shop-name">${label.shopName}</div>
        <div class="product-name">${label.name}</div>
        ${showPriceInLabels ? `<div class="price">Price: ৳${label.price.toFixed(2)}</div>` : ''}
        <div class="barcode-container">
          <img src="${label.barcodeImg}" />
        </div>
      </div>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Print Labels</title>
          <style>
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; padding: 0; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; margin: 0; }
            .label-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, 60mm);
              gap: 2mm;
              justify-content: center;
              background: white;
              padding: 5mm;
              min-height: 297mm;
            }
            .label {
              width: 60mm;
              height: 35mm;
              border: 1px solid #eee;
              padding: 5px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              box-sizing: border-box;
              overflow: hidden;
              background: white;
            }
            @media print {
              body { background: white; padding: 0; }
              .label-grid { padding: 0; gap: 0; border: none; display: block; }
              .label { border: none; page-break-inside: avoid; page-break-after: always; margin: 0 auto; width: 60mm; height: 35mm; }
            }
            .shop-name { font-size: 7px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; line-height: 1.1; width: 100%; word-break: break-word; overflow: visible; }
            .product-name { font-size: 9px; font-weight: bold; margin-bottom: 1px; line-height: 1.1; width: 100%; word-break: break-word; overflow: visible; }
            .price { font-size: 10px; font-weight: bold; margin-bottom: 1px; }
            .barcode-container { width: 100%; display: flex; justify-content: center; margin-top: 2px; }
            .barcode-container img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="label-grid">${labelsHtml}</div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setIsBulkPrintModalOpen(false);
  };

  const addToBulkPrint = (product: any) => {
    if (!product.barcode) {
      alert('This product does not have a barcode.');
      return;
    }
    const exists = bulkPrintItems.find(item => item.id === product.id);
    if (exists) {
      setBulkPrintItems(bulkPrintItems.map(item => 
        item.id === product.id ? { ...item, printQuantity: item.printQuantity + 1 } : item
      ));
    } else {
      setBulkPrintItems([...bulkPrintItems, { ...product, printQuantity: 1 }]);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiFetch(`/api/products/${id}/approve`, { method: 'POST' });
      loadData();
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
      console.error('Error loading history:', error);
      alert('Failed to load product history');
    }
  };

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiFetch('/api/settings');
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    try {
      const [prodData, catData] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories')
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: any) => {
    e.preventDefault();
    try {
      await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory)
      });
      setNewCategory({ name: '', description: '' });
      loadData();
      alert('Category added successfully!');
    } catch (error: any) {
      console.error('Error adding category:', error);
      alert(error.message || 'Failed to add category');
    }
  };

  const handleCategoryDelete = async (id: number) => {
    if (!confirm('Are you sure? This might affect products in this category.')) return;
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleStockAdjust = async (e: any) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/products/${adjustingProduct.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(stockAdjustment.quantity),
          reason: stockAdjustment.reason
        })
      });

      setIsStockModalOpen(false);
      setAdjustingProduct(null);
      setStockAdjustment({ quantity: '', reason: '' });
      loadData();
      
      if (!isAdmin) {
        alert('Stock adjustment submitted and pending admin approval!');
      } else {
        alert('Stock adjusted successfully!');
      }
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(error.message || 'Failed to adjust stock');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products.filter((p: any) => {
    if (searchTerm.toLowerCase() === 'pending' && p.is_approved === 0) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Product Inventory</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsBulkPrintModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
          >
            <Printer size={20} />
            Label Print
          </button>
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
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold w-fit" title={`Pending: ${product.approval_type || 'Add Product'}`}>
                          Pending {product.approval_type ? `(${product.approval_type})` : 'Approval'}
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
      {/* Bulk Label Print Modal */}
      {isBulkPrintModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Printer className="text-amber-500" />
                Print Labels
              </h2>
              <button onClick={() => setIsBulkPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
              {/* Product Selection Side */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search products to add..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  {products
                    .filter((p: any) => 
                      p.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
                      p.barcode?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                    )
                    .slice(0, 50).map((product: any) => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-300 cursor-pointer transition-all"
                      onClick={() => addToBulkPrint(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                          {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <Package className="text-slate-400" size={16} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{product.name}</div>
                          <div className="text-[10px] text-slate-500">{product.barcode || 'No barcode'}</div>
                        </div>
                      </div>
                      <Plus size={16} className="text-slate-400" />
                    </div>
                  ))}
                  {products.length > 50 && <div className="text-center text-xs text-slate-400">Showing top 50 products. Use search to find more.</div>}
                </div>
              </div>

              {/* Print List Side */}
              <div className="w-full lg:w-96 flex flex-col gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-slate-900">Print Preview List</h3>
                  <button 
                    onClick={() => setBulkPrintItems([])}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {bulkPrintItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                      <Package size={40} />
                      <p className="text-sm">No products added</p>
                    </div>
                  ) : (
                    bulkPrintItems.map((item: any) => (
                      <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="font-bold text-sm text-slate-900 leading-tight">{item.name}</div>
                          <button 
                            onClick={() => setBulkPrintItems(bulkPrintItems.filter(i => i.id !== item.id))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Labels:</div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setBulkPrintItems(bulkPrintItems.map(i => 
                                i.id === item.id ? { ...i, printQuantity: Math.max(1, i.printQuantity - 1) } : i
                              ))}
                              className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                            >-</button>
                            <span className="font-bold text-slate-900">{item.printQuantity}</span>
                            <button 
                              onClick={() => setBulkPrintItems(bulkPrintItems.map(i => 
                                i.id === item.id ? { ...i, printQuantity: i.printQuantity + 1 } : i
                              ))}
                              className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                            >+</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <input 
                      type="checkbox" 
                      id="showPriceToggle"
                      checked={showPriceInLabels}
                      onChange={(e) => setShowPriceInLabels(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="showPriceToggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Show Price on Labels
                    </label>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-slate-500">Total Labels:</span>
                    <span className="font-bold text-slate-900">
                      {bulkPrintItems.reduce((acc, item) => acc + item.printQuantity, 0)}
                    </span>
                  </div>
                  <button 
                    onClick={handleBulkPrint}
                    disabled={bulkPrintItems.length === 0}
                    className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Printer size={20} />
                    Print Selected Labels
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
