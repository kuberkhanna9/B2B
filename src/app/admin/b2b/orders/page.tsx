import { getSession } from '@/utils/session';
import { getSalesOrders, getB2BCatalog } from '@/utils/db';
import Navigation from '@/components/Navigation';
import OrdersAdminClient from './OrdersAdminClient';
import { redirect } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

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
        <div className="pb-6 border-b border-slate-200 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Order Approvals</h1>
            <p className="text-slate-500 text-xs mt-1">Review customer sales orders, adjust quantities, approve items, and reserve inventory stock.</p>
          </div>
          <Link
            href="/admin/b2b/orders/new"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm w-fit"
          >
            <ShoppingCart size={14} />
            Create Order on Behalf
          </Link>
        </div>

        {/* Client side interactive orders list & approval interface */}
        <OrdersAdminClient orders={orders} variants={variants} />
      </main>
    </div>
  );
}
