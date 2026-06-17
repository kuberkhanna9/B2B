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
  FileText
} from 'lucide-react';

interface ReturnsClientProps {
  returns: any[];
  orders: any[];
  branches: any[];
  variants: any[];
  customerId: string;
}

export default function ReturnsClient({ returns, orders, branches, variants, customerId }: ReturnsClientProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');

  // Form Fields
  const [orderId, setOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState<'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER'>('DEFECTIVE');
  const [remarks, setRemarks] = useState('');
  
  // Return items list
  const [items, setItems] = useState<{ variantId: string; customItemName: string; isCustom: boolean; quantity: number }[]>([
    { variantId: '', customItemName: '', isCustom: false, quantity: 1 }
  ]);

  // Image upload URLs
  const [photos, setPhotos] = useState<string[]>(['']);

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

  const handleAddPhotoField = () => {
    setPhotos(prev => [...prev, '']);
  };

  const handleRemovePhotoField = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePhotoChange = (idx: number, val: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? val : p));
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!branchId) {
      setStatusMsg({ success: false, message: 'Please select which customer branch this claim belongs to.' });
      return;
    }

    const validItems = items.filter(item => (item.isCustom && item.customItemName.trim()) || (!item.isCustom && item.variantId));
    if (validItems.length === 0) {
      setStatusMsg({ success: false, message: 'Please specify at least one valid product to return.' });
      return;
    }

    const payloadItems = validItems.map(item => ({
      variantId: item.isCustom ? undefined : item.variantId,
      customItemName: item.isCustom ? item.customItemName : undefined,
      quantity: item.quantity
    }));

    const payloadPhotos = photos.filter(p => p.trim() !== '');

    setStatusMsg(null);
    startTransition(async () => {
      const res = await createReturnRequestAction({
        customerId,
        branchId,
        orderId: orderId || undefined,
        invoiceNumber: invoiceNumber || undefined,
        reason,
        remarks: remarks || undefined,
        items: payloadItems,
        photos: payloadPhotos
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
        setPhotos(['']);
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
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] uppercase tracking-wide">{r.reason.replace('_', ' ')}</span>
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
                <option value="DEFECTIVE">DEFECTIVE (Fabric Damage / Stitches)</option>
                <option value="SOR_RETURN">SOR RETURN (Sale or Return agreement)</option>
                <option value="WRONG_ITEM">WRONG ITEM RECEIVED (SKU Mismatch)</option>
                <option value="EXCESS_QUANTITY">EXCESS QUANTITY SHIPPED</option>
                <option value="CUSTOMER_REJECTION">CLIENT REJECTION (Commercial claim)</option>
                <option value="TRANSIT_DAMAGE">DAMAGE IN TRANSIT (Courier issue)</option>
                <option value="SIZE_ISSUE">SIZE SPECIFICATION ERROR</option>
                <option value="OTHER">OTHER (Describe in remarks)</option>
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

          {/* Photo references */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1"><Camera size={12} />Claim Proof Photos (URLs)</span>
            
            <div className="space-y-2">
              {photos.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="url"
                    placeholder="https://example.com/returned-garment-damage.jpg"
                    value={p}
                    onChange={e => handlePhotoChange(idx, e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white font-semibold"
                  />
                  {photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhotoField(idx)}
                      className="bg-white hover:bg-red-50 text-red-605 border border-slate-200 p-2 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddPhotoField}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold p-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-[10px] cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Photo Link</span>
            </button>
          </div>

          {/* Remarks text area */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reason Details / Remarks *</label>
            <textarea
              required
              placeholder="Describe the defect details, transit damage issues, color mismatches, etc. in depth..."
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white font-semibold text-[11px]"
            />
          </div>

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
    </div>
  );
}
