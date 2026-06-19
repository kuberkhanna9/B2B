import { getSession } from '@/utils/session';
import { getSalesOrders } from '@/utils/db';
import Navigation from '@/components/Navigation';
import OrdersClient from './OrdersClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerOrdersPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch orders for this customer
  const orders = await getSalesOrders(user.customerId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Sales Orders</h1>
          <p className="text-slate-500 text-xs mt-1">Monitor order fulfillment progress, approval statuses, and quantities ready for dispatch.</p>
        </div>

        {/* Client side interactive orders list & detail viewer */}
        <OrdersClient orders={orders} />
      </main>
    </div>
  );
}
