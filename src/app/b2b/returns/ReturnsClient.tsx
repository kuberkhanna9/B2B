'use client';

import { useState, useTransition } from 'react';
import { createReturnRequestAction } from '@/app/actions';
import { 
  RotateCcw, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Layers,
  Camera,
  ArrowLeftRight,
  ShieldAlert,
  FileText,
  X
} from 'lucide-react';

interface ReturnsClientProps {
  returns: any[];
  orders: any[];
  branches: any[];
  variants: any[];
  customerId: string;
}

export const mapReasonLabel = (reasonCode: string) => {
  switch (reasonCode) {
    case 'DEFECTIVE': return 'Defective Piece';
    case 'WRONG_ITEM': return 'Wrong Item Received';
    case 'SIZE_ISSUE': return 'Size Issue';
    case 'COLOUR_ISSUE': return 'Colour Issue';
    case 'EXCESS_QUANTITY': return 'Excess Quantity Received';
    case 'SHORT_QUANTITY': return 'Short Quantity Received';
    case 'SOR_RETURN': return 'SOR Return';
    case 'TRANSIT_DAMAGE': return 'Transit Damage';
    case 'CUSTOMER_CANCELLATION': return 'Customer Cancellation';
    case 'CUSTOMER_REJECTION': return 'Customer Rejection'; // legacy support
    case 'OTHER': return 'Other';
    default: return reasonCode ? reasonCode.replace('_', ' ') : '';
  }
};

