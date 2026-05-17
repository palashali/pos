import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, CheckCircle, XCircle, Clock, Package, User, FileText, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [newAdjustment, setNewAdjustment] = useState({
    product_id: '',
    type: 'Manual correction',
    quantity: '',
    reason: '',
    location_id: ''
  });

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadAdjustments();
    loadProducts();
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await apiFetch('/api/locations');
      setLocations(data);
      if (data.length > 0) {
        setNewAdjustment(prev => ({ ...prev, location_id: data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadAdjustments = async () => {
    try {
      const data = await apiFetch('/api/stock-adjustments');
      setAdjustments(data);
    } catch (error) {
      console.error('Error loading adjustments:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/stock-adjustments', {
        method: 'POST',
        body: JSON.stringify({
          ...newAdjustment,
          product_id: Number(newAdjustment.product_id),
          quantity: Number(newAdjustment.quantity),
          location_id: newAdjustment.location_id ? Number(newAdjustment.location_id) : null
        })
      });
      alert(res.message);
      setIsModalOpen(false);
      setNewAdjustment({ 
        product_id: '', 
        type: 'Manual correction', 
        quantity: '', 
        reason: '',
        location_id: locations.length > 0 ? locations[0].id.toString() : ''
      });
      loadAdjustments();
    } catch (error: any) {
      alert(error.message || 'Failed to record adjustment');
    }
  };

  const handleApprove = async (id: number, action: 'Approved' | 'Rejected') => {
    try {
      await apiFetch(`/api/stock-adjustments/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      loadAdjustments();
    } catch (error: any) {
      alert(error.message || 'Failed to update adjustment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold uppercase"><CheckCircle size={14}/> Approved</span>;
      case 'Rejected': return <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-full text-xs font-bold uppercase"><XCircle size={14}/> Rejected</span>;
      default: return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold uppercase"><Clock size={14}/> Pending Approval</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Stock Adjustments</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Create Adjustment
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Adjustment Logs</h2>
            <div className="text-xs text-slate-500 italic">
              Note: Staff adjustments require admin approval.
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Change</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Staff</th>
                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adjustments.map((sa: any) => (
                <tr key={sa.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(sa.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{sa.product_name}</div>
                    <div className="text-xs text-slate-500">{sa.reason}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sa.location_name || 'Main STORE'}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm uppercase tracking-wider">{sa.type}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${sa.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {sa.quantity >= 0 ? '+' : ''}{sa.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(sa.status)}
                    {sa.approver_name && (
                      <div className="text-[10px] text-slate-400 mt-1 uppercase">By: {sa.approver_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sa.staff_name}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      {sa.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(sa.id, 'Approved')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleApprove(sa.id, 'Rejected')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">New Stock Adjustment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Product</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newAdjustment.product_id}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, product_id: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Current: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Adjustment Type</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newAdjustment.type}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, type: e.target.value })}
                >
                  <option value="Damage">Damage</option>
                  <option value="Expired">Expired</option>
                  <option value="Theft/Loss">Theft/Loss</option>
                  <option value="Manual correction">Manual correction</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Location</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newAdjustment.location_id}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, location_id: e.target.value })}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Quantity Change</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. -5 to reduce, 10 to add"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  value={newAdjustment.quantity}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, quantity: e.target.value })}
                />
                <p className="text-xs text-slate-500">Staff adjustments require admin approval.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Reason</label>
                <textarea 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 h-24"
                  value={newAdjustment.reason}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })}
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                Submit Adjustment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
