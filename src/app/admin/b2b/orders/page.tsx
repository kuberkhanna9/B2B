import { getSession } from '@/utils/session';
import { getSalesOrders, getB2BCatalog } from '@/utils/db';
import Navigation from '@/components/Navigation';
import OrdersAdminClient from './OrdersAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'INVENTORY_DEPARTMENT' && user.role !== 'INVENTORY' && user.role !== 'ACCOUNTS_DEPARTMENT' && user.role !== 'ACCOUNTS')) {
    redirect('/login');
  }

  // Fetch all orders
  const orders = await getSalesOrders();
  
  // Fetch variants for SKU replacements
  const catalog = await getB2BCatalog();
  const variants = catalog.flatMap((prod: any) => 
    prod.variants.map((v: any) => ({
      variantId: v.variantId,
      sku: v.sku,
      productName: prod.productName,
      colorName: v.colorName,
      sizeName: v.sizeName,
      availableStock: v.availableStock
    }))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Order Approvals</h1>
          <p className="text-slate-500 text-xs mt-1">Review customer sales orders, adjust quantities, approve items, and reserve inventory stock.</p>
        </div>

        {/* Client side interactive orders list & approval interface */}
        <OrdersAdminClient orders={orders} variants={variants} />
      </main>
    </div>
  );
}
