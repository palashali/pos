import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CreditCard, 
  Banknote,
  Printer,
  X,
  Barcode
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    vat_enabled: false,
    vat_percentage: 0,
    discount_type: 'fixed'
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    fetchSettings();
    barcodeInputRef.current?.focus();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [prodData, custData] = await Promise.all([
        apiFetch('/api/products?approved_only=true'),
        apiFetch('/api/customers')
      ]);
      setProducts(prodData);
      setCustomers(custData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock <= 0) {
      alert('Product out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Cannot add more than available stock!');
        return;
      }
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price
      }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    const product = products.find((p: any) => p.id === productId) as any;
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > product.stock) {
          alert('Cannot exceed available stock!');
          return item;
        }
        return newQty === 0 ? null : { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const vatPercentage = settings?.vat_enabled ? (settings?.vat_percentage || 0) : 0;
  const tax = subtotal * (vatPercentage / 100);
  
  const calculatedDiscount = settings?.discount_type === 'percentage' 
    ? (subtotal * (discount / 100)) 
    : discount;

  const total = subtotal + tax - calculatedDiscount;

  const handleCheckout = async () => {
    try {
      const result = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomer?.id || null,
          items: cart,
          total_amount: subtotal,
          discount: calculatedDiscount,
          tax,
          final_amount: total,
          payment_method: paymentMethod
        })
      });

      // Fetch full sale details for receipt
      const saleData = await apiFetch(`/api/sales/${result.id}`);
      setLastSale(saleData);
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setIsCheckoutModalOpen(false);
      setIsReceiptModalOpen(true);
      fetchData(); // Refresh stock
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
            .border-t { border-top: 1px dashed #000; }
            .border-b { border-bottom: 1px dashed #000; }
            .w-full { width: 100%; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; text-align: left; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const product = products.find((p: any) => p.barcode === searchTerm);
      if (product) {
        addToCart(product);
        setSearchTerm('');
      }
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer)
      });

      setCustomers([...customers, result] as any);
      setSelectedCustomer(result);
      setIsAddCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert(error.message || 'Failed to add customer');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Left: Product Selection */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              ref={barcodeInputRef}
              type="text" 
              placeholder="Scan barcode or search products..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleBarcodeScan}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
              <Barcode size={20} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {filteredProducts.map((product: any) => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left flex flex-col ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="aspect-square rounded-xl bg-slate-50 mb-3 overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <ShoppingCart className="text-slate-200" size={48} />
                )}
              </div>
              <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
              <p className="text-xs text-slate-500 mb-2">{product.category_name || 'General'}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-lg font-bold text-indigo-600">৳{product.price.toFixed(2)}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${product.stock <= product.low_stock_threshold ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}>
                  {product.stock} left
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-96 flex flex-col gap-4">
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={20} className="text-indigo-600" />
              Current Order
            </h2>
            <button onClick={() => setCart([])} className="text-xs text-rose-600 font-bold hover:underline">Clear All</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <ShoppingCart size={48} strokeWidth={1} />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500">৳{item.unit_price.toFixed(2)} / unit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.product_id)} className="p-1 text-rose-400 hover:text-rose-600 ml-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold">৳{subtotal.toFixed(2)}</span>
            </div>
            {settings?.vat_enabled && (
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>VAT ({settings.vat_percentage}%)</span>
                <span className="font-bold">৳{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Discount {settings?.discount_type === 'percentage' ? '(%)' : '(TK)'}</span>
              <input 
                type="number" 
                className="w-20 text-right bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none font-bold"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xl font-black text-slate-900">
              <span>Total</span>
              <span className="text-indigo-600">৳{total.toFixed(2)}</span>
            </div>
            <button 
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              Checkout Now
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Complete Transaction</h2>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Select Customer (Optional)</label>
                  <button 
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={12} />
                    Add New
                  </button>
                </div>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => setSelectedCustomer(customers.find((c: any) => c.id === Number(e.target.value)))}
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-600'}`}
                  >
                    <Banknote size={20} />
                    <span className="font-bold">Cash</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-600'}`}
                  >
                    <CreditCard size={20} />
                    <span className="font-bold">Card</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Total Payable</span>
                  <span className="text-2xl font-black text-indigo-600">৳{total.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Confirm & Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Customer</h2>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Customer Name *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone Number *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email (Optional)</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddCustomerModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && lastSale && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold">Receipt</h2>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div id="receipt-content" className="flex-1 overflow-y-auto p-8 font-mono text-sm">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase">{settings?.shop_name || 'NEXUS POS PRO'}</h1>
                <p>{settings?.address || '123 Business Street, Tech City'}</p>
                <p>Tel: {settings?.phone || '+1 234 567 890'}</p>
              </div>
              <div className="border-t border-dashed border-slate-300 py-4 space-y-1">
                <p>Receipt #: {lastSale.id}</p>
                <p>Date: {new Date(lastSale.created_at).toLocaleString()}</p>
                <p>Staff: {lastSale.staff_name}</p>
                <p>Customer: {lastSale.customer_name || 'Walk-in'}</p>
              </div>
              <div className="border-t border-dashed border-slate-300 py-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">Item</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSale.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-1">{item.product_name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">৳{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-dashed border-slate-300 py-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>৳{lastSale.total_amount.toFixed(2)}</span>
                </div>
                {lastSale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>৳{lastSale.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-৳{lastSale.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-slate-300">
                  <span>TOTAL</span>
                  <span>৳{lastSale.final_amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-center mt-8 space-y-1">
                <p>Payment: {lastSale.payment_method.toUpperCase()}</p>
                <p className="font-bold">THANK YOU FOR YOUR VISIT!</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold"
              >
                <Printer size={20} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
