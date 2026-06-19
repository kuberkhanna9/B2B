import { getSession } from '@/utils/session';
import { getCustomerBranches, getBranchUsers } from '@/utils/db';
import Navigation from '@/components/Navigation';
import UsersClient from './UsersClient';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function BranchUsersPage() {
  const user = await getSession();
  if (!user || user.role !== 'CLIENT_ADMIN' || !user.customerId) {
    redirect('/login');
  }

  // Fetch branches and branch users for this customer
  const branches = await getCustomerBranches(user.customerId);
  const branchUsers = await getBranchUsers(user.customerId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Branch User Accounts</h1>
          <p className="text-slate-500 text-xs mt-1">Manage portal logins for each customer depot or branch location. Create, edit, or disable logins instantly.</p>
        </div>

        <UsersClient 
          branchUsers={branchUsers} 
          branches={branches} 
          customerId={user.customerId}
        />
      </main>
    </div>
  );
}
