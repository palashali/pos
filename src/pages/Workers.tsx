import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, Mail, User as UserIcon, X, AlertCircle, Edit, Camera } from 'lucide-react';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/workers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch workers');
      setWorkers(await response.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingWorker(null);
    setPreviewImage(null);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (worker: any) => {
    setEditingWorker(worker);
    setPreviewImage(worker.image_url);
    setError('');
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.target);
    const data: any = Object.fromEntries(formData.entries());
    
    if (previewImage) {
      data.image_url = previewImage;
    }

    try {
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` 
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchWorkers();
      } else {
        const errData = await response.json();
        setError(errData.message || 'Operation failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this worker?')) return;
    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
      });
      if (response.ok) {
        fetchWorkers();
      } else {
        const errData = await response.json();
        alert(errData.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading workers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Worker Management</h1>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={20} />
          Add New Worker
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker: any) => (
          <div key={worker.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-slate-50">
                {worker.image_url ? (
                  <img src={worker.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  worker.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{worker.name}</h3>
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                  <Shield size={12} className={worker.role === 'admin' ? 'text-rose-500' : 'text-emerald-500'} />
                  <span className={worker.role === 'admin' ? 'text-rose-500' : 'text-emerald-500'}>{worker.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(worker)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(worker.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400" />
                {worker.email}
              </div>
              <div className="text-xs text-slate-400">
                Joined on {new Date(worker.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input name="name" defaultValue={editingWorker?.name} required className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input name="email" type="email" defaultValue={editingWorker?.email} required className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-slate-400" />
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer text-center">
                      Choose Photo
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Password {editingWorker && '(Leave blank to keep current)'}</label>
                <input name="password" type="password" required={!editingWorker} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <select name="role" defaultValue={editingWorker?.role || 'staff'} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="staff">Staff (Limited Access)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">
                  {editingWorker ? 'Update Worker' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
