import React, { useState, useEffect } from 'react';
import { Search, Printer, Eye, X, Calendar, Filter, Users } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    loadSales();
    loadSettings();
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await apiFetch('/api/workers');
      setWorkers(data);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadSales = async () => {
    try {
      const data = await apiFetch('/api/sales');
      setSales(data);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
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

  const loadSaleDetails = async (id: number) => {
    try {
      const data = await apiFetch(`/api/sales/${id}`);
      setSelectedSale(data);
    } catch (error) {
      console.error('Error loading sale details:', error);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-print-area');
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

  const filteredSales = sales.filter((s: any) => {
    const matchesSearch = s.id.toString().includes(searchTerm) ||
      (s.customer_name || 'Walk-in').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const matchesStaff = filterStaff === 'all' || s.user_id.toString() === filterStaff;
    if (!matchesStaff) return false;

    if (filterPeriod === 'all') return true;

    const saleDate = new Date(s.created_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    if (filterPeriod === 'today') {
      return saleDate >= today;
    } else if (filterPeriod === 'yesterday') {
      return saleDate >= yesterday && saleDate < today;
    } else if (filterPeriod === '7days') {
      return saleDate >= last7Days;
    } else if (filterPeriod === 'custom' && customDate) {
      const selected = new Date(customDate);
      const nextDay = new Date(selected);
      nextDay.setDate(nextDay.getDate() + 1);
      return saleDate >= selected && saleDate < nextDay;
    }

    return true;
  });

  if (loading) return <div>Loading sales history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={20} className="text-slate-400" />
          <select 
            className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="custom">Custom Date</option>
          </select>
          {filterPeriod === 'custom' && (
            <input 
              type="date" 
              className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Users size={20} className="text-slate-400" />
          <select 
            className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
          >
            <option value="all">All Staff</option>
            {workers.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Staff</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-indigo-600">#{String(sale.id).padStart(4, '0')}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-900">{sale.customer_name || 'Walk-in'}</td>
                  <td className="px-6 py-4 text-slate-600">{sale.staff_name}</td>
                  <td className="px-6 py-4 font-black">৳{sale.final_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => loadSaleDetails(sale.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View & Print"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold">Sale Details</h2>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400"><X size={20} /></button>
            </div>
            
            <div id="receipt-print-area" className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-tight text-black">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase">{settings?.shop_name || 'NEXUS POS PRO'}</h1>
                <p>{settings?.address || '123 Business Street, Tech City'}</p>
                <p>Tel: {settings?.phone || '+1 234 567 890'}</p>
              </div>
              <div className="border-t border-dashed border-slate-300 py-4 space-y-1">
                <p>Receipt #: {String(selectedSale.id).padStart(4, '0')}</p>
                <p>Date: {new Date(selectedSale.created_at).toLocaleString()}</p>
                <p>Staff: {selectedSale.staff_name}</p>
                <p>Customer: {selectedSale.customer_name || 'Walk-in'}</p>
                {selectedSale.customer_code && <p>Customer ID: {selectedSale.customer_code}</p>}
                {selectedSale.customer_phone && <p>Phone: {selectedSale.customer_phone}</p>}
              </div>
              <div className="border-t border-dashed border-slate-300 py-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left font-bold border-b border-dashed border-slate-200">
                      <th className="pb-2">Item</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-1">
                          <div className="font-bold">{item.product_name}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.quantity} x ৳{(item.unit_price || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-1 text-center font-bold">{item.quantity}</td>
                        <td className="py-1 text-right font-bold">৳{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-dashed border-slate-300 py-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Original Total</span>
                  <span>৳{selectedSale.total_amount.toFixed(2)}</span>
                </div>
                {selectedSale.tax > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>VAT Amount</span>
                    <span>৳{selectedSale.tax.toFixed(2)}</span>
                  </div>
                )}
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Discount Amount</span>
                    <span>-৳{selectedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-slate-300">
                  <span>TOTAL SALES</span>
                  <span>৳{selectedSale.final_amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-center mt-8 space-y-1">
                <p>Payment: {selectedSale.payment_method.toUpperCase()}</p>
                <p className="font-bold">THANK YOU FOR YOUR VISIT!</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold"
              >
                <Printer size={20} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
