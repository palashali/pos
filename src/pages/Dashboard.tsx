import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { apiFetch } from '../utils/api';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}%
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchStats();
  }, []);

  const isAdmin = user?.role === 'admin';

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <div className="text-sm text-slate-500">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Sales" 
          value={`৳${stats?.todaySales?.toFixed(2)}`} 
          icon={DollarSign} 
          color="bg-indigo-500"
          trend="up"
          trendValue="12.5"
        />
        <StatCard 
          title="Today's Expenses" 
          value={`৳${stats?.todayExpenses?.toFixed(2)}`} 
          icon={ArrowDownRight} 
          color="bg-rose-500"
        />
        <StatCard 
          title="Net Profit (Today)" 
          value={`৳${((stats?.todaySales || 0) - (stats?.todayExpenses || 0)).toFixed(2)}`} 
          icon={TrendingUp} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={stats?.lowStockCount} 
          icon={AlertTriangle} 
          color="bg-amber-500"
        />
        {isAdmin && (
          <StatCard 
            title="Pending Approvals" 
            value={stats?.pendingApprovals} 
            icon={Package} 
            color="bg-indigo-500"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Sales Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlySales}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Sales vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlySales.map((s: any, i: number) => ({
                month: s.month,
                Sales: s.total,
                Expenses: stats.monthlyExpenses[i]?.total || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Popular Products</h3>
          <div className="space-y-4">
            {stats?.popularProducts?.map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-900">{product.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-600">{product.total_sold} sold</span>
              </div>
            ))}
            {(!stats?.popularProducts || stats.popularProducts.length === 0) && (
              <p className="text-slate-500 text-center py-4">No sales data yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Low Stock Alerts</h3>
          <div className="space-y-4">
            {stats?.lowStockItems?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-100">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-rose-500" />
                  <span className="font-medium text-slate-900">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-600">{item.stock} left</span>
                  <span className="text-xs text-slate-500">(Min: {item.low_stock_threshold})</span>
                </div>
              </div>
            ))}
            {(!stats?.lowStockItems || stats.lowStockItems.length === 0) && (
              <p className="text-slate-500 text-center py-4">All products are well stocked.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
