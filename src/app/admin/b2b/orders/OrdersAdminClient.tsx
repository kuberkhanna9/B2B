'use client';

import { useState, useTransition } from 'react';
import { approveOrderAction, rejectOrderAction, getOrderDetailsAction, convertCustomItemAction } from '@/app/actions';
import { 
  Eye, 
  Calendar, 
  DollarSign, 
  X, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ShoppingCart, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { SalesOrder, SalesOrderItem } from '@/utils/types';

interface OrdersAdminClientProps {
  orders: SalesOrder[];
  variants: any[];
}

export default function OrdersAdminClient({ orders, variants }: OrdersAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [customItems, setCustomItems] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Local quantity override adjustment map
  const [qtyAdjustments, setQtyAdjustments] = useState<Record<string, number>>({});
  // Replaced SKU mappings
  const [replacedVariantIds, setReplacedVariantIds] = useState<Record<string, string>>({});
  // Rejected SKU flags
  const [rejectedItemIds, setRejectedItemIds] = useState<Record<string, boolean>>({});

  // Custom Item Conversion State
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null);
  const [convSku, setConvSku] = useState('');
  const [convCategory, setConvCategory] = useState('');
  const [convColor, setConvColor] = useState('');
  const [convSize, setConvSize] = useState('');
  const [convCost, setConvCost] = useState(0);

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'PENDING_APPROVAL');
  const historyOrders = orders.filter(o => o.status !== 'PENDING_APPROVAL');
  
  const displayedOrders = activeTab === 'pending' ? pendingOrders : historyOrders;

  const handleReviewOrder = async (order: SalesOrder) => {
    setSelectedOrder(order);
    setItems([]);
    setCustomItems([]);
    setQtyAdjustments({});
    setReplacedVariantIds({});
    setRejectedItemIds({});
    setConvertingItemId(null);
    setIsLoadingDetails(true);
    setErrorMsg('');
    setStatus(null);

    try {
      const response = await getOrderDetailsAction(order.id);
      if (response.success && response.data) {
        setItems(response.data.items);
        setCustomItems(response.data.customItems || []);
        // Initialize local quantity overrides with the ordered values
        const initialAdjs: Record<string, number> = {};
        for (const item of response.data.items) {
          initialAdjs[item.id] = item.orderedQuantity;
        }
        setQtyAdjustments(initialAdjs);
      } else {
        setErrorMsg(response.error || 'Failed to load order items.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleQtyChange = (itemId: string, val: number, max: number) => {
    setQtyAdjustments(prev => {
      const parsed = Math.max(0, Math.min(val, max));
      return {
        ...prev,
        [itemId]: parsed
      };
    });
  };

  const handleApprove = () => {
    if (!selectedOrder) return;

    setStatus(null);
    startTransition(async () => {
      const adjustments = Object.entries(qtyAdjustments).map(([itemId, approvedQty]) => ({
        itemId,
        approvedQty,
        replacedVariantId: replacedVariantIds[itemId] || undefined,
        reject: rejectedItemIds[itemId] || approvedQty === 0
      }));

      const res = await approveOrderAction(selectedOrder.id, adjustments);
      if (res.success) {
        setStatus({ success: true, message: `Order ${selectedOrder.orderNumber} successfully approved and stock reserved!` });
        setSelectedOrder(null);
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ success: false, message: res.error || 'Failed to approve order.' });
      }
    });
  };

  const handleReject = () => {
    if (!selectedOrder) return;

    if (!confirm('Are you sure you want to reject and cancel this order?')) return;

    setStatus(null);
    startTransition(async () => {
      const res = await rejectOrderAction(selectedOrder.id);
      if (res.success) {
        setStatus({ success: true, message: `Order ${selectedOrder.orderNumber} successfully cancelled.` });
        setSelectedOrder(null);
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ success: false, message: res.error || 'Failed to reject order.' });
      }
    });
  };

  const handleConvertCustomItem = async (e: React.FormEvent, customItemId: string) => {
    e.preventDefault();
    if (!convSku.trim() || !convCategory.trim() || !convColor.trim() || !convSize.trim()) {
      alert('Please fill in all conversion fields.');
      return;
    }

    startTransition(async () => {
      const res = await convertCustomItemAction(customItemId, {
        sku: convSku,
        category: convCategory,
        colorName: convColor,
        sizeName: convSize,
        costPrice: convCost
      });

      if (res.success) {
        setConvertingItemId(null);
        alert('Custom item successfully converted to inventory product SKU!');
        if (selectedOrder) {
          handleReviewOrder(selectedOrder);
        }
      } else {
        alert(res.error || 'Failed to convert custom item.');
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
      
      {/* 1. Tab Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('pending'); setStatus(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'pending' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Pending Review Queue ({pendingOrders.length})
        </button>
        <button
          onClick={() => { setActiveTab('history'); setStatus(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          All Orders History ({historyOrders.length})
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          status.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* 2. List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {displayedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderOpen className="mx-auto text-slate-350 mb-2" size={24} />
            <p className="font-semibold">No order records in this queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-455 tracking-wider">
                  <th className="px-5 py-4">Order Number</th>
                  <th className="px-5 py-4">Client Customer</th>
                  <th className="px-5 py-4">Date Placed</th>
                  <th className="px-5 py-4 text-right">Order Subtotal</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-black text-slate-900">{o.orderNumber}</td>
                    <td className="px-5 py-3.5 font-black text-slate-800">{o.companyName}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-0.5 rounded-md ${
                        o.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        o.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                        o.status === 'PARTIALLY_FULFILLED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleReviewOrder(o)}
                        className="bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 hover:text-white transition-all rounded-xl p-1.5 px-3 font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-sm text-[10px]"
                      >
                        <Eye size={12} />
                        <span>{o.status === 'PENDING_APPROVAL' ? 'Review & Approve' : 'View Details'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Review Modal / Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden text-xs">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white flex flex-col shadow-2xl">
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {selectedOrder.status === 'PENDING_APPROVAL' ? 'Review Sales Order' : 'Order Details'}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">
                    {selectedOrder.orderNumber} — {selectedOrder.companyName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoadingDetails ? (
                  <div className="py-12 text-center text-slate-400 font-semibold">Loading items...</div>
                ) : errorMsg ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold">{errorMsg}</div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Items Table */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ordered Garment Matrix</span>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                              <th className="px-4 py-2.5">Garment Details</th>
                              <th className="px-4 py-2.5 text-right">Available Stock</th>
                              <th className="px-4 py-2.5 text-right">Ordered Qty</th>
                              <th className="px-4 py-2.5 text-center bg-slate-100/50">Approve Qty</th>
                              <th className="px-4 py-2.5 text-right">Price per pc</th>
                              <th className="px-4 py-2.5 text-right">Total Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {items.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-semibold italic">
                                  No standard catalogue SKUs in this order. See Custom Design Orders Matrix below.
                                </td>
                              </tr>
                            ) : (
                              items.map(item => {
                                const replacementId = replacedVariantIds[item.id];
                                const replacementVar = replacementId ? variants.find(v => v.variantId === replacementId) : null;
                                
                                const approvedQty = qtyAdjustments[item.id] !== undefined ? qtyAdjustments[item.id] : item.orderedQuantity;
                                const availStock = replacementVar ? replacementVar.availableStock : (item.availableStock ?? 0);
                                const hasStockError = approvedQty > availStock && selectedOrder.status === 'PENDING_APPROVAL';
                                const isRejected = rejectedItemIds[item.id] || approvedQty === 0;

                                return (
                                  <tr key={item.id} className={`hover:bg-slate-100/20 transition-colors ${isRejected ? 'opacity-40 bg-red-50/10' : ''}`}>
                                    {/* Details */}
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                      <span className="block text-xs font-black text-slate-905">{item.productName}</span>
                                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{item.sku} | {item.colorName} / {item.sizeName}</span>
                                      
                                      {selectedOrder.status === 'PENDING_APPROVAL' && (
                                        <div className="mt-2 space-y-1">
                                          <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Replace SKU</label>
                                          <select
                                            value={replacementId || ""}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setReplacedVariantIds(prev => ({ ...prev, [item.id]: val }));
                                              if (val) {
                                                const newVar = variants.find(v => v.variantId === val);
                                                const limit = newVar ? newVar.availableStock : 0;
                                                setQtyAdjustments(prev => ({ ...prev, [item.id]: Math.min(item.orderedQuantity, limit) }));
                                              } else {
                                                setQtyAdjustments(prev => ({ ...prev, [item.id]: item.orderedQuantity }));
                                              }
                                            }}
                                            className="bg-white border border-slate-200 rounded-lg p-1 text-[9px] w-full font-bold focus:outline-none focus:border-slate-800"
                                          >
                                            <option value="">-- No Replacement --</option>
                                            {variants.map(v => (
                                              <option key={v.variantId} value={v.variantId}>
                                                {v.productName} ({v.sku}) - {v.colorName} / {v.sizeName} (Stock: {v.availableStock})
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {replacementVar && (
                                        <span className="block text-[8px] text-blue-600 font-black mt-1 uppercase">Replaced with: {replacementVar.sku}</span>
                                      )}
                                    </td>
                                    
                                    {/* Available */}
                                    <td className="px-4 py-3 text-right font-bold">
                                      <span className={availStock <= 0 ? 'text-red-500 font-extrabold' : (availStock <= 5 ? 'text-amber-500' : 'text-slate-600') }>
                                        {availStock}
                                      </span>
                                    </td>

                                    {/* Ordered */}
                                    <td className="px-4 py-3 text-right font-bold text-slate-500">{item.orderedQuantity}</td>
                                    
                                    {/* Approve Qty input */}
                                    <td className="px-4 py-3 text-center bg-slate-50/50">
                                      {selectedOrder.status === 'PENDING_APPROVAL' ? (
                                        <div className="space-y-1.5">
                                          <input
                                            type="number"
                                            min={0}
                                            max={item.orderedQuantity}
                                            value={isRejected ? 0 : approvedQty}
                                            onChange={e => {
                                              const val = Number(e.target.value);
                                              handleQtyChange(item.id, val, item.orderedQuantity);
                                              if (val > 0) {
                                                setRejectedItemIds(prev => ({ ...prev, [item.id]: false }));
                                              }
                                            }}
                                            disabled={isRejected}
                                            className={`w-16 border rounded-lg px-2 py-1 text-center font-black focus:outline-none ${
                                              hasStockError 
                                                ? 'border-red-305 bg-red-50 text-red-750' 
                                                : 'border-slate-205 bg-white text-slate-900 focus:border-slate-900'
                                            }`}
                                          />
                                          <div className="flex justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQtyAdjustments(prev => ({ ...prev, [item.id]: item.orderedQuantity }));
                                                setRejectedItemIds(prev => ({ ...prev, [item.id]: false }));
                                              }}
                                              className="text-[8px] font-black uppercase text-emerald-650 hover:underline cursor-pointer"
                                            >
                                              Full
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQtyAdjustments(prev => ({ ...prev, [item.id]: 0 }));
                                                setRejectedItemIds(prev => ({ ...prev, [item.id]: true }));
                                              }}
                                              className="text-[8px] font-black uppercase text-red-650 hover:underline cursor-pointer"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="font-black text-slate-905">
                                          {item.approvedQuantity === 0 ? 'REJECTED' : item.approvedQuantity}
                                        </span>
                                      )}
                                      {hasStockError && !isRejected && (
                                        <span className="text-[7px] text-red-500 font-black uppercase mt-0.5 block animate-bounce">Deficit!</span>
                                      )}
                                    </td>

                                    {/* Price */}
                                    <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(item.pricePerUnit)}</td>
                                    
                                    {/* Total */}
                                    <td className="px-4 py-3 text-right font-black text-slate-905">
                                      {formatCurrency((isRejected ? 0 : approvedQty) * item.pricePerUnit)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Custom Design Items Table */}
                    {customItems.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Custom Design Orders Matrix</span>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                                <th className="px-4 py-2.5">Design Details</th>
                                <th className="px-4 py-2.5 text-right">Qty</th>
                                <th className="px-4 py-2.5 text-right">Price (WSP)</th>
                                <th className="px-4 py-2.5 text-right">MRP</th>
                                <th className="px-4 py-2.5 text-right">GST %</th>
                                <th className="px-4 py-2.5 text-center">Conversion / Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {customItems.map((cItem: any) => {
                                const isConverted = !!cItem.convertedVariantId;
                                const isConverting = convertingItemId === cItem.id;

                                return (
                                  <tr key={cItem.id} className="hover:bg-slate-100/10">
                                    <td className="px-4 py-3">
                                      <span className="block font-black text-slate-900">{cItem.itemName}</span>
                                      <span className="block text-[9px] text-slate-500 font-semibold">{cItem.description}</span>
                                      {cItem.remarks && <span className="block text-[8px] text-slate-400 mt-1">Remarks: {cItem.remarks}</span>}
                                      {cItem.imageUrl && (
                                        <a href={cItem.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[8px] text-blue-600 underline font-black uppercase mt-1">
                                          View Design Reference Image
                                        </a>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800">{cItem.quantity}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-600">{formatCurrency(cItem.wsp)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-500">{formatCurrency(cItem.mrp)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-500">{cItem.gstRate}%</td>
                                    <td className="px-4 py-3 text-center bg-slate-50/20">
                                      {isConverted ? (
                                        <span className="bg-emerald-50 text-emerald-700 text-[8px] border border-emerald-100 font-black uppercase px-2 py-0.5 rounded-lg">
                                          Converted to SKU
                                        </span>
                                      ) : selectedOrder.status === 'PENDING_APPROVAL' ? (
                                        isConverting ? (
                                          <form onSubmit={(e) => handleConvertCustomItem(e, cItem.id)} className="space-y-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-xs mx-auto">
                                            <div className="grid grid-cols-2 gap-2 text-[8px]">
                                              <div className="space-y-0.5">
                                                <label className="font-bold text-slate-400 uppercase">Category *</label>
                                                <input required type="text" value={convCategory} onChange={e => setConvCategory(e.target.value)} className="w-full border rounded px-1 py-0.5 bg-white text-slate-800 font-semibold focus:outline-none" />
                                              </div>
                                              <div className="space-y-0.5">
                                                <label className="font-bold text-slate-400 uppercase">Garment SKU *</label>
                                                <input required type="text" placeholder="PONCHO-BLK" value={convSku} onChange={e => setConvSku(e.target.value)} className="w-full border rounded px-1 py-0.5 bg-white text-slate-800 font-semibold focus:outline-none" />
                                              </div>
                                              <div className="space-y-0.5">
                                                <label className="font-bold text-slate-400 uppercase">Color *</label>
                                                <input required type="text" value={convColor} onChange={e => setConvColor(e.target.value)} className="w-full border rounded px-1 py-0.5 bg-white text-slate-800 font-semibold focus:outline-none" />
                                              </div>
                                              <div className="space-y-0.5">
                                                <label className="font-bold text-slate-400 uppercase">Size *</label>
                                                <input required type="text" value={convSize} onChange={e => setConvSize(e.target.value)} className="w-full border rounded px-1 py-0.5 bg-white text-slate-800 font-semibold focus:outline-none" />
                                              </div>
                                              <div className="col-span-2 space-y-0.5">
                                                <label className="font-bold text-slate-400 uppercase">Cost Price (Purchase Cost) *</label>
                                                <input required type="number" min={0} value={convCost} onChange={e => setConvCost(Number(e.target.value))} className="w-full border rounded px-1 py-0.5 bg-white text-slate-800 font-semibold focus:outline-none" />
                                              </div>
                                            </div>
                                            <div className="flex gap-1 pt-1">
                                              <button type="button" onClick={() => setConvertingItemId(null)} className="flex-1 bg-white hover:bg-slate-100 border text-slate-655 font-bold py-1 px-2 rounded text-[8px] text-center">Cancel</button>
                                              <button type="submit" disabled={isPending} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1 px-2 rounded text-[8px] text-center">Save Conversion</button>
                                            </div>
                                          </form>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setConvertingItemId(cItem.id);
                                              setConvSku(cItem.itemName.substring(0, 15).toUpperCase().replace(/\s+/g, '-'));
                                              setConvCategory('Sweaters');
                                              setConvColor('Default');
                                              setConvSize('Regular');
                                              setConvCost(Math.round(cItem.wsp * 0.7));
                                            }}
                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-sm select-none"
                                          >
                                            Convert to SKU
                                          </button>
                                        )
                                      ) : (
                                        <span className="text-slate-400 italic">Not Converted</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Remarks info */}
                    {selectedOrder.remarks && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Customer Remarks</span>
                        <p className="text-[10px] text-slate-650 font-semibold mt-1 leading-relaxed">{selectedOrder.remarks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons (only if pending approval) */}
              {selectedOrder.status === 'PENDING_APPROVAL' && !isLoadingDetails && !errorMsg && (
                <div className="border-t border-slate-200 p-6 bg-slate-50 flex gap-4">
                  <button
                    onClick={handleReject}
                    disabled={isPending}
                    className="flex-1 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 border border-slate-200 font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-xs disabled:opacity-50"
                  >
                    Reject Order
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isPending || Object.entries(qtyAdjustments).some(([id, qty]) => {
                      const item = items.find(i => i.id === id);
                      if (!item) return false;
                      const replacementId = replacedVariantIds[id];
                      const targetStock = replacementId 
                        ? (variants.find(v => v.variantId === replacementId)?.availableStock ?? 0)
                        : (item.availableStock ?? 0);
                      return qty > targetStock && !rejectedItemIds[id];
                    })}
                    className="flex-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-xs disabled:opacity-50 shadow-sm"
                  >
                    {isPending ? 'Processing Approval...' : 'Approve & Reserve Stock'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
