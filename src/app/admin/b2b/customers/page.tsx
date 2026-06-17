import { getSession } from '@/utils/session';
import { getCustomers, getCustomerUsers, getB2BCatalog, getAllPricingOverrides, getCustomerBranches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import CustomersAdminClient from './CustomersAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomersAdminPage() {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    redirect('/login');
  }

  // Fetch B2B administration entities
  const customers = await getCustomers();
  const customerUsers = await getCustomerUsers();
  const branches = await getCustomerBranches();
  
  // Reuse catalog fetch to load active variants details (name, color, size, wholesale price, SKU)
  const catalog = await getB2BCatalog();
  const variants = catalog.flatMap((prod: any) => 
    prod.variants.map((v: any) => ({
      variantId: v.variantId,
      sku: v.sku,
      productName: prod.productName,
      colorName: v.colorName,
      sizeName: v.sizeName,
      wholesalePrice: v.standardWholesalePrice
    }))
  );

  // Load all pricing overrides
  const pricing = await getAllPricingOverrides();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Client Accounts</h1>
          <p className="text-slate-500 text-xs mt-1">Register approved wholesale customers, configure web portal access credentials, and adjust custom pricing sheets.</p>
        </div>

        {/* B2B Administration panel */}
        <CustomersAdminClient 
          customers={customers} 
          customerUsers={customerUsers} 
          variants={variants}
          pricing={pricing}
          branches={branches}
        />
      </main>
    </div>
  );
}
