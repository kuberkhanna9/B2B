'use client';

import { useState, useTransition } from 'react';
import { createInvoiceAction } from '@/app/actions';
import { 
  Receipt, 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  Upload, 
  ExternalLink,
  CheckCircle2, 
  AlertCircle,
  FileCheck2
} from 'lucide-react';
import { Invoice, SalesOrder } from '@/utils/types';

interface InvoicesAdminClientProps {
  invoices: Invoice[];
  activeOrders: SalesOrder[];
}

export default function InvoicesAdminClient({ invoices, activeOrders }: InvoicesAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');

  // Form Field States
  const [orderId, setOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoicePdfUrl, setInvoicePdfUrl] = useState('');

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Form Submission State
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Auto pre-populate amount when order is selected
  const handleOrderChange = (oId: string) => {
    setOrderId(oId);
    const selected = activeOrders.find(o => o.id === oId);
    if (selected) {
      setAmount(String(selected.totalAmount));
      // Auto prefill invoice number from count
      setInvoiceNumber(`INV-${selected.orderNumber.replace('SO-', '')}`);
    }
  };

  // Handle PDF Upload to public/uploads
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setInvoicePdfUrl('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setInvoicePdfUrl(data.url);
      } else {
        setUploadError(data.error || 'Failed to upload PDF.');
      }
    } catch (err: any) {
      setUploadError('Server upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Form Submit Handler
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !invoiceNumber || !amount || Number(amount) <= 0 || !dueDate) {
      setStatusMsg({ success: false, message: 'Please complete all required fields.' });
      return;
    }

    setStatusMsg(null);
    startTransition(async () => {
      const res = await createInvoiceAction(
        orderId,
        invoiceNumber.trim(),
        Number(amount),
        dueDate,
        invoicePdfUrl
      );

      if (res.success) {
        setStatusMsg({ success: true, message: `Invoice ${invoiceNumber} successfully created and customer ledger debited!` });
        // Reset form
        setOrderId('');
        setInvoiceNumber('');
        setAmount('');
        setDueDate('');
        setInvoicePdfUrl('');
        setActiveTab('list');
        setTimeout(() => setStatusMsg(null), 5000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Invoice generation failed.' });
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
          onClick={() => { setActiveTab('list'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'list' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Issued Invoices ({invoices.length})
        </button>
        <button
          onClick={() => { setActiveTab('generate'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'generate' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Generate New Invoice
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Tab 1: List */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold">No invoices generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-4">Invoice Number</th>
                    <th className="px-5 py-4">Wholesale Client</th>
                    <th className="px-5 py-4">Issue / Due Date</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-905">
                        <span className="block">{inv.invoiceNumber}</span>
                        <span className="text-[8px] text-slate-405 font-bold block mt-0.5">Order: {inv.orderNumber}</span>
                      </td>
                      <td className="px-5 py-3.5 font-black text-slate-800">{inv.companyName}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-bold">
                        <span className="block">Issued: {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                        <span className="block text-red-650 mt-0.5 font-black">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(inv.amount)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-0.5 rounded-md ${
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                          inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 border border-red-155' :
                          'bg-amber-50 text-amber-700 border border-amber-150'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {inv.invoicePdfUrl ? (
                          <a
                            href={inv.invoicePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-slate-900 hover:text-white border border-slate-205 transition-all p-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1 mx-auto max-w-max"
                          >
                            <ExternalLink size={11} />
                            <span>Download PDF</span>
                          </a>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-semibold block">No PDF</span>
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

      {/* Tab 2: Generate Form */}
      {activeTab === 'generate' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-xl">
          <form onSubmit={handleGenerateInvoice} className="space-y-4">
            
            {/* Sales order selector */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Sales Order to Bill *</label>
              <select
                value={orderId}
                onChange={e => handleOrderChange(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">Choose order...</option>
                {activeOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.companyName} (Amount: {formatCurrency(o.totalAmount)} | Status: {o.status.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Number and Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice Number *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. INV-000001"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Billed Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={13} /></span>
                  <input
                    type="number"
                    required
                    placeholder="Billed subtotal, e.g. 50000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due Date *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={13} /></span>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* PDF Upload */}
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">Upload Signed Invoice PDF</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="bg-white hover:bg-slate-550 border border-slate-200 p-2.5 px-4 rounded-xl font-bold text-[10px] cursor-pointer flex items-center gap-1.5 shadow-sm select-none">
                  <Upload size={12} className="text-slate-500" />
                  <span>Choose PDF File</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>

                {isUploading && <span className="text-[10px] text-slate-500 font-semibold animate-pulse">Uploading file...</span>}
                
                {invoicePdfUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Invoice PDF Attached
                  </span>
                )}
              </div>
              {uploadError && <p className="text-[9px] text-red-650 font-semibold mt-1">{uploadError}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {isPending ? 'Generating...' : 'Issue Invoice & Post to Ledger'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
