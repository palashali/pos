import React, { useState, useEffect } from 'react';
import { Search, Printer, Eye, X, Calendar, Filter } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, []);

  const fetchSales = async () => {
    try {
      const data = await apiFetch('/api/sales');
      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchSaleDetails = async (id: number) => {
    try {
      const data = await apiFetch(`/api/sales/${id}`);
      setSelectedSale(data);
    } catch (error) {
      console.error('Error fetching sale details:', error);
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

  const filteredSales = sales.filter((s: any) => 
    s.id.toString().includes(searchTerm) ||
    (s.customer_name || 'Walk-in').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading sales history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                      onClick={() => fetchSaleDetails(sale.id)}
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
            
            <div id="receipt-print-area" className="flex-1 overflow-y-auto p-8 font-mono text-sm">
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
                    {selectedSale.items.map((item: any) => (
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
                  <span>৳{selectedSale.total_amount.toFixed(2)}</span>
                </div>
                {selectedSale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>৳{selectedSale.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-৳{selectedSale.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-slate-300">
                  <span>TOTAL</span>
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
