import { getSession } from '@/utils/session';
import { getPaymentReferences } from '@/utils/db';
import Navigation from '@/components/Navigation';
import PaymentsAdminClient from './PaymentsAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminPaymentsPage() {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS')) {
    redirect('/login');
  }

  // Fetch payment references submitted by customers
  const paymentReferences = await getPaymentReferences();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verify Customer Payments</h1>
          <p className="text-slate-500 text-xs mt-1">Review bank transfers UTRs or UPI screenshot proofs, verify payments, and reconcile accounts ledger credits.</p>
        </div>

        {/* Client side interactive verification console */}
        <PaymentsAdminClient paymentReferences={paymentReferences} />
      </main>
    </div>
  );
}
