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
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
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
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Customer Portal</h1>
            <p className="text-slate-500 text-xs mt-1">Real-time inventory access, orders tracking, and outstanding ledger account balances.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-655 shadow-sm">
            <UserCheck size={12} className="text-slate-500" />
            <span>Authorized: <span className="text-slate-900 font-extrabold uppercase">{user.fullName}</span></span>
          </div>
        </div>

        {/* 1. Overview KPIs */}
        <section className="space-y-4 mb-8">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Account Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Outstanding balance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Amount</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{formatCurrency(outstandingAmount)}</span>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{totalOrders} <span className="text-xs text-slate-450 font-bold">orders</span></span>
            </div>

            {/* Pending orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approval</span>
              <span className={`text-2xl font-black mt-1 block ${pendingOrders > 0 ? 'text-amber-605 animate-pulse' : 'text-slate-900'}`}>
                {pendingOrders} <span className="text-xs font-bold text-slate-450">orders</span>
              </span>
            </div>

            {/* Dispatched orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatched Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{dispatchedOrders} <span className="text-xs text-slate-455 font-bold">orders</span></span>
            </div>

            {/* Return Claims */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Return Claims</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{returns.length} <span className="text-xs text-slate-455 font-bold">claims</span></span>
            </div>
          </div>
        </section>

        {/* Quick link button actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href="/b2b/catalog"
            className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-xs px-6 py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm select-none"
          >
            <ShoppingCart size={14} />
            <span>Browse Catalog & Place Order</span>
          </Link>

          <Link
            href="/b2b/returns"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-6 py-3.5 rounded-xl transition-colors shadow-sm select-none"
          >
            <RotateCcw size={14} className="text-slate-500" />
            <span>Claims & Returns Portal</span>
          </Link>

          <Link
            href="/b2b/ledger"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-6 py-3.5 rounded-xl transition-colors shadow-sm select-none"
          >
            <Layers size={14} className="text-slate-500" />
            <span>View Ledger Statement</span>
          </Link>
        </div>

        {/* 2. Recent Lists */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Invoices */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Invoices</h2>
              <Link href="/b2b/invoices" className="text-[10px] font-bold text-slate-500 hover:text-slate-800">View All →</Link>
            </div>
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No invoices generated yet.</p>
              ) : (
                invoices.slice(0, 5).map((inv: any) => (
                  <div key={inv.id} className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{inv.invoiceNumber}</span>
                        <span className="text-[9px] text-slate-400 font-bold">Order: {inv.orderNumber}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Due Date: {new Date(inv.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{formatCurrency(inv.amount)}</span>
                      <span className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${
                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                        inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 border border-red-150' :
                        'bg-amber-50 text-amber-700 border border-amber-155'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Dispatches */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Dispatches</h2>
              <Link href="/b2b/dispatches" className="text-[10px] font-bold text-slate-500 hover:text-slate-800">View All →</Link>
            </div>
            <div className="space-y-3">
              {dispatches.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No dispatches created yet.</p>
              ) : (
                dispatches.slice(0, 5).map((disp: any) => (
                  <div key={disp.id} className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{disp.dispatchNumber}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{disp.courier} ({disp.trackingNumber})</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Date: {new Date(disp.dispatchDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                        <Ship size={10} />
                        Shipped
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3. New Sections: Branches and Returns */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registered Branches */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={12} />My Branches ({branches.length})</h2>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {branches.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No customer branches registered.</p>
              ) : (
                branches.map((b: any) => (
                  <div key={b.id} className="text-xs py-3 border-b border-slate-100 last:border-0 last:pb-0 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{b.branchName}</span>
                        <span className="bg-slate-100 text-slate-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wide uppercase">{b.branchCode}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 block leading-relaxed max-w-sm">
                        Shipping: {b.shippingAddress || 'Default'}
                      </span>
                    </div>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-emerald-100 bg-emerald-50 text-emerald-700">
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Return Requests */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><RotateCcw size={12} />My Return Claims ({returns.length})</h2>
              <Link href="/b2b/returns" className="text-[10px] font-bold text-slate-500 hover:text-slate-800">View Details →</Link>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {returns.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No return claims registered.</p>
              ) : (
                returns.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="text-xs py-3 border-b border-slate-100 last:border-0 last:pb-0 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{r.returnNumber}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{r.reason.replace('_', ' ')}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Filed: {new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded-md ${
                        r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        r.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {r.status}
                      </span>
                      {r.resolutionType && (
                        <span className="block text-[8px] text-slate-500 font-bold mt-1 uppercase">{r.resolutionType}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
