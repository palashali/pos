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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../utils/api';

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: '',
    staff: '',
    month: '',
    year: new Date().getFullYear().toString(),
    type: 'all' // 'all', 'sale', 'return'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, returnsData] = await Promise.all([
        apiFetch('/api/sales'),
        apiFetch('/api/returns/sales')
      ]);
      setSales(salesData);
      setReturns(returnsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSalesData = sales.filter((sale: any) => {
    const saleDate = new Date(sale.created_at);
    const saleYear = saleDate.getFullYear().toString();
    const saleMonth = (saleDate.getMonth() + 1).toString();
    const saleDateStr = saleDate.toISOString().split('T')[0];

    const matchesDate = (!filters.startDate || saleDateStr >= filters.startDate) &&
                      (!filters.endDate || saleDateStr <= filters.endDate);
    const matchesCustomer = !filters.customer || (sale.customer_name || 'Walk-in').toLowerCase().includes(filters.customer.toLowerCase());
    const matchesStaff = !filters.staff || (sale.staff_name || '').toLowerCase().includes(filters.staff.toLowerCase());
    const matchesYear = !filters.year || saleYear === filters.year;
    const matchesMonth = !filters.month || saleMonth === filters.month;

    return matchesDate && matchesCustomer && matchesStaff && matchesYear && matchesMonth;
  });

  const filteredReturnsData = returns.filter((ret: any) => {
    const retDate = new Date(ret.created_at);
    const retYear = retDate.getFullYear().toString();
    const retMonth = (retDate.getMonth() + 1).toString();
    const retDateStr = retDate.toISOString().split('T')[0];

    const matchesDate = (!filters.startDate || retDateStr >= filters.startDate) &&
                      (!filters.endDate || retDateStr <= filters.endDate);
    const matchesCustomer = !filters.customer || (ret.customer_name || 'Walk-in').toLowerCase().includes(filters.customer.toLowerCase());
    const matchesStaff = !filters.staff || (ret.staff_name || '').toLowerCase().includes(filters.staff.toLowerCase());
    const matchesYear = !filters.year || retYear === filters.year;
    const matchesMonth = !filters.month || retMonth === filters.month;

    return matchesDate && matchesCustomer && matchesStaff && matchesYear && matchesMonth;
  });

  const combinedTransactions = [
    ...filteredSalesData.map((s: any) => ({ ...s, type: 'sale' })),
    ...filteredReturnsData.map((r: any) => ({ ...r, type: 'return', final_amount: -r.refund_amount }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayTransactions = filters.type === 'all' 
    ? combinedTransactions 
    : combinedTransactions.filter(t => t.type === filters.type);

  const exportToPDF = () => {
    try {
      const doc = new jsPDF() as any;
      doc.setFontSize(20);
      doc.text('Feha Moon Collection - Reports', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      const tableData = displayTransactions.map((t: any) => [
        t.type === 'sale' ? `#${String(t.id).padStart(4, '0')}` : `R#${String(t.id).padStart(4, '0')}`,
        new Date(t.created_at).toLocaleDateString(),
        t.type.toUpperCase(),
        t.customer_name || 'Walk-in',
        t.staff_name || 'Unknown',
        `৳${t.final_amount?.toFixed(2) || '0.00'}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['ID', 'Date', 'Type', 'Customer', 'Staff', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`reports-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) return <div>Loading reports...</div>;

  const totalSales = filteredSalesData.reduce((acc, curr: any) => acc + curr.final_amount, 0);
  const totalRefunds = filteredReturnsData.reduce((acc, curr: any) => acc + curr.refund_amount, 0);
  const totalRevenue = totalSales - totalRefunds;
  const totalOrders = filteredSalesData.length;
  const totalReturns = filteredReturnsData.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

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
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="all">All Transactions</option>
              <option value="sale">Sales Only</option>
              <option value="return">Returns Only</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={() => setFilters({ startDate: '', endDate: '', customer: '', staff: '', month: '', year: new Date().getFullYear().toString(), type: 'all' })}
            className="text-indigo-600 text-sm font-bold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-4">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Net Revenue</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">৳{totalRevenue.toFixed(2)}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase">
            <span className="text-emerald-500">৳{totalSales.toFixed(2)} Sales</span>
            <span className="text-slate-300">|</span>
            <span className="text-rose-500">৳{totalRefunds.toFixed(2)} Returns</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-100">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-fit mb-4">
            <ShoppingBag size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Total Volume</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalOrders + totalReturns}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase">
            <span className="text-blue-500">{totalOrders} Sales</span>
            <span className="text-slate-300">|</span>
            <span className="text-rose-400">{totalReturns} Returns</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-emerald-100">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-4">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Average Order</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">৳{avgOrderValue.toFixed(2)}</p>
          <div className="mt-2 text-[10px] font-bold uppercase text-slate-400">
            Based on completed sales only
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Staff</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTransactions.map((transaction: any) => (
                <tr key={`${transaction.type}-${transaction.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className={`px-6 py-4 font-bold ${transaction.type === 'sale' ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {transaction.type === 'sale' ? '#' : 'R#'}{String(transaction.id).padStart(4, '0')}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      transaction.type === 'sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-900 text-sm">{transaction.customer_name || 'Walk-in'}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{transaction.staff_name}</td>
                  <td className={`px-6 py-4 text-right font-black ${transaction.type === 'sale' ? 'text-slate-900' : 'text-rose-600'}`}>
                    {transaction.type === 'sale' ? '' : '-' }৳{Math.abs(transaction.final_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
