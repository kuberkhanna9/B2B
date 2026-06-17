import { getSession } from '@/utils/session';
import { getCustomers, getCustomerBranches, getB2BCatalog } from '@/utils/db';
import Navigation from '@/components/Navigation';
import CreateOrderOnBehalfClient from './CreateOrderAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CreateOrderOnBehalfPage() {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    redirect('/login');
  }

  const customers = await getCustomers();
  const branches = await getCustomerBranches();
  const catalog = await getB2BCatalog();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Order on Behalf of Customer</h1>
          <p className="text-slate-500 text-xs mt-1">
            Place sales orders manually for customers ordering via WhatsApp, Phone call, or Email. Adjust SKU quantities, specify custom designs, and select tracking source.
          </p>
        </div>

        <CreateOrderOnBehalfClient 
          customers={customers}
          branches={branches}
          initialCatalog={catalog}
        />
      </main>
    </div>
  );
}
