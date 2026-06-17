'use client';

import { useState } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  CreditCard, 
  Calendar, 
  AlertCircle,
  FileCheck2
} from 'lucide-react';
import { Invoice } from '@/utils/types';
import Link from 'next/link';

interface InvoicesClientProps {
  invoices: Invoice[];
}

export default function InvoicesClient({ invoices }: InvoicesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter invoices locally
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || inv.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const isOverdue = (dueDateStr: string, status: string) => {
    if (status === 'PAID') return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    return due < today;
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={12} /></span>
          <input
            type="text"
            placeholder="Search invoice or order #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="mx-auto text-slate-350 mb-2" size={24} />
            <p className="font-semibold text-xs">No invoices found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  <th className="px-6 py-4">Invoice Details</th>
                  <th className="px-6 py-4">Linked Order</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-right">Invoice Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const overdue = isOverdue(inv.dueDate, inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Invoice Details */}
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 block text-xs">{inv.invoiceNumber}</span>
                        <span className="text-[9px] text-slate-450 font-bold block mt-0.5">Date: {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                      </td>

                      {/* Linked Order */}
                      <td className="px-6 py-4 font-black text-slate-800">{inv.orderNumber || '—'}</td>

                      {/* Due Date */}
                      <td className="px-6 py-4 font-bold text-slate-550">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span className={overdue ? 'text-red-650 font-black' : ''}>
                            {new Date(inv.dueDate).toLocaleDateString()}
                          </span>
                          {overdue && (
                            <span className="bg-red-50 text-red-700 text-[8px] font-black uppercase px-1 py-0.5 rounded border border-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(inv.amount)}</td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-1 rounded-md ${
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {inv.invoicePdfUrl ? (
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl font-bold flex items-center gap-1 text-slate-700"
                            >
                              <Download size={11} />
                              <span>PDF</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold px-3 py-1">No PDF</span>
                          )}

                          {inv.status !== 'PAID' && (
                            <Link
                              href={`/b2b/payments?invoiceId=${inv.id}&amount=${inv.amount}&invoiceNumber=${inv.invoiceNumber}`}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1.5 px-3 rounded-xl flex items-center gap-1 shadow-sm select-none"
                            >
                              <CreditCard size={11} />
                              <span>Pay Ref</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
