import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Truck,
  ShoppingCart,
  Users,
  Package,
  Wrench,
  DollarSign,
  BarChart3,
  Settings,
  Smartphone,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'OFFICE', 'SERVICE_MANAGER'] },
    { name: 'Sales & Invoices', path: '/sales', icon: FileText, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Delivery Challans', path: '/delivery-challans', icon: Truck, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Quotations', path: '/quotations', icon: Layers, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Parties (Customers/Suppliers)', path: '/parties', icon: Users, roles: ['ADMIN', 'OFFICE', 'SERVICE_MANAGER'] },
    { name: 'Inventory & BOM', path: '/inventory', icon: Package, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Machines & Services', path: '/services', icon: Wrench, roles: ['ADMIN', 'OFFICE', 'SERVICE_MANAGER'] },
    { name: 'Technician Mobile View', path: '/mobile-tech', icon: Smartphone, roles: ['ADMIN', 'SERVICE_MANAGER', 'SERVICE_TECHNICIAN'] },
    { name: 'Accounting & Expenses', path: '/accounting', icon: DollarSign, roles: ['ADMIN', 'OFFICE'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'OFFICE', 'SERVICE_MANAGER'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col no-print border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xl text-white shadow">
          SAM
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-white">Smart Agro Machinerys</h1>
          <span className="text-xs text-emerald-400 font-medium">Business Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-sm">
            {user?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 font-mono capitalize">{user?.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
