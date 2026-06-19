import { getSession } from '@/utils/session';
import { getInvoices } from '@/utils/db';
import Navigation from '@/components/Navigation';
import InvoicesClient from './InvoicesClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerInvoicesPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch invoices for this customer
  const invoices = await getInvoices(user.customerId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Invoices</h1>
          <p className="text-slate-500 text-xs mt-1">Review accounts statements, pending payments, due dates, and download PDF invoices.</p>
        </div>

        {/* Client side interactive invoices search & table */}
        <InvoicesClient invoices={invoices} />
      </main>
    </div>
  );
}
