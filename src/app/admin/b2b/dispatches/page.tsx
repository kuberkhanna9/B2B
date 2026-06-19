import { getSession } from '@/utils/session';
import { getSalesOrders, getDispatches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import DispatchesAdminClient from './DispatchesAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminDispatchesPage() {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'INVENTORY_DEPARTMENT')) {
    redirect('/login');
  }

  // Fetch approved/partially fulfilled sales orders that are waiting for shipment
  const orders = await getSalesOrders();
  const activeOrders = orders.filter((o: any) => o.status === 'APPROVED' || o.status === 'PARTIALLY_FULFILLED');

  // Fetch all dispatches history
  const dispatches = await getDispatches();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fulfillment Dispatches</h1>
          <p className="text-slate-500 text-xs mt-1">Generate shipping dispatches, link courier tracking numbers, and post SALE transactions to the warehouse ledger.</p>
        </div>

        {/* Client side interactive dispatches registry console */}
        <DispatchesAdminClient 
          activeOrders={activeOrders} 
          dispatches={dispatches} 
        />
      </main>
    </div>
  );
}
