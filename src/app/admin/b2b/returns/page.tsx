import { getSession } from '@/utils/session';
import { getReturnRequests } from '@/utils/db';
import Navigation from '@/components/Navigation';
import ReturnsAdminClient from './ReturnsAdminClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminReturnsPage() {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS' && user.role !== 'INVENTORY')) {
    redirect('/login');
  }

  // Fetch all returns/claims
  const returnRequests = await getReturnRequests();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Returns & Reverse Logistics</h1>
          <p className="text-slate-500 text-xs mt-1">Manage wholesale customer claim requests, approve credit notes or replacements, and route returned garments back to appropriate inventory ledger channels.</p>
        </div>

        {/* Client side returns dashboard */}
        <ReturnsAdminClient returnRequests={returnRequests} userRole={user.role} />
      </main>
    </div>
  );
}
