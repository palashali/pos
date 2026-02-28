import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Calendar, Tag, FileText, X, Search, Filter, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filters, setFilters] = useState({
    date: '',
    month: '',
    category: '',
    description: ''
  });
  const [newExpense, setNewExpense] = useState({
    category: 'Others',
    amount: '',
    description: '',
    month: '',
    date: new Date().toISOString().split('T')[0],
    worker_id: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchExpenses();
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/workers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      setWorkers(await response.json());
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      setExpenses(await response.json());
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` 
        },
        body: JSON.stringify(newExpense)
      });
      if (response.ok) {
        setIsModalOpen(false);
        setSelectedMonth('');
        setNewExpense({
          category: 'Others',
          amount: '',
          description: '',
          month: '',
          date: new Date().toISOString().split('T')[0],
          worker_id: ''
        });
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const totalExpenses = expenses.reduce((acc, curr: any) => acc + curr.amount, 0);

  const filteredExpenses = expenses.filter((expense: any) => {
    const matchesDate = !filters.date || expense.date === filters.date;
    const matchesMonth = !filters.month || expense.month === filters.month;
    const matchesCategory = !filters.category || expense.category === filters.category;
    const matchesDescription = !filters.description || 
      expense.description?.toLowerCase().includes(filters.description.toLowerCase());
    return matchesDate && matchesMonth && matchesCategory && matchesDescription;
  });

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Shop Expenses Report', 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      const tableColumn = ["Date", "Month", "Category", "Description", "Amount"];
      const tableRows = filteredExpenses.map((expense: any) => [
        expense.date,
        expense.month || '-',
        expense.category,
        expense.description || '-',
        `TK ${expense.amount.toFixed(2)}`
      ]);

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        margin: { top: 40 },
      });

      const total = filteredExpenses.reduce((acc, curr: any) => acc + curr.amount, 0);
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Expenses: TK ${total.toFixed(2)}`, 14, finalY + 15);
      
      doc.save(`expenses_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) return <div>Loading expenses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Shop Expenses</h1>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors font-bold"
          >
            <Download size={20} />
            Export PDF
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-bold"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium">Total Expenses</h3>
          <p className="text-3xl font-black text-rose-600 mt-1">৳{totalExpenses.toFixed(2)}</p>
        </div>
        
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium mb-4 flex items-center gap-2">
            <Filter size={16} />
            Filter Expenses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="date"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm appearance-none"
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              >
                <option value="">All Months</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm appearance-none"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                <option value="Salary">Worker Salary</option>
                <option value="Rent">Shop Rent</option>
                <option value="Electricity">Electricity Bill</option>
                <option value="Internet">Internet Bill</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search description..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                value={filters.description}
                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
              />
            </div>
          </div>
          {(filters.date || filters.month || filters.category || filters.description) && (
            <button 
              onClick={() => setFilters({ date: '', month: '', category: '', description: '' })}
              className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((expense: any) => (
              <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-600">{expense.date}</td>
                <td className="px-6 py-4 text-slate-600 font-medium">{expense.month || '-'}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{expense.description || '-'}</td>
                <td className="px-6 py-4 font-bold text-rose-600">৳{expense.amount.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(expense.id)} className="text-slate-300 hover:text-rose-500">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  No expenses found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Expense</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newExpense.category}
                  onChange={(e) => {
                    setNewExpense({ 
                      ...newExpense, 
                      category: e.target.value,
                      worker_id: '',
                      description: ''
                    });
                    setSelectedMonth('');
                  }}
                >
                  <option value="Salary">Worker Salary</option>
                  <option value="Rent">Shop Rent</option>
                  <option value="Electricity">Electricity Bill</option>
                  <option value="Internet">Internet Bill</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {['Rent', 'Electricity', 'Internet', 'Salary'].includes(newExpense.category) && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Select Month</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={selectedMonth}
                    onChange={(e) => {
                      const month = e.target.value;
                      setSelectedMonth(month);
                      
                      let desc = '';
                      if (newExpense.category === 'Salary') {
                        const worker = workers.find((w: any) => w.id === Number(newExpense.worker_id));
                        desc = worker ? `Salary for ${worker.name} (${month})` : `Salary for ${month}`;
                      } else {
                        desc = `${newExpense.category} for ${month}`;
                      }
                      
                      setNewExpense({ 
                        ...newExpense, 
                        month: month,
                        description: desc
                      });
                    }}
                    required
                  >
                    <option value="">-- Select Month --</option>
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              )}

              {newExpense.category === 'Salary' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Select Worker</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={newExpense.worker_id}
                    onChange={(e) => {
                      const workerId = e.target.value;
                      const worker = workers.find((w: any) => w.id === Number(workerId));
                      
                      let desc = '';
                      if (selectedMonth) {
                        desc = worker ? `Salary for ${worker.name} (${selectedMonth})` : `Salary for ${selectedMonth}`;
                      } else {
                        desc = worker ? `Salary for ${worker.name}` : '';
                      }

                      setNewExpense({ 
                        ...newExpense, 
                        worker_id: workerId,
                        description: desc
                      });
                    }}
                    required
                  >
                    <option value="">-- Select Worker --</option>
                    {workers.map((worker: any) => (
                      <option key={worker.id} value={worker.id}>{worker.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Amount (TK)</label>
                <input 
                  type="number" 
                  required 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input 
                  type="date" 
                  required 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 h-24"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
