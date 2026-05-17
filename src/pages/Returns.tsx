import React, { useState, useEffect } from 'react';
import { Search, Plus, RotateCcw, X, FileText, CheckCircle, AlertCircle, Package, Receipt, Printer, Eye } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Returns() {
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier' | 'history'>('customer');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Supplier Return State
  const [products, setProducts] = useState([]);
  const [newSupplierReturn, setNewSupplierReturn] = useState({
    product_id: '',
    supplier_id: '',
    location_id: '',
    quantity: '',
    refund_amount: '',
    refund_method: 'cash',
    reason: ''
  });

  // History State
  const [saleReturnsHistory, setSaleReturnsHistory] = useState([]);
  const [supplierReturnsHistory, setSupplierReturnsHistory] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('nexus_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    loadHistory();
    loadProducts();
    loadSettings();
    loadLocations();
    loadSuppliers();
  }, [activeTab]);

  const loadSuppliers = async () => {
    try {
      const data = await apiFetch('/api/suppliers');
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await apiFetch('/api/locations');
      setLocations(data);
      if (data.length > 0) {
        const firstLocId = data[0].id.toString();
        setSelectedLocationId(firstLocId);
        setNewSupplierReturn(prev => ({ ...prev, location_id: firstLocId }));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const [saleRes, suppRes] = await Promise.all([
        apiFetch('/api/returns/sales'),
        apiFetch('/api/returns/suppliers')
      ]);
      setSaleReturnsHistory(saleRes);
      setSupplierReturnsHistory(suppRes);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiFetch('/api/products');
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSearchInvoice = async () => {
    if (!invoiceNumber) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/sales/${invoiceNumber}`);
      setSale(data);
      setReturnItems(data.items.map((item: any) => ({ ...item, return_qty: 0 })));
    } catch (error: any) {
      alert(error.message || 'Invoice not found');
      setSale(null);
    } finally {
      setLoading(false);
    }
  };

  const handleItemQtyChange = (productId: number, qty: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const validatedQty = Math.min(Math.max(0, qty), item.quantity);
        return { ...item, return_qty: validatedQty };
      }
      return item;
    }));
  };

  const calculateRefundTotal = () => {
    if (!sale) return 0;
    
    // Proportional VAT and Discount recalculation
    const originalTotal = sale.total_amount;
    const vatPercent = originalTotal > 0 ? (sale.tax / originalTotal) : 0;
    const discountPercent = originalTotal > 0 ? (sale.discount / originalTotal) : 0;

    return returnItems.reduce((total, item) => {
      const itemSubtotal = item.unit_price * item.return_qty;
      const itemDiscount = itemSubtotal * discountPercent;
      const itemVat = itemSubtotal * vatPercent;
      return total + (itemSubtotal - itemDiscount + itemVat);
    }, 0);
  };

  const handleSubmitCustomerReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToReturn = returnItems.filter(item => item.return_qty > 0);
    if (itemsToReturn.length === 0) return alert('Select items to return');

    try {
      const res = await apiFetch('/api/returns/sales', {
        method: 'POST',
        body: JSON.stringify({
          sale_id: sale.id,
          refund_method: refundMethod,
          reason,
          location_id: selectedLocationId ? Number(selectedLocationId) : null,
          items: itemsToReturn.map(item => ({
            product_id: item.product_id,
            quantity: item.return_qty,
            price: item.unit_price
          }))
        })
      });
      alert(res.message || 'Return processed successfully!');
      setSale(null);
      setReturnItems([]);
      setInvoiceNumber('');
      loadHistory();
    } catch (error: any) {
      alert(error.message || 'Failed to process return');
    }
  };

  const handlePrintReturn = (returnData: any) => {
    if (!returnData || !settings) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Return Receipt #${returnData.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; line-height: 1.2; color: #000; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .mb-2 { margin-bottom: 0.5rem; }
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
          <div class="text-center mb-6">
            <h1 class="text-xl font-bold uppercase">${settings.shop_name || 'NEXUS POS PRO'}</h1>
            <p>${settings.address || ''}</p>
            <p>Tel: ${settings.phone || ''}</p>
            <p class="font-bold mb-2 mt-4" style="font-size: 14px;">--- RETURN RECEIPT ---</p>
          </div>
          
          <div class="border-t border-dashed py-4" style="line-height: 1.5;">
            <p>Receipt #: ${String(returnData.id).padStart(4, '0')}</p>
            <p>Orig. Sale #: ${String(returnData.sale_id).padStart(4, '0')}</p>
            <p>Date: ${new Date(returnData.created_at).toLocaleString()}</p>
            <p>Staff: ${returnData.staff_name || 'System'}</p>
            <p>Customer: ${returnData.customer_name || 'Walk-in'}</p>
            ${returnData.customer_code ? `<p>Customer ID: ${returnData.customer_code}</p>` : ''}
            ${returnData.customer_phone ? `<p>Phone: ${returnData.customer_phone}</p>` : ''}
            ${returnData.location_name ? `<p>Location: ${returnData.location_name}</p>` : ''}
          </div>

          <div class="border-t border-dashed py-4">
            <table class="w-full">
              <thead>
                <tr class="text-left font-bold border-b border-dashed">
                  <th class="pb-2">Item</th>
                  <th class="pb-2 text-center">Qty</th>
                  <th class="pb-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody>
                ${returnData.items?.map((item: any) => `
                  <tr>
                    <td class="py-1">
                      <div class="font-bold">${item.product_name}</div>
                      <div style="font-size: 10px; color: #666;">
                        ${item.quantity} x ৳${item.price_at_return?.toFixed(2)} = ৳${(item.price_at_return * item.quantity).toFixed(2)}
                      </div>
                      ${item.discount_amount > 0 ? `<div style="font-size: 10px; color: #666;">Discount: -৳${item.discount_amount.toFixed(2)}</div>` : ''}
                      ${item.vat_amount > 0 ? `<div style="font-size: 10px; color: #666;">VAT: +৳${item.vat_amount.toFixed(2)}</div>` : ''}
                    </td>
                    <td class="py-1 text-center">${item.quantity}</td>
                    <td class="py-1 text-right font-bold">৳${((item.price_at_return * item.quantity) - (item.discount_amount || 0) + (item.vat_amount || 0)).toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
          </div>

          <div class="border-t border-dashed py-4" style="line-height: 1.6;">
             <div class="flex justify-between">
              <span>Items Total</span>
              <span>৳${returnData.items?.reduce((acc: number, i: any) => acc + (i.price_at_return * i.quantity), 0).toFixed(2) || '0.00'}</span>
            </div>
            ${returnData.items?.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0) > 0 ? `
              <div class="flex justify-between">
                <span>Total Discount</span>
                <span>-৳${returnData.items?.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0).toFixed(2)}</span>
              </div>
            ` : ''}
            ${returnData.items?.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0) > 0 ? `
              <div class="flex justify-between">
                <span>Total VAT</span>
                <span>+৳${returnData.items?.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between font-bold" style="font-size: 14px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
              <span>TOTAL REFUND</span>
              <span>৳${returnData.refund_amount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mt-2">
              <span>Method</span>
              <span class="uppercase">${returnData.refund_method?.replace('_', ' ')}</span>
            </div>
            <div class="flex justify-between">
              <span>Reason</span>
              <span>${returnData.reason || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
              <span>Status</span>
              <span class="font-bold uppercase ${returnData.status === 'Approved' ? 'text-green-600' : 'text-orange-600'}">${returnData.status}</span>
            </div>
          </div>

          <div class="text-center mt-8">
            <p class="font-bold">THANK YOU!</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleViewReturnDetails = async (returnId: number) => {
    try {
      const data = await apiFetch(`/api/returns/sales/${returnId}`);
      setSelectedReturn(data);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      alert(error.message || 'Failed to fetch return details');
    }
  };

  const handleViewMemo = async (returnId: number) => {
    try {
      const data = await apiFetch(`/api/returns/sales/${returnId}`);
      setSelectedReturn(data);
      setIsMemoModalOpen(true);
    } catch (error: any) {
      alert(error.message || 'Failed to fetch return details');
    }
  };

  const handlePrintMemo = () => {
    if (!selectedReturn || !settings) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Return Memo #${selectedReturn.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; line-height: 1.2; color: #000; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .mb-2 { margin-bottom: 0.5rem; }
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
          <div class="text-center mb-6">
            <h1 class="text-xl font-bold uppercase">${settings.shop_name || 'NEXUS POS PRO'}</h1>
            <p>${settings.address || ''}</p>
            <p>Tel: ${settings.phone || ''}</p>
            <p class="font-bold mb-2 mt-4" style="font-size: 14px;">--- RETURN MEMO ---</p>
          </div>
          
          <div class="border-t border-dashed py-4" style="line-height: 1.5;">
            <p>Return Memo #: ${String(selectedReturn.id).padStart(4, '0')}</p>
            <p>Orig. Sale #: ${String(selectedReturn.sale_id).padStart(4, '0')}</p>
            <p>Date: ${new Date(selectedReturn.created_at).toLocaleString()}</p>
            <p>Staff: ${selectedReturn.staff_name}</p>
            <p>Customer: ${selectedReturn.customer_name || 'Walk-in'}</p>
            ${selectedReturn.customer_code ? `<p>Customer ID: ${selectedReturn.customer_code}</p>` : ''}
            ${selectedReturn.customer_phone ? `<p>Phone: ${selectedReturn.customer_phone}</p>` : ''}
            ${selectedReturn.location_name ? `<p>Location: ${selectedReturn.location_name}</p>` : ''}
          </div>

          <div class="border-t border-dashed py-4">
            <table class="w-full">
              <thead>
                <tr class="text-left font-bold border-b border-dashed">
                  <th class="pb-2">Item</th>
                  <th class="pb-2 text-center">Qty</th>
                  <th class="pb-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody>
                ${selectedReturn.items.map((item: any) => `
                  <tr>
                    <td class="py-1">
                      <div class="font-bold">${item.product_name}</div>
                      <div style="font-size: 10px; color: #666;">
                        ${item.quantity} x ৳${item.price_at_return?.toFixed(2)} = ৳${(item.price_at_return * item.quantity).toFixed(2)}
                      </div>
                      ${item.discount_amount > 0 ? `<div style="font-size: 10px; color: #666;">Discount: -৳${item.discount_amount.toFixed(2)}</div>` : ''}
                      ${item.vat_amount > 0 ? `<div style="font-size: 10px; color: #666;">VAT: +৳${item.vat_amount.toFixed(2)}</div>` : ''}
                    </td>
                    <td class="py-1 text-center">${item.quantity}</td>
                    <td class="py-1 text-right font-bold">৳${((item.price_at_return * item.quantity) - (item.discount_amount || 0) + (item.vat_amount || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="border-t border-dashed py-4" style="line-height: 1.6;">
            <div class="flex justify-between">
              <span>Items Total</span>
              <span>৳${selectedReturn.items.reduce((acc: number, i: any) => acc + (i.price_at_return * i.quantity), 0).toFixed(2)}</span>
            </div>
            ${selectedReturn.items.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0) > 0 ? `
              <div class="flex justify-between">
                <span>Total Discount</span>
                <span>-৳${selectedReturn.items.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0).toFixed(2)}</span>
              </div>
            ` : ''}
            ${selectedReturn.items.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0) > 0 ? `
              <div class="flex justify-between">
                <span>Total VAT</span>
                <span>+৳${selectedReturn.items.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between font-bold" style="font-size: 14px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
              <span>TOTAL REFUND</span>
              <span>৳${selectedReturn.refund_amount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mt-2">
              <span>Method</span>
              <span class="uppercase">${selectedReturn.refund_method?.replace('_', ' ')}</span>
            </div>
            <div class="flex justify-between">
              <span>Reason</span>
              <span>${selectedReturn.reason || 'N/A'}</span>
            </div>
          </div>

          <div class="text-center mt-8">
            <p class="font-bold">THANK YOU FOR YOUR VISIT!</p>
            <p style="font-size: 10px; margin-top: 5px; color: #666;">Generated by Feha Moon Collection</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleApproveReturn = async (id: number) => {
    if (!confirm('Approve this return? Stock will be updated.')) return;
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/returns/sales/${id}/approve`, { method: 'POST' });
      alert(res.message || 'Return approved');
      setIsDetailModalOpen(false);
      setIsMemoModalOpen(false); // Close both just in case
      fetchHistory();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReturn = async (id: number) => {
    if (!confirm('Reject this return?')) return;
    setProcessingId(id);
    try {
      const res = await apiFetch(`/api/returns/sales/${id}/reject`, { method: 'POST' });
      alert(res.message || 'Return rejected');
      setIsDetailModalOpen(false);
      setIsMemoModalOpen(false); // Close both just in case
      fetchHistory();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };
  const handleSubmitSupplierReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/suppliers/returns', {
        method: 'POST',
        body: JSON.stringify({
          ...newSupplierReturn,
          product_id: Number(newSupplierReturn.product_id),
          supplier_id: Number(newSupplierReturn.supplier_id),
          location_id: Number(newSupplierReturn.location_id),
          quantity: Number(newSupplierReturn.quantity),
          refund_amount: Number(newSupplierReturn.refund_amount)
        })
      });
      alert('Supplier return recorded!');
      setNewSupplierReturn({ 
        product_id: '', 
        supplier_id: '', 
        location_id: '', 
        quantity: '', 
        refund_amount: '', 
        refund_method: 'cash', 
        reason: '' 
      });
      loadHistory();
    } catch (error: any) {
      alert(error.message || 'Failed to process supplier return');
    }
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'customer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Customer Return
          </button>
          <button 
            onClick={() => setActiveTab('supplier')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'supplier' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Supplier Return
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Receipt className="text-indigo-600" size={20} />
                Find Invoice
              </h2>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Enter Invoice Number (e.g. 1)" 
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
                <button 
                  onClick={handleSearchInvoice}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {sale && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">Items from Invoice #{sale.id}</h3>
                    <p className="text-sm text-slate-500">{new Date(sale.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-bold text-slate-900">{sale.customer_name || 'Walk-in'}</p>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Sold Qty</th>
                      <th className="px-6 py-4 text-right">Unit Price</th>
                      <th className="px-6 py-4 text-right">After Discount</th>
                      <th className="px-6 py-4">Return Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item) => {
                      const discountRatio = sale.total_amount > 0 ? sale.final_amount / sale.total_amount : 1;
                      const discountedPrice = item.unit_price * discountRatio;
                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{item.product_name}</td>
                          <td className="px-6 py-4 text-slate-600">{item.quantity}</td>
                          <td className="px-6 py-4 text-slate-600 text-right">৳{item.unit_price.toFixed(2)}</td>
                          <td className="px-6 py-4 text-rose-600 font-bold text-right text-sm">৳{discountedPrice.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <input 
                              type="number" 
                              min="0" 
                              max={item.quantity}
                              className="w-20 px-3 py-1 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 ml-auto block"
                              value={item.return_qty}
                              onChange={(e) => handleItemQtyChange(item.product_id, parseInt(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <RotateCcw className="text-rose-600" size={20} />
                Return Summary
              </h2>
              <form onSubmit={handleSubmitCustomerReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Refund Total</label>
                  <div className="text-3xl font-black text-rose-600">৳{calculateRefundTotal().toFixed(2)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Return to Location</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Refund Method</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    {sale?.customer_id && <option value="store_credit">Store Credit</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Return Reason</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none mb-2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="">Select Reason</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Wrong Item">Wrong Item</option>
                    <option value="Dissatisfaction">Customer Dissatisfaction</option>
                    <option value="Other">Other</option>
                  </select>
                  {reason === 'Other' && (
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none h-20"
                      placeholder="Specify reason..."
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={!sale || calculateRefundTotal() <= 0}
                  className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-lg shadow-rose-200"
                >
                  Process Refund
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supplier' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Package className="text-indigo-600" size={24} />
            New Supplier Return
          </h2>
          <form onSubmit={handleSubmitSupplierReturn} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newSupplierReturn.supplier_id}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, supplier_id: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                  {suppliers.length === 0 && <option disabled>No suppliers found. Create one in Settings.</option>}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newSupplierReturn.product_id}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, product_id: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Global Stock: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">From Location</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newSupplierReturn.location_id}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, location_id: e.target.value })}
                >
                  <option value="">Select Location</option>
                  {locations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Return Quantity</label>
                <input 
                  type="number" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newSupplierReturn.quantity}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Method</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newSupplierReturn.refund_method}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, refund_method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="adjustment">Balance Adjustment</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newSupplierReturn.refund_amount}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, refund_amount: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 h-24"
                  value={newSupplierReturn.reason}
                  onChange={(e) => setNewSupplierReturn({ ...newSupplierReturn, reason: e.target.value })}
                  placeholder="e.g. Damaged, Expired..."
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-shadow hover:shadow-lg">
              Record Supplier Return
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Detailed Modal */}
          {isDetailModalOpen && selectedReturn && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-600 text-white">
                  <div>
                    <h2 className="text-xl font-bold">Return Details #{selectedReturn.id}</h2>
                    <p className="text-rose-100 text-xs">Linked Sale: #{selectedReturn.sale_id}</p>
                  </div>
                  <button onClick={() => setIsDetailModalOpen(false)} className="text-white/80 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 middle-scroll max-h-[70vh] overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 font-medium">Customer</p>
                      <p className="font-bold text-slate-900">{selectedReturn.customer_name || 'Walk-in'}</p>
                      {selectedReturn.customer_code && <p className="text-xs text-indigo-600 font-bold">ID: {selectedReturn.customer_code}</p>}
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Staff</p>
                      <p className="font-bold text-slate-900">{selectedReturn.staff_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Refund Method</p>
                      <p className="font-bold text-slate-900 capitalize">{selectedReturn.refund_method}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Status</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        selectedReturn.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        selectedReturn.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {selectedReturn.status}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-slate-500 font-medium mb-2">Returned Items</p>
                    <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100/50 text-slate-500">
                          <tr>
                            <th className="px-4 py-2 text-left">Product</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Refund</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedReturn.items.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">
                                <div className="font-bold text-slate-800">{item.product_name}</div>
                                <div className="text-[10px] text-slate-500">
                                  {item.quantity} x ৳{item.price_at_return?.toFixed(2)} = ৳{(item.price_at_return * item.quantity).toFixed(2)}
                                </div>
                                {item.discount_amount > 0 && <div className="text-[10px] text-rose-500">Discount: -৳{item.discount_amount.toFixed(2)}</div>}
                                {item.vat_amount > 0 && <div className="text-[10px] text-emerald-500">VAT: +৳{item.vat_amount.toFixed(2)}</div>}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                              <td className="px-4 py-2 text-right font-bold text-rose-600">
                                ৳{((item.price_at_return * item.quantity) - (item.discount_amount || 0) + (item.vat_amount || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedReturn.reason && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-amber-800 text-xs font-bold uppercase mb-1">Reason</p>
                      <p className="text-amber-700 text-sm italic">"{selectedReturn.reason}"</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                  {isAdmin && selectedReturn.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => handleRejectReturn(selectedReturn.id)}
                        disabled={processingId === selectedReturn.id}
                        className="flex-1 px-6 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingId === selectedReturn.id ? 'Processing...' : 'Reject'}
                      </button>
                      <button 
                        onClick={() => handleApproveReturn(selectedReturn.id)}
                        disabled={processingId === selectedReturn.id}
                        className="flex-1 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingId === selectedReturn.id ? 'Processing...' : 'Approve'}
                      </button>
                    </>
                  )}
                  {selectedReturn.status === 'Approved' && (
                    <button 
                      onClick={() => handlePrintReturn(selectedReturn)}
                      className="flex-1 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      <Printer size={18} />
                      Print Receipt
                    </button>
                  )}
                  <button 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Sale Returns History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleReturnsHistory.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">#{r.sale_id}</td>
                      <td className="px-6 py-4 text-slate-700">{r.customer_name || 'Walk-in'}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">৳{r.refund_amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4"><span className="capitalize px-2 py-1 bg-slate-100 rounded text-slate-600 text-xs">{r.refund_method}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.staff_name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin && r.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleApproveReturn(r.id)}
                                disabled={processingId === r.id}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button 
                                onClick={() => handleRejectReturn(r.id)}
                                disabled={processingId === r.id}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <AlertCircle size={18} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleViewMemo(r.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Memo"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={() => handleViewReturnDetails(r.id)}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {saleReturnsHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">No customer returns found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Supplier Returns History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Refund</th>
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierReturnsHistory.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{r.product_name}</td>
                      <td className="px-6 py-4 text-slate-700">{r.supplier_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-center font-bold text-rose-600">-{r.quantity}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">৳{r.refund_amount?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.staff_name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 uppercase">{r.location_name || 'Main STORE'}</td>
                    </tr>
                  ))}
                  {supplierReturnsHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">No supplier returns found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Memo Modal */}
          {isMemoModalOpen && selectedReturn && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold">Return Receipt</h2>
                  <button onClick={() => setIsMemoModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                </div>
                
                <div id="return-memo-preview-area" className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-tight text-black">
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold uppercase">{settings?.shop_name || 'NEXUS POS PRO'}</h1>
                    <p>{settings?.address || 'Business Address'}</p>
                    <p>Tel: {settings?.phone || 'Contact Number'}</p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 py-4 space-y-1">
                    <p>Return #: {String(selectedReturn.id).padStart(4, '0')}</p>
                    <p>Orig. Sale: #{String(selectedReturn.sale_id).padStart(4, '0')}</p>
                    <p>Date: {new Date(selectedReturn.created_at).toLocaleString()}</p>
                    <p>Staff: {selectedReturn.staff_name}</p>
                    <p>Customer: {selectedReturn.customer_name || 'Walk-in'}</p>
                    {selectedReturn.customer_code && <p>Customer ID: {selectedReturn.customer_code}</p>}
                    {selectedReturn.location_name && <p>Location: {selectedReturn.location_name}</p>}
                  </div>
                  <div className="border-t border-dashed border-slate-300 py-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left font-bold border-b border-dashed border-slate-200">
                          <th className="pb-2">Item</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Refund</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-1">
                              <div className="font-bold">{item.product_name}</div>
                              <div className="text-[10px] text-slate-500 whitespace-nowrap">
                                {item.quantity} x ৳{item.price_at_return?.toFixed(2)} = ৳{(item.price_at_return * item.quantity).toFixed(2)}
                              </div>
                              {item.discount_amount > 0 && (
                                <div className="text-[10px] text-rose-500 italic">
                                  Discount: -৳{item.discount_amount.toFixed(2)}
                                </div>
                              )}
                              {item.vat_amount > 0 && (
                                <div className="text-[10px] text-indigo-500 italic">
                                  VAT: +৳{item.vat_amount.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="py-1 text-center font-bold">{item.quantity}</td>
                            <td className="py-1 text-right font-bold">
                              ৳{((item.price_at_return * item.quantity) - (item.discount_amount || 0) + (item.vat_amount || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-dashed border-slate-300 py-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Original Total</span>
                      <span>৳{selectedReturn.items.reduce((acc: number, i: any) => acc + (i.price_at_return * i.quantity), 0).toFixed(2)}</span>
                    </div>
                    {selectedReturn.items.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0) > 0 && (
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Discount Amount</span>
                        <span>-৳{selectedReturn.items.reduce((acc: number, i: any) => acc + (i.discount_amount || 0), 0).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedReturn.items.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0) > 0 && (
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>VAT</span>
                        <span>+৳{selectedReturn.items.reduce((acc: number, i: any) => acc + (i.vat_amount || 0), 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-slate-300">
                      <span>TOTAL REFUND</span>
                      <span>৳{selectedReturn.refund_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                      <span>Method:</span>
                      <span className="capitalize font-bold">{selectedReturn.refund_method?.replace('_', ' ')}</span>
                    </div>
                    {selectedReturn.reason && (
                      <div className="text-xs pt-2 italic text-slate-500 border-t border-dashed border-slate-200">
                        Reason: {selectedReturn.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-8 space-y-1">
                    <p className="font-bold">THANK YOU FOR YOUR VISIT!</p>
                    <p className="text-[10px] text-slate-400">Generated by Feha Moon Collection</p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={handlePrintMemo}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                  >
                    <Printer size={20} />
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
