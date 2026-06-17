'use client';

import { useState, useTransition } from 'react';
import { verifyPaymentAction, rejectPaymentAction } from '@/app/actions';
import { 
  CreditCard, 
  Calendar, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  FolderLock
} from 'lucide-react';
import { PaymentReference } from '@/utils/types';

interface PaymentsAdminClientProps {
  paymentReferences: PaymentReference[];
}

export default function PaymentsAdminClient({ paymentReferences }: PaymentsAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

  // Rejection State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  const pendingList = paymentReferences.filter(p => p.status === 'SUBMITTED');
  const processedList = paymentReferences.filter(p => p.status !== 'SUBMITTED');

  const displayedList = activeTab === 'pending' ? pendingList : processedList;

  const handleVerify = (id: string, utr: string) => {
    if (!confirm(`Verify payment reference UTR: ${utr}? This will post credit balance to customer ledger card.`)) return;

    setStatusMsg(null);
    startTransition(async () => {
      const res = await verifyPaymentAction(id);
      if (res.success) {
        setStatusMsg({ success: true, message: `Payment UTR ${utr} verified and ledger accounts reconciled!` });
        setTimeout(() => setStatusMsg(null), 5000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Verification failed.' });
      }
    });
  };

  const handleRejectSubmit = (id: string, utr: string) => {
    if (!rejectionReason.trim()) return;

    setStatusMsg(null);
    startTransition(async () => {
      const res = await rejectPaymentAction(id, rejectionReason.trim());
      if (res.success) {
        setStatusMsg({ success: true, message: `Payment UTR ${utr} marked as rejected.` });
        setRejectingId(null);
        setRejectionReason('');
        setTimeout(() => setStatusMsg(null), 5000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Rejection failed.' });
      }
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('pending'); setStatusMsg(null); setRejectingId(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'pending' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Pending Verifications ({pendingList.length})
        </button>
        <button
          onClick={() => { setActiveTab('processed'); setStatusMsg(null); setRejectingId(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'processed' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Processed Payments ({processedList.length})
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Table grid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderLock className="mx-auto text-slate-305 mb-2" size={24} />
            <p className="font-semibold">No payments in this queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                  <th className="px-5 py-4">Transfer Date</th>
                  <th className="px-5 py-4">Wholesale Client</th>
                  <th className="px-5 py-4">UTR Number</th>
                  <th className="px-5 py-4">Invoice / Mode</th>
                  <th className="px-5 py-4 text-right">Amount Received</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map(ref => (
                  <tr key={ref.id} className="hover:bg-slate-50/20 transition-colors">
                    {/* Date */}
                    <td className="px-5 py-3.5 font-bold text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(ref.paymentDate).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-5 py-3.5 font-black text-slate-800">{ref.companyName}</td>

                    {/* UTR */}
                    <td className="px-5 py-3.5 font-black text-slate-905">{ref.utrNumber}</td>

                    {/* Link Invoice */}
                    <td className="px-5 py-3.5 text-slate-500 font-bold">
                      <span className="block">Inv: {ref.invoiceNumber || 'Advance'}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{ref.paymentMode.replace('_', ' ')}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(ref.amount)}</td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-0.5 rounded-md ${
                        ref.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                        ref.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                        'bg-red-50 text-red-700 border border-red-155'
                      }`}>
                        {ref.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      {ref.status === 'SUBMITTED' ? (
                        <div className="flex flex-col gap-2 items-center">
                          {rejectingId === ref.id ? (
                            <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl max-w-xs text-left">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Rejection Reason</label>
                              <input
                                type="text"
                                required
                                placeholder="E.g. UTR mismatch / Amt incorrect"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                className="border border-slate-205 rounded-lg px-2 py-1 text-[11px] bg-white font-semibold"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectingId(null)}
                                  className="text-[9px] font-bold text-slate-505 bg-white border border-slate-200 px-2 py-1 rounded-lg"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSubmit(ref.id, ref.utrNumber)}
                                  disabled={isPending || !rejectionReason.trim()}
                                  className="text-[9px] font-black text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {ref.attachmentUrl && (
                                <a
                                  href={ref.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white hover:bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl font-bold flex items-center gap-1 text-slate-700"
                                >
                                  <ExternalLink size={10} />
                                  <span>View Receipt</span>
                                </a>
                              )}
                              <button
                                onClick={() => setRejectingId(ref.id)}
                                className="bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 hover:border-red-200 font-bold p-1.5 px-3 rounded-xl cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleVerify(ref.id, ref.utrNumber)}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1.5 px-3 rounded-xl cursor-pointer shadow-sm"
                              >
                                Verify UTR
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-left pl-4">
                          {ref.status === 'REJECTED' && ref.rejectionReason && (
                            <span className="text-red-650 font-black block">Reason: {ref.rejectionReason}</span>
                          )}
                          {ref.verifiedAt && (
                            <span className="text-[10px] text-slate-400 font-semibold block">Processed: {new Date(ref.verifiedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
