'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitPaymentAction } from '@/app/actions';
import { 
  CreditCard, 
  Calendar, 
  FileText, 
  DollarSign, 
  Upload, 
  Image as ImageIcon,
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Invoice, PaymentReference } from '@/utils/types';

interface PaymentsClientProps {
  activeInvoices: Invoice[];
  paymentReferences: PaymentReference[];
}

export default function PaymentsClient({ activeInvoices, paymentReferences }: PaymentsClientProps) {
  const searchParams = useSearchParams();

  // Form Field States
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH'>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // File Upload State
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Form Submission State
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Pre-populate fields if navigated from Invoices page
  useEffect(() => {
    const pInvoiceId = searchParams.get('invoiceId');
    const pAmount = searchParams.get('amount');
    
    if (pInvoiceId) setInvoiceId(pInvoiceId);
    if (pAmount) setAmount(pAmount);
    
    // Set default date as today
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, [searchParams]);

  // Handle File Upload to local mock public/uploads dir
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setAttachmentUrl('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setAttachmentUrl(data.url);
      } else {
        setUploadError(data.error || 'Failed to upload.');
      }
    } catch (err: any) {
      setUploadError('Server upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !paymentDate || !utrNumber) {
      setStatus({ success: false, message: 'Please complete all required fields.' });
      return;
    }

    setStatus(null);
    startTransition(async () => {
      const parsedInvoiceId = invoiceId || undefined;
      const response = await submitPaymentAction(
        parsedInvoiceId,
        paymentDate,
        Number(amount),
        paymentMode,
        referenceNumber,
        utrNumber,
        notes,
        attachmentUrl
      );

      if (response.success) {
        setStatus({ success: true, message: 'Payment reference successfully submitted! Pending verification.' });
        // Clear form
        setInvoiceId('');
        setAmount('');
        setReferenceNumber('');
        setUtrNumber('');
        setNotes('');
        setAttachmentUrl('');
        setActiveTab('history');
      } else {
        setStatus({ success: false, message: response.error || 'Submission failed.' });
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
    <div className="space-y-6 text-xs">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-6 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'submit' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Submit Payment Proof
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'history' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Payment History ({paymentReferences.length})
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex gap-2 items-start ${
          status.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      {/* Tab 1: Submit Form */}
      {activeTab === 'submit' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Linked Invoice Selector */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Link Payment to Invoice (Optional)</label>
              <select
                value={invoiceId}
                onChange={e => {
                  setInvoiceId(e.target.value);
                  const selected = activeInvoices.find(i => i.id === e.target.value);
                  if (selected) setAmount(String(selected.amount));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">Do not link to specific invoice (Advance / On-Account payment)</option>
                {activeInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — Outstanding: {formatCurrency(inv.amount)} (Due: {new Date(inv.dueDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount Transferred (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={13} /></span>
                  <input
                    type="number"
                    required
                    placeholder="E.g. 50000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment Transfer Date *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={13} /></span>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Mode and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT/RTGS)</option>
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="CHEQUE">Cheque Payment</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">UTR / Transaction ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Unique Bank UTR or UPI Tx ID"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Reference Number optional */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cheque No. / Branch Reference (Optional)</label>
              <input
                type="text"
                placeholder="Cheque number or reference details"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment Notes</label>
              <textarea
                placeholder="Additional instructions or bank account detail details..."
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            {/* File Upload proof */}
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Upload Transfer Receipt Screenshot *</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 px-4 rounded-xl font-bold text-[10px] cursor-pointer flex items-center gap-1.5 shadow-sm select-none">
                  <Upload size={12} className="text-slate-500" />
                  <span>Choose Screenshot</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {isUploading && <span className="text-[10px] text-slate-500 font-semibold animate-pulse">Uploading file...</span>}
                
                {attachmentUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Receipt Uploaded
                  </span>
                )}
              </div>
              {uploadError && <p className="text-[9px] text-red-600 font-semibold mt-1">{uploadError}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {isPending ? 'Submitting...' : 'Register Payment Reference'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: History List */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {paymentReferences.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold text-xs">No payment references registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    <th className="px-6 py-4">Transfer Details</th>
                    <th className="px-6 py-4">UTR Number</th>
                    <th className="px-6 py-4">Linked Invoice</th>
                    <th className="px-6 py-4 text-right">Amount Paid</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Verification Info / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentReferences.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Details */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-700 block">{new Date(ref.paymentDate).toLocaleDateString()}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{ref.paymentMode.replace('_', ' ')}</span>
                      </td>

                      {/* UTR */}
                      <td className="px-6 py-4 font-black text-slate-900">{ref.utrNumber}</td>

                      {/* Invoice */}
                      <td className="px-6 py-4 font-bold text-slate-500">{ref.invoiceNumber || 'Advance'}</td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(ref.amount)}</td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-1 rounded-md ${
                          ref.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          ref.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {ref.status}
                        </span>
                      </td>

                      {/* Notes / verification details */}
                      <td className="px-6 py-4 text-slate-500 font-semibold max-w-xs truncate">
                        {ref.status === 'REJECTED' && ref.rejectionReason && (
                          <span className="text-red-650 font-black block">Rejection Note: {ref.rejectionReason}</span>
                        )}
                        {ref.notes && <span className="block italic">&quot;{ref.notes}&quot;</span>}
                        {ref.attachmentUrl && (
                          <a 
                            href={ref.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-900 font-extrabold flex items-center gap-0.5 mt-1 hover:underline"
                          >
                            <span>View Proof Receipt</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
