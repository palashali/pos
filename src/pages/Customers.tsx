import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Mail, MapPin, History, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await apiFetch('/api/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchHistory = async (customerId: number) => {
    try {
      const data = await apiFetch(`/api/customers/${customerId}/history`);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert(error.message || 'Failed to save customer');
    }
  };

  const filteredCustomers = customers.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={20} />
          New Customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search customers by name or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCustomers.map((customer: any) => (
              <div 
                key={customer.id} 
                className={`bg-white p-6 rounded-2xl border transition-all cursor-pointer ${selectedCustomer?.id === customer.id ? 'border-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-100 hover:border-indigo-200'}`}
                onClick={() => { setSelectedCustomer(customer); fetchHistory(customer.id); }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{customer.name}</h3>
                    <p className="text-xs text-slate-500">Member since {new Date(customer.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} /> {customer.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} /> {customer.email || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Details & History */}
        <div className="space-y-6">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-6">
              <div className="p-6 bg-indigo-600 text-white">
                <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                <p className="text-indigo-100 text-sm">Customer Profile</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-slate-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
                      <p className="text-sm text-slate-600">{selectedCustomer.address || 'No address provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <History size={18} className="text-indigo-600" />
                    Purchase History
                  </h4>
                  <div className="space-y-3">
                    {history.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No transactions found</p>
                    ) : (
                      history.map((sale: any) => (
                        <div key={sale.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500">Sale #{String(sale.id).padStart(4, '0')}</span>
                            <span className="text-sm font-bold text-indigo-600">৳{sale.final_amount.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
              <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select a customer to view details and history</p>
            </div>
          )}
        </div>
      </div>

      {/* New Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Customer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input name="name" required className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input name="email" type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <input name="phone" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <textarea name="address" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 h-24" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
