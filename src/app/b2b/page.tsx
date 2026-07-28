import { getSession } from '@/utils/session';
import { 
  getSalesOrders, 
  getInvoices, 
  getDispatches, 
  getCustomerLedger,
  getReturnRequests,
  getCustomerBranches
} from '@/utils/db';
import Navigation from '@/components/Navigation';
import { 
  ShoppingCart, 
  FileText, 
  Clock, 
  Ship, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck,
  RotateCcw,
  Layers,
  MapPin,
  ListFilter
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerDashboardPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch customer-specific data
  const orders = await getSalesOrders(user.customerId);
  const invoices = await getInvoices(user.customerId);
  const dispatches = await getDispatches(user.customerId);
  const ledger = await getCustomerLedger(user.customerId);
  const returns = await getReturnRequests(user.customerId);
  const branches = await getCustomerBranches(user.customerId);

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING_APPROVAL').length;
  const dispatchedOrders = orders.filter((o: any) => o.status === 'DISPATCHED' || o.status === 'DELIVERED').length;

  // Outstanding balance from latest ledger record
  const outstandingAmount = ledger.length > 0 ? ledger[0].runningBalance : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dealer Portal</h1>
            <p className="text-slate-500 text-xs mt-1">Select an option below to get started.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
            <UserCheck size={14} className="text-slate-500" />
            <span>Authorized: <span className="text-slate-900 font-extrabold uppercase">{user.fullName}</span></span>
          </div>
        </div>

        {/* 6 Primary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1: New Order */}
          <Link
            href="/b2b/catalog"
            className="bg-white border-2 border-slate-900 hover:bg-slate-900 text-slate-900 hover:text-white rounded-2xl p-6 transition-all shadow-sm group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-slate-100 group-hover:bg-slate-800 rounded-xl transition-colors">
                <ShoppingCart size={24} className="text-slate-900 group-hover:text-white" />
              </span>
              <span className="text-xs font-black uppercase px-2 py-1 bg-amber-100 text-amber-800 rounded group-hover:bg-amber-400 group-hover:text-slate-950">Fast Order</span>
            </div>
            <div>
              <h2 className="text-xl font-black mb-1">New Order</h2>
              <p className="text-xs text-slate-500 group-hover:text-slate-300">Quickly search SKUs and create a wholesale sales order sheet.</p>
            </div>
          </Link>

          {/* Card 2: My Orders */}
          <Link
            href="/b2b/orders"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={24} />
              </span>
              <span className="text-xs font-bold text-slate-400">{totalOrders} Total</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">My Orders</h2>
              <p className="text-xs text-slate-500">Track order approvals, pending approvals, and historical orders.</p>
            </div>
          </Link>

          {/* Card 3: Dispatches */}
          <Link
            href="/b2b/dispatches"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Ship size={24} />
              </span>
              <span className="text-xs font-bold text-slate-400">{dispatches.length} Shipped</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Dispatches</h2>
              <p className="text-xs text-slate-500">View courier dispatch details, tracking numbers and dispatched items.</p>
            </div>
          </Link>

          {/* Card 4: Invoices */}
          <Link
            href="/b2b/invoices"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={24} />
              </span>
              <span className="text-xs font-bold text-slate-400">{invoices.length} Bills</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Invoices</h2>
              <p className="text-xs text-slate-500">View tax invoices, amounts, due dates and download invoice PDFs.</p>
            </div>
          </Link>

          {/* Card 5: Payments */}
          <Link
            href="/b2b/payments"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <CheckCircle2 size={24} />
              </span>
              <span className="text-xs font-bold text-red-500">Due: {formatCurrency(outstandingAmount)}</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Payments</h2>
              <p className="text-xs text-slate-500">Upload payment UTR references and track verification status.</p>
            </div>
          </Link>

          {/* Card 6: Returns */}
          <Link
            href="/b2b/returns"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <RotateCcw size={24} />
              </span>
              <span className="text-xs font-bold text-slate-400">{returns.length} Claims</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Returns</h2>
              <p className="text-xs text-slate-500">Submit return requests, damage claims, and track resolutions.</p>
            </div>
          </Link>
        </div>

        {/* Profile / Account Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Profile & Branches</h3>
              <p className="text-xs text-slate-500">{branches.length} Registered Branch(es) associated with your account.</p>
            </div>
          </div>
          <Link
            href="/b2b/users"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Manage Users & Profile
          </Link>
        </div>
      </main>
    </div>
  );
}
