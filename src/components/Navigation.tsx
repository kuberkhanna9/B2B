'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Layers, 
  Receipt, 
  Bell, 
  Users, 
  Ship, 
  CreditCard,
  Menu, 
  X, 
  ShieldAlert, 
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { logoutAction } from '@/app/actions';

interface NavigationProps {
  user: {
    fullName: string;
    role: 'SUPERADMIN' | 'ACCOUNTS' | 'INVENTORY' | 'RETAIL' | 'B2B_CUSTOMER';
  };
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isB2BCustomer = user.role === 'B2B_CUSTOMER';

  // Navigation Links definition
  const customerLinks = [
    { name: 'My Dashboard', href: '/b2b', icon: LayoutDashboard },
    { name: 'Product Catalogue', href: '/b2b/catalog', icon: Package },
    { name: 'My Orders', href: '/b2b/orders', icon: ShoppingCart },
    { name: 'My Invoices', href: '/b2b/invoices', icon: Receipt },
    { name: 'Ledger Card', href: '/b2b/ledger', icon: Layers },
    { name: 'Documents', href: '/b2b/documents', icon: FileText },
    { name: 'Notifications', href: '/b2b/notifications', icon: Bell },
  ];

  const adminLinks = [
    { name: 'Admin Dashboard', href: '/', icon: LayoutDashboard },
  ];

  if (user.role === 'SUPERADMIN') {
    adminLinks.push({ name: 'Customer Accounts', href: '/admin/b2b/customers', icon: Users });
    adminLinks.push({ name: 'Order Approvals', href: '/admin/b2b/orders', icon: ShoppingCart });
  }

  if (user.role === 'SUPERADMIN' || user.role === 'INVENTORY') {
    adminLinks.push({ name: 'Dispatches & Shipments', href: '/admin/b2b/dispatches', icon: Ship });
  }

  if (user.role === 'SUPERADMIN' || user.role === 'ACCOUNTS') {
    adminLinks.push({ name: 'Invoice Billing', href: '/admin/b2b/invoices', icon: Receipt });
    adminLinks.push({ name: 'Verify Payments', href: '/admin/b2b/payments', icon: CreditCard });
  }

  const activeLinks = isB2BCustomer ? customerLinks : adminLinks;

  return (
    <>
      {/* Top Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        <Link href={isB2BCustomer ? "/b2b" : "/"} className="flex items-center">
          <img src="/logo.png" alt="LJK Logo" className="h-8 object-contain" />
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-500 hover:text-slate-800 focus:outline-none p-1 cursor-pointer"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo and Brand Header */}
        <div>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <Link href={isB2BCustomer ? "/b2b" : "/"} className="flex items-center">
              <img src="/logo.png" alt="LJK Logo" className="h-9 object-contain" />
            </Link>
            <button className="lg:hidden text-slate-400 hover:text-slate-650" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
              {isB2BCustomer ? 'B2B Client Portal' : 'LJK ERP System'}
            </span>
          </div>

          {/* Links Nav */}
          <nav className="p-4 space-y-1">
            {activeLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-inner'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-500'} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer and Logout */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Session Active:</span>
            <span className="text-xs font-black text-slate-900 leading-tight truncate">
              {user.role === 'SUPERADMIN' && 'SuperAdmin'}
              {user.role === 'ACCOUNTS' && 'Accounts Department'}
              {user.role === 'INVENTORY' && 'Inventory Department'}
              {user.role === 'RETAIL' && 'Retail Department'}
              {user.role === 'B2B_CUSTOMER' && 'Wholesale Customer'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-extrabold text-xs shrink-0">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-extrabold text-slate-800 truncate leading-tight">{user.fullName}</span>
              <span className="text-[8px] font-bold text-slate-400 truncate leading-none mt-0.5">
                Secure Session
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              await logoutAction();
              window.location.href = '/login';
            }}
            className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-200 hover:border-red-200 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <LogOut size={12} />
            <span>Sign Out</span>
          </button>

          <div className="text-[9px] text-slate-400 text-center flex items-center justify-center gap-1 font-semibold">
            <ShieldAlert size={10} className="text-slate-500" />
            <span>B2B Security Active</span>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-45 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