export default function ReturnsClient({ returns, orders, branches, variants, customerId }: ReturnsClientProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');

  // Client-side generated session ID for files upload structure
  const [returnId, setReturnId] = useState(() => 
    typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'ret-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now()
  );

  // Form Fields
  const [orderId, setOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState<'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER' | 'COLOUR_ISSUE' | 'SHORT_QUANTITY' | 'CUSTOMER_CANCELLATION'>('DEFECTIVE');
  const [remarks, setRemarks] = useState('');
  
  // Return items list
  const [items, setItems] = useState<{ variantId: string; customItemName: string; isCustom: boolean; quantity: number }[]>([
    { variantId: '', customItemName: '', isCustom: false, quantity: 1 }
  ]);

  // Image upload state (Option A files + Option B URLs)
  const [photoItems, setPhotoItems] = useState<{ url: string; fileName?: string; fileType?: string; isUrlInput?: boolean; file?: File; isUploading?: boolean; error?: string }[]>([]);

  // Lightbox Preview
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<string | null>(null);

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  const handleAddItem = () => {
    setItems(prev => [...prev, { variantId: '', customItemName: '', isCustom: false, quantity: 1 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  // Upload/Photos handlers
  const handleAddUrlField = () => {
    if (photoItems.length >= 10) {
      setStatusMsg({ success: false, message: 'Maximum 10 photos are allowed per return claim.' });
      return;
    }
    setPhotoItems(prev => [...prev, { url: '', isUrlInput: true }]);
  };

  const handleUrlChange = (idx: number, val: string) => {
    setPhotoItems(prev => prev.map((p, i) => i === idx ? { ...p, url: val } : p));
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoItems(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadSingleFile = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);
      formData.append('returnId', returnId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        setPhotoItems(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              url: result.url,
              fileName: file.name,
              fileType: file.type,
              isUploading: false
            };
          }
          return updated;
        });
      } else {
        setPhotoItems(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = { ...updated[index], isUploading: false, error: result.error || 'Upload failed' };
          }
          return updated;
        });
      }
    } catch (err: any) {
      setPhotoItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isUploading: false, error: err.message || 'Upload failed' };
        }
        return updated;
      });
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const currentCount = photoItems.length;
    const remainingSlots = 10 - currentCount;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setStatusMsg({ success: false, message: 'Maximum 10 files are allowed per return claim.' });
    }

    const tempItems = [...photoItems];
    const uploadTasks: { file: File; index: number }[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      // Validate type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setStatusMsg({ success: false, message: `Invalid file type: ${file.name}. Only JPG, PNG, WEBP, and PDF are accepted.` });
        continue;
      }

      // Validate size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setStatusMsg({ success: false, message: `File too large: ${file.name}. Max size is 10MB.` });
        continue;
      }

      const tempUrl = URL.createObjectURL(file);
      const targetIndex = tempItems.length;
      tempItems.push({
        url: tempUrl,
        fileName: file.name,
        fileType: file.type,
        file,
        isUploading: true
      });
      uploadTasks.push({ file, index: targetIndex });
    }

    setPhotoItems(tempItems);

    // Perform uploads
    for (const task of uploadTasks) {
      uploadSingleFile(task.file, task.index);
    }
  };

  const handleReplaceFile = async (idx: number, file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setStatusMsg({ success: false, message: 'Only JPG, PNG, WEBP, and PDF are accepted.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ success: false, message: 'Max size is 10MB.' });
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setPhotoItems(prev => prev.map((item, i) => i === idx ? { url: tempUrl, fileName: file.name, fileType: file.type, file, isUploading: true } : item));

    uploadSingleFile(file, idx);
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!branchId) {
      setStatusMsg({ success: false, message: 'Please select which customer branch this claim belongs to.' });
      return;
    }

    if (reason === 'OTHER' && !remarks.trim()) {
      setStatusMsg({ success: false, message: 'Please enter remarks for reason Other.' });
      return;
    }

    const validItems = items.filter(item => (item.isCustom && item.customItemName.trim()) || (!item.isCustom && item.variantId));
    if (validItems.length === 0) {
      setStatusMsg({ success: false, message: 'Please specify at least one valid product to return.' });
      return;
    }

    const isUploading = photoItems.some(p => p.isUploading);
    if (isUploading) {
      setStatusMsg({ success: false, message: 'Please wait until all uploads have finished.' });
      return;
    }

    const payloadItems = validItems.map(item => ({
      variantId: item.isCustom ? undefined : item.variantId,
      customItemName: item.isCustom ? item.customItemName : undefined,
      quantity: item.quantity
    }));

    const payloadPhotos = photoItems.map(p => p.url).filter(p => p.trim() !== '');
    const payloadAttachments = photoItems.map(p => ({
      fileUrl: p.url,
      fileName: p.fileName || 'file',
      fileType: p.fileType || 'image/png'
    })).filter(p => p.fileUrl.trim() !== '');

    setStatusMsg(null);
    startTransition(async () => {
      const res = await createReturnRequestAction({
        id: returnId,
        customerId,
        branchId,
        orderId: orderId || undefined,
        invoiceNumber: invoiceNumber || undefined,
        reason,
        remarks: reason === 'OTHER' ? remarks : undefined, // only submit remarks if Other is selected
        items: payloadItems,
        photos: payloadPhotos,
        attachments: payloadAttachments
      });

      if (res.success) {
        setStatusMsg({ success: true, message: res.message || 'Return claim submitted successfully!' });
        // Reset form
        setOrderId('');
        setInvoiceNumber('');
        setBranchId('');
        setReason('DEFECTIVE');
        setRemarks('');
        setItems([{ variantId: '', customItemName: '', isCustom: false, quantity: 1 }]);
        setPhotoItems([]);
        setReturnId(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ret-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now());
        setActiveTab('history');
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to submit claim.' });
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
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('history'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Track Return Claims ({returns.length})
        </button>
        <button
          onClick={() => { setActiveTab('new'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'new' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          File New Claim Request
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

      {/* Claims History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {returns.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCcw className="mx-auto text-slate-305 mb-2 animate-spin-slow" size={24} />
              <p className="font-semibold text-xs">No return or reverse logistics claims submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-4">Claim Number</th>
                    <th className="px-5 py-4">Submission Date</th>
                    <th className="px-5 py-4">Shipping Branch</th>
                    <th className="px-5 py-4">Reason</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4">Resolution Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returns.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-900">{r.returnNumber}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500">
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" />{new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">{r.branchName || '—'}</td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-655">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] uppercase tracking-wide">{mapReasonLabel(r.reason)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-md ${
                          r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-205' :
                          r.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700 border border-blue-205' :
                          r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-205' :
                          r.status === 'RECEIVED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-205' :
                          r.status === 'CLOSED' ? 'bg-slate-100 text-slate-705 border border-slate-205' :
                          'bg-red-50 text-red-705 border border-red-205'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {r.resolutionType ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-emerald-700 uppercase block">{r.resolutionType}</span>
                            {r.resolutionRemarks && <span className="text-[9px] text-slate-450 block font-semibold">{r.resolutionRemarks}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300">Awaiting validation</span>
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

      {/* File Claim Tab */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmitClaim} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-xs font-black text-slate-905 uppercase tracking-wider pb-3 border-b border-slate-100">Submit Return Claim Form</h2>

          {/* Reference selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Shipping branch */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Claiming Branch *</label>
              <select
                required
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">-- Choose Branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            {/* Linked order */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Linked Sales Order (Optional)</label>
              <select
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">-- Select Order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber} ({formatCurrency(o.totalAmount)})</option>
                ))}
              </select>
            </div>

            {/* Invoice number */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice Reference (Optional)</label>
              <input
                type="text"
                placeholder="E.g. INV-001004"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Return reason */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason for Return *</label>
              <select
                required
                value={reason}
                onChange={e => setReason(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="DEFECTIVE">Defective Piece</option>
                <option value="WRONG_ITEM">Wrong Item Received</option>
                <option value="SIZE_ISSUE">Size Issue</option>
                <option value="COLOUR_ISSUE">Colour Issue</option>
                <option value="EXCESS_QUANTITY">Excess Quantity Received</option>
                <option value="SHORT_QUANTITY">Short Quantity Received</option>
                <option value="SOR_RETURN">SOR Return</option>
                <option value="TRANSIT_DAMAGE">Transit Damage</option>
                <option value="CUSTOMER_CANCELLATION">Customer Cancellation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Items matrix */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Returned Garments List</span>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-4 border border-slate-150 rounded-2xl">
                  {/* Custom item toggle */}
                  <div className="flex items-center gap-2 pb-2 h-10 select-none">
                    <input
                      type="checkbox"
                      id={`custom-toggle-${idx}`}
                      checked={item.isCustom}
                      onChange={e => {
                        handleItemChange(idx, 'isCustom', e.target.checked);
                        handleItemChange(idx, 'variantId', '');
                        handleItemChange(idx, 'customItemName', '');
                      }}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor={`custom-toggle-${idx}`} className="text-[10px] font-extrabold text-slate-500 cursor-pointer uppercase">Custom / Unlisted Item</label>
                  </div>

                  {/* Product selector / custom name */}
                  <div className="flex-1 space-y-1">
                    <label className="block text-[8px] font-bold text-slate-405 uppercase tracking-wider">Garment SKU / Name *</label>
                    {item.isCustom ? (
                      <input
                        type="text"
                        required
                        placeholder="E.g. Custom Poncho Green or Special School Sweater"
                        value={item.customItemName}
                        onChange={e => handleItemChange(idx, 'customItemName', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-800 font-semibold"
                      />
                    ) : (
                      <select
                        required
                        value={item.variantId}
                        onChange={e => handleItemChange(idx, 'variantId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-800 font-semibold"
                      >
                        <option value="">-- Select Catalog SKU --</option>
                        {variants.map(v => (
                          <option key={v.variantId} value={v.variantId}>
                            {v.productName} ({v.sku}) — {v.colorName} / {v.sizeName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-24 space-y-1">
                    <label className="block text-[8px] font-bold text-slate-405 uppercase tracking-wider">Return Qty *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-800 font-extrabold text-center"
                    />
                  </div>

                  {/* Actions */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="bg-white hover:bg-red-50 text-red-600 border border-slate-200 p-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold p-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-[10px] cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Another Garment</span>
            </button>
          </div>

          {/* Proof references */}
          <div className="space-y-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Camera size={12} />Claim Proof Attachments (1–10 files)
            </span>
            
            {photoItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {photoItems.map((item, idx) => {
                  const isPdf = item.fileType === 'application/pdf' || item.url.toLowerCase().split('?')[0].endsWith('.pdf');
                  return (
                    <div key={idx} className="relative group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center h-28 p-2">
                      {item.isUrlInput ? (
                        <div className="w-full h-full flex flex-col justify-between">
                          <input
                            type="url"
                            placeholder="File URL"
                            required
                            value={item.url}
                            onChange={e => handleUrlChange(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                          />
                          {item.url && (
                            <div className="w-full flex-1 mt-1 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center bg-white relative">
                              {isPdf ? (
                                <FileText size={18} className="text-rose-500" />
                              ) : (
                                <img src={item.url} alt="preview" className="max-h-full max-w-full object-contain" />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePreviewUrl(item.url);
                                  setActivePreviewType(isPdf ? 'application/pdf' : 'image/png');
                                }}
                                className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[8px] uppercase"
                              >
                                View
                              </button>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            {item.url && (
                              <a
                                href={item.url}
                                download={item.fileName || 'file'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-slate-500 font-bold hover:underline"
                              >
                                Download
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="text-center text-[9px] text-rose-500 font-bold hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.isUploading ? (
                            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-350 border-t-slate-800" />
                              <span className="text-[8px] font-bold">Uploading...</span>
                            </div>
                          ) : (
                            <div className="relative w-full h-full flex flex-col items-center justify-between">
                              {isPdf ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-1">
                                  <FileText size={24} className="text-rose-500" />
                                  <span className="text-[8px] font-bold text-slate-600 truncate max-w-[120px]" title={item.fileName}>
                                    {item.fileName}
                                  </span>
                                </div>
                              ) : (
                                <img src={item.url} alt="Upload preview" className="w-full h-[65%] object-cover rounded-xl" />
                              )}
                              
                              <div className="w-full flex gap-1 justify-center mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePreviewUrl(item.url);
                                    setActivePreviewType(item.fileType || null);
                                  }}
                                  className="bg-white hover:bg-slate-100 text-slate-800 text-[8px] px-1 py-0.5 rounded border border-slate-200 font-black cursor-pointer"
                                >
                                  View
                                </button>
                                <a
                                  href={item.url}
                                  download={item.fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white hover:bg-slate-100 text-slate-800 text-[8px] px-1 py-0.5 rounded border border-slate-200 font-black flex items-center justify-center"
                                >
                                  Download
                                </a>
                                <label className="bg-white hover:bg-slate-100 text-slate-800 text-[8px] px-1 py-0.5 rounded border border-slate-200 font-black cursor-pointer">
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                                    className="hidden"
                                    onChange={e => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleReplaceFile(idx, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(idx)}
                                  className="bg-rose-600 hover:bg-rose-500 text-white text-[8px] px-1 py-0.5 rounded font-black cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                          {item.error && (
                            <div className="absolute inset-0 bg-rose-50/95 flex flex-col items-center justify-center p-2 text-center text-[8px] font-bold text-rose-600">
                              <span>Upload failed</span>
                              <div className="flex gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(idx)}
                                  className="underline uppercase"
                                >
                                  Remove
                                </button>
                                {item.file && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.file) {
                                        setPhotoItems(prev => prev.map((p, i) => i === idx ? { ...p, isUploading: true, error: undefined } : p));
                                        uploadSingleFile(item.file, idx);
                                      }
                                    }}
                                    className="underline uppercase text-slate-850"
                                  >
                                    Retry
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
 
            <div className="flex gap-3">
              <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold p-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-[10px] cursor-pointer">
                <Plus size={12} />
                <span>Upload Files</span>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                    }
                  }}
                />
              </label>
 
              <button
                type="button"
                onClick={handleAddUrlField}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-205 font-bold p-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-[10px] cursor-pointer"
              >
                <Plus size={12} />
                <span>Add URL</span>
              </button>
            </div>
          </div>
 
          {/* Remarks text area - shown conditionally and required only if Other is selected */}
          {reason === 'OTHER' && (
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason Details / Remarks *</label>
              <textarea
                required={reason === 'OTHER'}
                placeholder="Describe the details for selecting Other..."
                rows={3}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white font-semibold text-[11px]"
              />
            </div>
          )}
 
          {/* Submit */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isPending ? 'Submitting Return Claim...' : 'Submit Claim Request'}
            </button>
          </div>
        </form>
      )}
 
      {/* Lightbox Preview Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => { setActivePreviewUrl(null); setActivePreviewType(null); }}
            className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl p-2 cursor-pointer transition-colors border border-slate-700 font-bold z-50 flex items-center gap-1"
          >
            <X size={18} /> Close
          </button>
          <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
            {activePreviewUrl.toLowerCase().split('?')[0].endsWith('.pdf') || (activePreviewType && activePreviewType.includes('pdf')) ? (
              <iframe 
                src={activePreviewUrl} 
                className="w-full max-w-5xl h-[85vh] rounded-2xl bg-white border-0 shadow-2xl"
                title="Document Attachment Preview"
              />
            ) : (
              <img 
                src={activePreviewUrl} 
                alt="Preview Full Size" 
                className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
