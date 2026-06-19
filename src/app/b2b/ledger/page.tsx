import { getSession } from '@/utils/session';
import { getCustomerLedger, getInvoices } from '@/utils/db';
import Navigation from '@/components/Navigation';
import { 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Calendar,
  FileCheck2
} from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerLedgerPage() {
  const user = await getSession();
  if (!user || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER') || !user.customerId) {
    redirect('/login');
  }

  // Fetch ledger entries and invoices
  const ledger = await getCustomerLedger(user.customerId);
  const invoices = await getInvoices(user.customerId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Compile ledger stats
  const netBalance = ledger.length > 0 ? ledger[0].runningBalance : 0;
  
  const totalDebits = ledger.reduce((sum: number, entry: any) => sum + entry.debitAmount, 0);
  const totalCredits = ledger.reduce((sum: number, entry: any) => sum + entry.creditAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Ledger Account</h1>
          <p className="text-slate-500 text-xs mt-1">Detailed double-entry transactional history, payments posted, and net outstanding balance statements.</p>
        </div>

        {/* Ledger Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Outstanding */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Outstanding Balance</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{formatCurrency(netBalance)}</span>
            </div>
            <div className="p-2.5 bg-red-50 text-red-650 rounded-xl"><DollarSign size={16} /></div>
          </div>

          {/* Total Debits (Invoiced) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debits (Billed)</span>
              <span className="text-2xl font-black text-slate-850 mt-1 block">{formatCurrency(totalDebits)}</span>
            </div>
            <div className="p-2.5 bg-slate-50 text-slate-550 rounded-xl"><ArrowUpRight size={16} /></div>
          </div>

          {/* Total Credits (Cleared) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Credits (Paid)</span>
              <span className="text-2xl font-black text-slate-850 mt-1 block">{formatCurrency(totalCredits)}</span>
            </div>
            <div className="p-2.5 bg-slate-50 text-slate-550 rounded-xl"><ArrowDownLeft size={16} /></div>
          </div>
        </section>

        {/* Ledger Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Layers size={14} className="text-slate-500" />
            <span className="text-xs font-black text-slate-900 uppercase">Statement of Accounts</span>
          </div>

          {ledger.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Layers className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold text-xs">No ledger transactions posted to this account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    <th className="px-6 py-4">Transaction Date</th>
                    <th className="px-6 py-4">Transaction Details</th>
                    <th className="px-6 py-4 text-right">Debit (Amount Due)</th>
                    <th className="px-6 py-4 text-right">Credit (Paid)</th>
                    <th className="px-6 py-4 text-right bg-slate-50/50">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 block">{entry.description}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Ref Type: {entry.referenceType}</span>
                      </td>

                      {/* Debit */}
                      <td className="px-6 py-4 text-right font-bold text-red-600">
                        {entry.debitAmount > 0 ? `+ ${formatCurrency(entry.debitAmount)}` : '—'}
                      </td>

                      {/* Credit */}
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        {entry.creditAmount > 0 ? `- ${formatCurrency(entry.creditAmount)}` : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/20">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
