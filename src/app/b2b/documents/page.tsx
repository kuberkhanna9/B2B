import { getSession } from '@/utils/session';
import { getInvoices, getDispatches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import { FileText, Download, Printer, Shield, Receipt, Ship } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerDocumentsPage() {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    redirect('/login');
  }

  // Fetch documents (invoices with PDFs, dispatches)
  const invoices = await getInvoices(user.customerId);
  const dispatches = await getDispatches(user.customerId);

  const pdfInvoices = invoices.filter((inv: any) => inv.invoicePdfUrl);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Documents Section</h1>
          <p className="text-slate-500 text-xs mt-1">Access and download consolidated invoice PDFs, dispatch notes, and generate printable statements.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-semibold">
          
          {/* Invoice Documents */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Receipt size={16} className="text-slate-500" />
              <h2 className="text-sm font-black text-slate-905 tracking-tight uppercase">Invoice PDFs ({pdfInvoices.length})</h2>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {pdfInvoices.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No uploaded invoice PDFs found.</p>
              ) : (
                pdfInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="font-black text-slate-900 block">{inv.invoiceNumber}</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Issued: {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={inv.invoicePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200 p-1.5 px-3 rounded-xl transition-all font-bold flex items-center gap-1 select-none"
                    >
                      <Download size={10} />
                      <span>Download PDF</span>
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Account Statements */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileText size={16} className="text-slate-500" />
                <h2 className="text-sm font-black text-slate-905 tracking-tight uppercase">Account Statements</h2>
              </div>
              <p className="text-slate-450 leading-relaxed">
                Generate a clean, printable statement of your historical account ledgers, invoices, outstanding amounts, and payment references.
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex gap-4">
              <a
                href="/b2b/ledger"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 select-none shrink-0"
              >
                <Printer size={12} />
                <span>Print Ledger Statement</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
