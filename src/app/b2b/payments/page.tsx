import { getSession } from '@/utils/session';
import { getInvoices, getPaymentReferences } from '@/utils/db';
import Navigation from '@/components/Navigation';
import PaymentsClient from './PaymentsClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerPaymentsPage() {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    redirect('/login');
  }

  // Fetch invoices (to select which invoice is being paid) and existing payment references
  const invoices = await getInvoices(user.customerId);
  const paymentReferences = await getPaymentReferences(user.customerId);

  // Filter unpaid or partially paid invoices to show in the dropdown selector
  const activeInvoices = invoices.filter((inv: any) => inv.status !== 'PAID');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">External Payments Registry</h1>
          <p className="text-slate-500 text-xs mt-1">Submit bank transfer UTR numbers or UPI screenshot proofs to clear outstanding invoices. Accounts Dept will verify these references manually.</p>
        </div>

        {/* Client side interactive submission forms and UTR status tracker */}
        <PaymentsClient 
          activeInvoices={activeInvoices} 
          paymentReferences={paymentReferences} 
        />
      </main>
    </div>
  );
}
