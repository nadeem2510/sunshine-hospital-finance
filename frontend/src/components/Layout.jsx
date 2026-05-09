import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, DollarSign, ShoppingCart, BookOpen, LogOut, Sun, Menu, X, TrendingDown } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'advances', label: 'Advances', icon: TrendingDown },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'vendors', label: 'Vendors', icon: ShoppingCart },
  { id: 'accounts', label: 'Accounts', icon: BookOpen, adminOnly: true },
];

export default function Layout({ tab, setTab, children }) {
  const { user, logout, isAdmin } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);

  const navItems = NAV.filter(n => !n.adminOnly || isAdmin);

  const NavItem = ({ item }) => (
    <button
      onClick={() => { setTab(item.id); setSideOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        tab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <item.icon size={20} />
      {item.label}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Sun size={22} className="text-yellow-900" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Sunshine Hospital</p>
            <p className="text-xs text-gray-500">Finance Manager</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => <NavItem key={item.id} item={item} />)}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-semibold text-gray-900">{user.username}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sideOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSideOpen(false)} />
          <aside className="relative w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <Sun size={22} className="text-yellow-900" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Sunshine Hospital</p>
                  <p className="text-xs text-gray-500">Finance Manager</p>
                </div>
              </div>
              <button onClick={() => setSideOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(item => <NavItem key={item.id} item={item} />)}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 md:px-6">
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSideOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 capitalize">{tab}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium capitalize">{user.role}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
