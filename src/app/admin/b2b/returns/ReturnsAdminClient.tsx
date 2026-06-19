'use client';

import { useState, useTransition } from 'react';
import { resolveReturnRequestAction } from '@/app/actions';
import { 
  ArrowLeftRight, 
  Calendar, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  AlertCircle,
  FileCheck,
  RotateCcw,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react';

interface ReturnsAdminClientProps {
  returnRequests: any[];
  userRole: string;
}

export default function ReturnsAdminClient({ returnRequests, userRole }: ReturnsAdminClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Lightbox Zoom Preview
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Form Fields
  const [resolutionType, setResolutionType] = useState<'Replace' | 'Credit Note' | 'Refund' | 'Repair' | 'Reject Claim'>('Credit Note');
  const [receivedStatus, setReceivedStatus] = useState<'READY_STOCK' | 'REPAIRABLE' | 'SCRAP' | ''>('');
  const [remarks, setRemarks] = useState('');

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  const filteredRequests = returnRequests.filter(req => {
    if (statusFilter === 'ALL') return true;
    return req.status === statusFilter;
  });

  const handleOpenDetails = (req: any) => {
    setSelectedRequest(req);
    setRemarks('');
    setResolutionType('Credit Note');
    setReceivedStatus('');
    setStatusMsg(null);
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setStatusMsg(null);
    startTransition(async () => {
      const resStatus = receivedStatus ? (receivedStatus as any) : null;
      const res = await resolveReturnRequestAction(
        selectedRequest.id,
        resolutionType,
        remarks,
        resStatus
      );

      if (res.success) {
        setStatusMsg({ success: true, message: 'Return claim resolution processed successfully!' });
        setSelectedRequest(null);
        setTimeout(() => setStatusMsg(null), 5000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to resolve claim request.' });
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
      
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Status Tab Selector */}
        <div className="flex flex-wrap border-b border-slate-205">
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RECEIVED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setStatusMsg(null); }}
              className={`px-4 py-2.5 font-black cursor-pointer border-b-2 transition-colors ${
                statusFilter === s ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Requests Registry Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderOpen className="mx-auto text-slate-350 mb-2" size={24} />
            <p className="font-semibold">No return requests recorded in this queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-455 tracking-wider">
                  <th className="px-5 py-4">Return Number</th>
                  <th className="px-5 py-4">Wholesale Client</th>
                  <th className="px-5 py-4">Branch</th>
                  <th className="px-5 py-4">Claim Date</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-black text-slate-900">{req.returnNumber}</td>
                    <td className="px-5 py-3.5 font-black text-slate-800">{req.companyName}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-600">{req.branchName || '—'}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-500">
                      <div className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" />{new Date(req.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] uppercase tracking-wide">
                        {req.reason.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-0.5 rounded-md ${
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        req.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        req.status === 'RECEIVED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        req.status === 'CLOSED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenDetails(req)}
                        className="bg-white hover:bg-slate-900 border border-slate-205 hover:text-white transition-all rounded-xl p-1.5 px-3 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm text-[10px]"
                      >
                        <FileText size={12} />
                        <span>Process Claim</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Resolution Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden text-xs">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedRequest(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white flex flex-col shadow-2xl">
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Process Return Claim</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">
                    Claim: {selectedRequest.returnNumber} — Order: {selectedRequest.orderNumber || '—'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleResolve} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Client Customer</span>
                      <span className="block font-black text-slate-800 text-xs mt-0.5">{selectedRequest.companyName}</span>
                      {selectedRequest.branchName && (
                        <span className="block text-[9px] text-slate-500 mt-0.5">Branch: {selectedRequest.branchName}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Reference Info</span>
                      <span className="block font-semibold text-slate-700 mt-0.5">Invoice: {selectedRequest.invoiceNumber || '—'}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Reason: {selectedRequest.reason.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Remarks */}
                  {selectedRequest.remarks && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Customer Claim Remarks</span>
                      <p className="text-[10px] text-slate-750 font-bold bg-amber-50/20 border border-amber-100 rounded-xl p-3 leading-relaxed">
                        {selectedRequest.remarks}
                      </p>
                    </div>
                  )}

                  {/* Claimed Items */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Returned Items Ledger</span>
                    <div className="border border-slate-205 rounded-2xl overflow-hidden bg-slate-50/10">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                            <th className="px-4 py-2">Garment Details</th>
                            <th className="px-4 py-2 text-right">Returned Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {selectedRequest.items && selectedRequest.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-100/10">
                              <td className="px-4 py-2.5 font-bold">
                                {item.sku ? (
                                  <>
                                    <span className="block font-black text-slate-800">{item.productName || 'Inventory SKU'}</span>
                                    <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{item.sku} | {item.colorName} / {item.sizeName}</span>
                                  </>
                                ) : (
                                  <span className="font-extrabold text-slate-800">{item.customItemName} (Custom Item)</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-black text-slate-900">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Photos */}
                  {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Claim Evidence Photos</span>
                      <div className="flex flex-wrap gap-3">
                        {selectedRequest.photos.map((pUrl: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setActivePhotoUrl(pUrl); setZoomScale(1); }}
                            className="w-20 h-20 border border-slate-200 rounded-xl overflow-hidden hover:opacity-80 transition-all flex items-center justify-center bg-slate-50 relative group cursor-pointer"
                          >
                            <img src={pUrl} alt="damage-evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Section (only if not rejected/closed already) */}
                  {selectedRequest.status !== 'CLOSED' && selectedRequest.status !== 'REJECTED' && (
                    <div className="space-y-4 pt-4 border-t border-slate-150">
                      <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider block">Choose Resolution & Adjust Inventory</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Resolution Type */}
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Resolution Action *</label>
                          <select
                            value={resolutionType}
                            onChange={e => setResolutionType(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all font-semibold"
                          >
                            <option value="Credit Note">Issue Credit Note (Recommended)</option>
                            <option value="Replace">Approve Replacement Items</option>
                            <option value="Refund">Direct Financial Refund</option>
                            <option value="Repair">Route to Repair Channel</option>
                            <option value="Reject Claim">Reject Claim Request</option>
                          </select>
                        </div>

                        {/* Inventory Routing */}
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Inventory Routing (If Received) *</label>
                          <select
                            value={receivedStatus}
                            onChange={e => setReceivedStatus(e.target.value as any)}
                            required={resolutionType !== 'Reject Claim'}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-705 focus:outline-none focus:border-slate-800 transition-all font-semibold"
                          >
                            <option value="">-- Route returned stock to --</option>
                            <option value="READY_STOCK">READY STOCK (Warehouse Shelf)</option>
                            <option value="REPAIRABLE">REPAIRABLE (Restoration / QA)</option>
                            <option value="SCRAP">SCRAP (Garbage / Write Off)</option>
                          </select>
                          <span className="text-[8px] text-slate-400 leading-normal block">Posting received items adjusts the physical inventory ledger logs.</span>
                        </div>
                      </div>

                      {/* Resolution Remarks */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider font-black">Resolution Notes / Remarks *</label>
                        <textarea
                          required
                          placeholder="Provide audit reasons, credit note IDs, repair timelines, or claim rejection feedback..."
                          rows={2}
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold text-[11px] text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRequest.status === 'CLOSED' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-2 items-center text-emerald-805">
                      <CheckCircle2 size={16} />
                      <span className="font-extrabold">This return claim request has been resolved and closed.</span>
                    </div>
                  )}
                  {selectedRequest.status === 'REJECTED' && (
                    <div className="p-4 bg-red-50 border border-red-105 rounded-2xl flex gap-2 items-center text-red-805">
                      <AlertTriangle size={16} />
                      <span className="font-extrabold">This return claim has been rejected and closed.</span>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                {selectedRequest.status !== 'CLOSED' && selectedRequest.status !== 'REJECTED' && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(null)}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 rounded-xl cursor-pointer text-center text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isPending ? 'Saving Resolution...' : 'Resolve & Update Stock Ledger'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {activePhotoUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
              className="bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl p-2 px-3 font-bold text-xs cursor-pointer select-none transition-colors border border-slate-700"
            >
              Zoom In
            </button>
            <button
              onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
              className="bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl p-2 px-3 font-bold text-xs cursor-pointer select-none transition-colors border border-slate-700"
            >
              Zoom Out
            </button>
            <button
              onClick={() => { setActivePhotoUrl(null); setZoomScale(1); }}
              className="bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl p-2 cursor-pointer transition-colors border border-slate-700"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 w-full flex items-center justify-center overflow-auto">
            <img 
              src={activePhotoUrl} 
              alt="Evidence Full Size" 
              style={{ transform: `scale(${zoomScale})` }}
              className="max-h-[85vh] max-w-full object-contain rounded-lg transition-transform duration-250 ease-out cursor-zoom-in"
              onClick={() => setZoomScale(prev => prev === 1 ? 2 : 1)}
            />
          </div>

          <div className="text-slate-400 text-[10px] pb-2 font-semibold">
            Click image to toggle 2x zoom. Scroll or use controls to adjust.
          </div>
        </div>
      )}
    </div>
  );
}
