import { getSession } from '@/utils/session';
import { getReturnRequests, getSalesOrders, getB2BCatalog, getCustomerBranches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import ReturnsClient from './ReturnsClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerReturnsPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch returns/claims history specifically for this customer
  const returns = await getReturnRequests(user.customerId);
  const orders = await getSalesOrders(user.customerId);
  const branches = await getCustomerBranches(user.customerId);

  // Fetch catalog variants to choose which items to return
  const catalog = await getB2BCatalog(user.customerId);
  const variants = catalog.flatMap((prod: any) => 
    prod.variants.map((v: any) => ({
      variantId: v.variantId,
      sku: v.sku,
      productName: prod.productName,
      colorName: v.colorName,
      sizeName: v.sizeName
    }))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Return Claims Portal</h1>
          <p className="text-slate-500 text-xs mt-1">Submit defective stock returns, Wrong SKU claims, transit damage claims, and track resolution statuses in real time.</p>
        </div>

        {/* Client side returns submission form & status logs */}
        <ReturnsClient 
          returns={returns} 
          orders={orders}
          branches={branches}
          variants={variants}
          customerId={user.customerId}
        />
      </main>
    </div>
  );
}
