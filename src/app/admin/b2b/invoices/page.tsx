import { getSession } from '@/utils/session';
import { getInvoices, getSalesOrders } from '@/utils/db';
import Navigation from '@/components/Navigation';
import InvoicesAdminClient from './InvoicesAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminInvoicesPage() {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS')) {
    redirect('/login');
  }

  // Fetch invoices history
  const invoices = await getInvoices();

  // Fetch approved/partially fulfilled sales orders to link to new invoices
  const orders = await getSalesOrders();
  const activeOrders = orders.filter((o: any) => o.status === 'APPROVED' || o.status === 'PARTIALLY_FULFILLED' || o.status === 'DISPATCHED');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Billing</h1>
          <p className="text-slate-500 text-xs mt-1">Issue official invoices against sales orders, upload signed PDF billing documents, and post debit balances to customer accounts ledger.</p>
        </div>

        {/* Client side interactive invoices console */}
        <InvoicesAdminClient 
          invoices={invoices} 
          activeOrders={activeOrders} 
        />
      </main>
    </div>
  );
}
