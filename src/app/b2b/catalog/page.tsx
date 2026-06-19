import { getSession } from '@/utils/session';
import { getB2BCatalog, getCustomerBranches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import CatalogClient from './CatalogClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CatalogPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch catalog data specifically mapped with pricing overrides and live stock calculations for this customer
  const catalog = await getB2BCatalog(user.customerId);
  const branches = await getCustomerBranches(user.customerId);

  // Extract filter parameters (categories, colors, sizes) to build search filters
  const categoriesSet = new Set<string>();
  const colorsSet = new Set<string>();
  const sizesSet = new Set<string>();

  for (const prod of catalog) {
    categoriesSet.add(prod.category);
    for (const v of prod.variants) {
      colorsSet.add(v.colorName);
      sizesSet.add(v.sizeName);
    }
  }

  const categories = Array.from(categoriesSet);
  const colors = Array.from(colorsSet);
  const sizes = Array.from(sizesSet);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalogue</h1>
          <p className="text-slate-500 text-xs mt-1">Select products and quantities to place your wholesale orders directly below.</p>
        </div>

        {/* Client side interactive catalog grid, filters, and shopping cart */}
        <CatalogClient 
          catalog={catalog} 
          categories={categories} 
          colors={colors} 
          sizes={sizes} 
          branches={branches}
        />
      </main>
    </div>
  );
}
