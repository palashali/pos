import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Store, Percent, MapPin, Phone, Camera } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Settings({ user }: any) {
  const [settings, setSettings] = useState({
    shop_name: '',
    vat_enabled: true,
    vat_percentage: 10,
    discount_type: 'fixed',
    address: '',
    phone: ''
  });
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    image_url: user?.image_url || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      setSettings({
        ...data,
        vat_enabled: data.vat_enabled === 1,
        discount_type: data.discount_type || 'fixed'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      window.dispatchEvent(new Event('shop_settings_updated'));
      alert('Settings updated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/workers/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      alert('Profile updated successfully! Please log in again to see changes.');
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="text-indigo-600" />
          {isAdmin ? 'System Settings' : 'My Profile'}
        </h1>
      </div>

      <div className="space-y-8">
        {/* Profile Settings - Visible to everyone */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-indigo-600" />
            Personal Information
          </h2>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <input 
                  type="email"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {profile.image_url ? (
                      <img src={profile.image_url} alt="Preview" className="w-full h-full object-cover" />
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
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">New Password (Optional)</label>
                <input 
                  type="password"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={profile.password}
                  onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
              >
                <Save size={18} />
                Update Profile
              </button>
            </div>
          </form>
        </div>

        {isAdmin && (
          <>
            <form onSubmit={handleSettingsSubmit} className="space-y-8">
              {/* Shop Information */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Store size={20} className="text-indigo-600" />
                  Shop Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Shop Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={settings.shop_name}
                      onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Phone Number</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={settings.phone || ''}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Address</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 h-24"
                      value={settings.address || ''}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Tax Settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Percent size={20} className="text-indigo-600" />
                  Tax & VAT Configuration
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900">Enable VAT Calculation</p>
                      <p className="text-sm text-slate-500">Automatically add VAT to all transactions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={settings.vat_enabled}
                        onChange={(e) => setSettings({ ...settings, vat_enabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {settings.vat_enabled && (
                    <div className="space-y-2 max-w-xs">
                      <label className="text-sm font-bold text-slate-700">VAT Percentage (%)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.1"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={settings.vat_percentage}
                          onChange={(e) => setSettings({ ...settings, vat_percentage: Number(e.target.value) })}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-sm font-bold text-slate-700 block mb-3">Default Discount Type</label>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, discount_type: 'fixed' })}
                        className={`flex-1 py-3 rounded-xl border font-bold transition-all ${settings.discount_type === 'fixed' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        Fixed Amount (TK)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSettings({ ...settings, discount_type: 'percentage' })}
                        className={`flex-1 py-3 rounded-xl border font-bold transition-all ${settings.discount_type === 'percentage' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        Percentage (%)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
