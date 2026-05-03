import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Save, ScanLine, X, Plus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiFetch } from '../utils/api';

export default function AddProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [existingProduct, setExistingProduct] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchCategories();
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const isAdmin = user?.role === 'admin';

  const fetchProduct = async (productId: string) => {
    try {
      const data = await apiFetch(`/api/products/${productId}`);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  useEffect(() => {
    if (product?.barcode) {
      setBarcodeInput(product.barcode);
    }
  }, [product?.barcode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barcodeInput && barcodeInput !== product?.barcode) {
        lookupBarcode(barcodeInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [barcodeInput]);

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          setScannedBarcode(decodedText);
          setBarcodeInput(decodedText);
          setIsScannerOpen(false);
          scanner.clear();
          // Trigger the lookup
          lookupBarcode(decodedText);
        },
        (error) => {
          // Ignore errors, they happen constantly when scanning
        }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isScannerOpen]);

  const lookupBarcode = async (barcode: string) => {
    if (!barcode || id) return;

    try {
      const data = await apiFetch(`/api/products/barcode/${barcode}`);
      if (data && data.id) {
        setExistingProduct(data);
        setProduct({ ...data, stock: '' }); // Clear stock so user can enter amount to add
        alert(`Product "${data.name}" found! Entering stock will add to existing inventory.`);
      }
    } catch (error) {
      // Not found, normal add product
      setExistingProduct(null);
      if (product && product.id) {
        setProduct(null); // Reset if they change a found barcode to a new one
      }
      setProduct((prev: any) => ({ ...prev, barcode }));
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      setIsCategoryModalOpen(false);
      fetchCategories();
      alert('Category added successfully!');
    } catch (error: any) {
      console.error('Error adding category:', error);
      alert(error.message || 'Failed to add category');
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    
    try {
      const targetId = id || existingProduct?.id;
      const url = targetId ? `/api/products/${targetId}` : '/api/products';
      const method = targetId ? 'PUT' : 'POST';
      
      if (!id && existingProduct) {
        // Adding to existing product
        const addedStock = Number(formData.get('stock')) || 0;
        formData.set('stock', (existingProduct.stock + addedStock).toString());
      }

      await apiFetch(url, {
        method,
        body: formData
      });

      const successMsg = targetId 
        ? (isAdmin ? 'Product updated successfully!' : 'Product updating and pending admin approval!')
        : (isAdmin ? 'Product added successfully!' : 'Product added and pending admin approval!');
      
      alert(successMsg);
      navigate('/products');
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/products')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            title="Back to Inventory"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-indigo-600" />
            {id ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {existingProduct && !id && (
          <div className="bg-indigo-50 border-b border-indigo-100 p-4 text-indigo-700 font-medium">
            Existing product found. Current stock: {existingProduct.stock}. Enter the quantity you want to add.
          </div>
        )}
        <form key={product?.id || 'new'} onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">SKU / Barcode</label>
              <div className="flex gap-2">
                <input 
                  name="barcode"
                  type="text" 
                  value={barcodeInput}
                  onChange={handleBarcodeChange}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. WM-001"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Scan Barcode"
                >
                  <ScanLine size={24} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Product Name *</label>
              <input 
                name="name"
                type="text" 
                required 
                defaultValue={product?.name}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. Wireless Mouse"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <div className="flex gap-2">
                <select 
                  name="category_id"
                  defaultValue={product?.category_id}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Add New Category"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                {existingProduct && !id ? 'Stock to Add' : 'Stock'}
              </label>
              <input 
                name="stock"
                type="number" 
                defaultValue={product?.stock !== undefined ? product.stock : 0}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Purchase Price (Cost) *</label>
              <input 
                name="cost_price"
                type="number" 
                step="0.01"
                required 
                defaultValue={product?.cost_price}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Selling Price *</label>
              <input 
                name="price"
                type="number" 
                step="0.01"
                required 
                defaultValue={product?.price}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Low Stock Alert Threshold</label>
              <input 
                name="low_stock_threshold"
                type="number" 
                defaultValue={product?.low_stock_threshold || 5}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Product Image</label>
              <div className="flex items-center gap-4">
                {product?.image_url && (
                  <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                )}
                <input 
                  name="image"
                  type="file" 
                  accept="image/*"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea 
              name="description"
              rows={3}
              defaultValue={product?.description}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Product details..."
            ></textarea>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving...' : (id ? 'Update Product' : 'Save Product')}
            </button>
          </div>
        </form>
      </div>

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Scan Barcode</h2>
              <button onClick={() => setIsScannerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div id="reader" className="w-full"></div>
              <p className="text-sm text-slate-500 text-center mt-4">
                Point your camera at a barcode to scan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Category</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Category Name *</label>
                <input 
                  type="text" 
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>
              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
