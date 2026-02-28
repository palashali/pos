import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  FileText, 
  TrendingUp, 
  ShoppingBag,
  ArrowRight,
  Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: '',
    staff: '',
    month: '',
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      setSales(await response.json());
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale: any) => {
    const saleDate = new Date(sale.created_at);
    const saleYear = saleDate.getFullYear().toString();
    const saleMonth = (saleDate.getMonth() + 1).toString();
    const saleDateStr = saleDate.toISOString().split('T')[0];

    const matchesDate = (!filters.startDate || saleDateStr >= filters.startDate) &&
                      (!filters.endDate || saleDateStr <= filters.endDate);
    const matchesCustomer = !filters.customer || (sale.customer_name || 'Walk-in').toLowerCase().includes(filters.customer.toLowerCase());
    const matchesStaff = !filters.staff || sale.staff_name.toLowerCase().includes(filters.staff.toLowerCase());
    const matchesYear = !filters.year || saleYear === filters.year;
    const matchesMonth = !filters.month || saleMonth === filters.month;

    return matchesDate && matchesCustomer && matchesStaff && matchesYear && matchesMonth;
  });

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(20);
    doc.text('NexusPOS Pro - Sales Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredSales.map((sale: any) => [
      sale.id,
      new Date(sale.created_at).toLocaleDateString(),
      sale.customer_name || 'Walk-in',
      sale.staff_name,
      sale.payment_method.toUpperCase(),
      `৳${sale.final_amount.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 40,
      head: [['ID', 'Date', 'Customer', 'Staff', 'Payment', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div>Loading reports...</div>;

  const totalRevenue = filteredSales.reduce((acc, curr: any) => acc + curr.final_amount, 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Sales Reports</h1>
        <button 
          onClick={exportToPDF}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download size={20} />
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
          <Filter size={20} className="text-indigo-600" />
          Advanced Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Customer</label>
            <input 
              type="text" 
              placeholder="Search..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Staff</label>
            <input 
              type="text" 
              placeholder="Search..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.staff}
              onChange={(e) => setFilters({ ...filters, staff: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Month</label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <option value="">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Year</label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={() => setFilters({ startDate: '', endDate: '', customer: '', staff: '', month: '', year: new Date().getFullYear().toString() })}
            className="text-indigo-600 text-sm font-bold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-4">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Revenue</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">৳{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-fit mb-4">
            <ShoppingBag size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Orders</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-4">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Average Order</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">৳{avgOrderValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Staff</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-indigo-600">#{sale.id}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(sale.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-900">{sale.customer_name || 'Walk-in'}</td>
                  <td className="px-6 py-4 text-slate-600">{sale.staff_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${sale.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">৳{sale.final_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
