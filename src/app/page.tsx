import { getSession } from '@/utils/session';
import { getB2BAdminStats } from '@/utils/db';
import Navigation from '@/components/Navigation';
import { 
  Users, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  FileText,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const user = await getSession();
  
  if (!user) {
    redirect('/login');
  }

  // Redirect B2B Customer users to their dedicated portal path
  if (user.role === 'B2B_CUSTOMER') {
    redirect('/b2b');
  }

  const stats = await getB2BAdminStats();

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
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lall Ji B2B Portal Admin Console</h1>
            <p className="text-slate-500 text-xs mt-1">Summary of wholesale customer registrations, orders, outstanding receivables, and payments.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-650 shadow-sm">
            <UserCheck size={12} className="text-slate-500" />
            <span>Profile: <span className="text-slate-900 font-extrabold uppercase">{user.role}</span></span>
          </div>
        </div>

        {/* 1. KPI Cards */}
        <section className="space-y-4 mb-8">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">B2B Core Performance KPIs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Customers */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Customers</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalCustomers}</span>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600"><Users size={16} /></div>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total B2B Orders</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalOrders}</span>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600"><ShoppingCart size={16} /></div>
            </div>

            {/* Pending Approvals */}
            <Link 
              href="/admin/b2b/orders"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
                <span className={`text-2xl font-black mt-1 block ${stats.pendingApprovals > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-900'}`}>
                  {stats.pendingApprovals}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><AlertTriangle size={16} /></div>
            </Link>

            {/* Outstanding Receivables */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Receivables</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{formatCurrency(stats.outstandingReceivables)}</span>
              </div>
              <div className="p-2.5 bg-red-50 text-red-650 rounded-xl"><DollarSign size={16} /></div>
            </div>
          </div>
        </section>

        {/* 2. Top Rankings */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Customers */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Customers (Order Value)</h2>
              <TrendingUp size={14} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              {stats.topCustomers.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No client orders recorded yet.</p>
              ) : (
                stats.topCustomers.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 last:border-0">
                    <span className="font-extrabold text-slate-800">{i+1}. {c.companyName}</span>
                    <span className="font-black text-slate-900">{formatCurrency(c.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Products (Qty Sold)</h2>
              <Package size={14} className="text-slate-400" />
            </div>
            <div className="space-y-3">
              {stats.topProducts.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No approved sales recorded.</p>
              ) : (
                stats.topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 last:border-0">
                    <span className="font-extrabold text-slate-800">{i+1}. {p.name}</span>
                    <span className="font-black text-slate-600">{p.quantity} units</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3. Recent Activities */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Sales Orders</h2>
            <div className="space-y-3">
              {stats.recentOrders.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No order records.</p>
              ) : (
                stats.recentOrders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-start text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{o.orderNumber}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate">{o.companyName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{formatCurrency(o.totalAmount)}</span>
                      <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-md mt-0.5 ${
                        o.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        o.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Payment References</h2>
            <div className="space-y-3">
              {stats.recentPayments.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No payments submitted yet.</p>
              ) : (
                stats.recentPayments.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-start text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700">{p.utrNumber}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate">{p.companyName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(p.paymentDate).toLocaleDateString()} via {p.paymentMode}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{formatCurrency(p.amount)}</span>
                      <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-md mt-0.5 ${
                        p.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
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
