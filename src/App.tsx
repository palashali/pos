import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  Plus,
  Trash2,
  Edit,
  Printer,
  Download,
  Settings as SettingsIcon,
  User as UserIcon,
  HardHat,
  History,
  Wallet,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Workers from './pages/Workers';
import SalesHistory from './pages/SalesHistory';
import Expenses from './pages/Expenses';
import AddProduct from './pages/AddProduct';
import Login from './pages/Login';

// Components
const SidebarItem = ({ icon: Icon, label, to, active }: any) => (
  <Link 
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const Layout = ({ children, user, onLogout, shopName }: any) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <ShoppingCart size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 truncate">{shopName || 'NexusPOS Pro'}</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" active={location.pathname === '/'} />
            <SidebarItem icon={ShoppingCart} label="POS Screen" to="/pos" active={location.pathname === '/pos'} />
            <SidebarItem icon={Package} label="Inventory" to="/products" active={location.pathname === '/products'} />
            <SidebarItem icon={Plus} label="Add Product" to="/add-product" active={location.pathname === '/add-product'} />
            <SidebarItem icon={Users} label="Customers" to="/customers" active={location.pathname === '/customers'} />
            <SidebarItem icon={History} label="Sales History" to="/sales-history" active={location.pathname === '/sales-history'} />
            {isAdmin && <SidebarItem icon={Wallet} label="Expenses" to="/expenses" active={location.pathname === '/expenses'} />}
            {isAdmin && <SidebarItem icon={BarChart3} label="Reports" to="/reports" active={location.pathname === '/reports'} />}
            <SidebarItem icon={HardHat} label="Workers" to="/workers" active={location.pathname === '/workers'} />
            <SidebarItem icon={SettingsIcon} label="Settings" to="/settings" active={location.pathname === '/settings'} />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button 
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    const token = localStorage.getItem('nexus_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      fetchSettings(token);
    }
    setLoading(false);

    const handleSettingsUpdate = () => {
      const token = localStorage.getItem('nexus_token');
      if (token) fetchSettings(token);
    };

    window.addEventListener('shop_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('shop_settings_updated', handleSettingsUpdate);
  }, []);

  const fetchSettings = async (token: string) => {
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setShopName(data.shop_name);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('nexus_user', JSON.stringify(userData));
    localStorage.setItem('nexus_token', token);
    setUser(userData);
    fetchSettings(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    setUser(null);
    setShopName('');
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const isAdmin = user?.role === 'admin';

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/*" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout} shopName={shopName}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/add-product" element={<AddProduct />} />
                  <Route path="/edit-product/:id" element={isAdmin ? <AddProduct /> : <Navigate to="/products" />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/sales-history" element={<SalesHistory />} />
                  
                  {/* Admin Only Routes */}
                  <Route path="/reports" element={isAdmin ? <Reports /> : <Navigate to="/" />} />
                  <Route path="/expenses" element={isAdmin ? <Expenses /> : <Navigate to="/" />} />
                  <Route path="/workers" element={isAdmin ? <Workers /> : <Navigate to="/" />} />
                  <Route path="/settings" element={<Settings user={user} />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Router>
  );
}
