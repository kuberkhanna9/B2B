'use client';

import { useState, useTransition } from 'react';
import { createDispatchAction, getOrderDetailsAction } from '@/app/actions';
import { 
  Ship, 
  Calendar, 
  X, 
  Truck, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  FolderSync,
  ShoppingBag
} from 'lucide-react';
import { SalesOrder, SalesOrderItem, Dispatch } from '@/utils/types';

interface DispatchesAdminClientProps {
  activeOrders: SalesOrder[];
  dispatches: Dispatch[];
}

export default function DispatchesAdminClient({ activeOrders, dispatches }: DispatchesAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form Fields
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>({});

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenDispatchForm = async (order: SalesOrder) => {
    setSelectedOrder(order);
    setItems([]);
    setDispatchQuantities({});
    setCourier('');
    setTrackingNumber('');
    setRemarks('');
    setIsLoadingDetails(true);
    setErrorMsg('');
    setStatusMsg(null);

    try {
      const response = await getOrderDetailsAction(order.id);
      if (response.success && response.data) {
        setItems(response.data.items);
        
        // Initialize dispatch quantities to the remaining quantities to dispatch
        const initialQtys: Record<string, number> = {};
        for (const item of response.data.items) {
          const remaining = Math.max(0, item.approvedQuantity - item.dispatchedQuantity);
          // Auto fill with remaining or physical ready stock (whichever is smaller)
          const availPhysical = item.availableStock || 0;
          initialQtys[item.id] = Math.min(remaining, availPhysical);
        }
        setDispatchQuantities(initialQtys);
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
    setDispatchQuantities(prev => {
      const parsed = Math.max(0, Math.min(val, max));
      return {
        ...prev,
        [itemId]: parsed
      };
    });
  };

  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !courier || !trackingNumber) return;

    setStatusMsg(null);
    startTransition(async () => {
      const dispatchItems = Object.entries(dispatchQuantities)
        .map(([itemId, quantity]) => ({ itemId, quantity }))
        .filter(item => item.quantity > 0);

      if (dispatchItems.length === 0) {
        setStatusMsg({ success: false, message: 'Please specify dispatch quantities greater than zero.' });
        return;
      }

      const res = await createDispatchAction(
        selectedOrder.id,
        courier,
        trackingNumber,
        remarks,
        dispatchItems
      );

      if (res.success) {
        setStatusMsg({ success: true, message: 'Dispatch successfully created!' });
        setSelectedOrder(null);
        setTimeout(() => setStatusMsg(null), 5000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to create dispatch.' });
      }
    });
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('pending'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'pending' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Orders Awaiting Dispatch ({activeOrders.length})
        </button>
        <button
          onClick={() => { setActiveTab('history'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Dispatch History ({dispatches.length})
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

      {/* List Queue */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {activeOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle className="mx-auto text-slate-300 mb-2" size={24} />
              <p className="font-semibold">All approved orders have been fully dispatched!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-4">Order Number</th>
                    <th className="px-5 py-4">Wholesale Client</th>
                    <th className="px-5 py-4">Approval Date</th>
                    <th className="px-5 py-4 text-center">Fulfillment State</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-900">{o.orderNumber}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800">{o.companyName}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500">{o.approvedAt ? new Date(o.approvedAt).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-lg border ${
                          o.status === 'PARTIALLY_FULFILLED' ? 'bg-blue-50 text-blue-700 border-blue-150' : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                        }`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleOpenDispatchForm(o)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl p-1.5 px-3 flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-sm text-[10px]"
                        >
                          <Ship size={12} />
                          <span>Create Dispatch Shipment</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shipment History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {dispatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Ship className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold">No dispatches created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-4">Dispatch Number</th>
                    <th className="px-5 py-4">Courier Partner</th>
                    <th className="px-5 py-4">Tracking Reference</th>
                    <th className="px-5 py-4">Linked Sales Order</th>
                    <th className="px-5 py-4">Fulfillment Date</th>
                    <th className="px-5 py-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatches.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-900">{d.dispatchNumber}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 flex items-center gap-1.5"><Truck size={12} className="text-slate-400" />{d.courier}</td>
                      <td className="px-5 py-3.5 font-black text-slate-805">{d.trackingNumber}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800"><ShoppingBag size={12} className="text-slate-400 inline mr-1" />{d.orderNumber}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500"><Calendar size={12} className="text-slate-400 inline mr-1" />{new Date(d.dispatchDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-semibold max-w-xs truncate">{d.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Dispatch Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden text-xs">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white flex flex-col shadow-2xl">
              
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Create Dispatch Shipment</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">
                    Order: {selectedOrder.orderNumber} — Customer: {selectedOrder.companyName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitDispatch} className="flex-1 flex flex-col justify-between overflow-hidden">
                
                {/* Form fields scroll area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isLoadingDetails ? (
                    <div className="py-12 text-center text-slate-400 font-semibold">Loading items details...</div>
                  ) : errorMsg ? (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold">{errorMsg}</div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Courier and tracking details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Courier Partner *</label>
                          <input
                            type="text"
                            required
                            placeholder="E.g. Delhivery / FedEx / BlueDart"
                            value={courier}
                            onChange={e => setCourier(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tracking Reference / AWB *</label>
                          <input
                            type="text"
                            required
                            placeholder="Courier tracking receipt ID"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                          />
                        </div>
                      </div>

                      {/* Shipment Remarks */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Remarks / Packing Details</label>
                        <textarea
                          placeholder="E.g. Packed in 2 cartons, standard branding stickers attached..."
                          rows={2}
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                        />
                      </div>

                      {/* Items selection */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Fulfillment Quantities Dispatch Matrix</span>
                        
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                                <th className="px-4 py-2.5">Garment SKU</th>
                                <th className="px-4 py-2.5 text-right">Approved</th>
                                <th className="px-4 py-2.5 text-right">Already Shipped</th>
                                <th className="px-4 py-2.5 text-right">Remaining</th>
                                <th className="px-4 py-2.5 text-right bg-amber-50/20 text-amber-700">Ready Stock</th>
                                <th className="px-4 py-2.5 text-center bg-slate-100/50">Ship Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {items.map(item => {
                                const remaining = Math.max(0, item.approvedQuantity - item.dispatchedQuantity);
                                const shipQty = dispatchQuantities[item.id] !== undefined ? dispatchQuantities[item.id] : remaining;
                                const availPhysical = item.availableStock || 0;
                                const hasStockError = shipQty > availPhysical;

                                return (
                                  <tr key={item.id} className="hover:bg-slate-100/20 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-850">
                                      <span className="block text-xs font-black text-slate-900">{item.productName}</span>
                                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{item.sku} | {item.colorName} / {item.sizeName}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-550">{item.approvedQuantity}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.dispatchedQuantity}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-900">{remaining}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800 bg-amber-50/10">
                                      <span className={availPhysical <= 0 ? 'text-red-500 font-extrabold' : ''}>{availPhysical}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center bg-slate-50/50">
                                      <input
                                        type="number"
                                        min={0}
                                        max={Math.min(remaining, availPhysical)}
                                        value={shipQty}
                                        onChange={e => handleQtyChange(item.id, Number(e.target.value), Math.min(remaining, availPhysical))}
                                        disabled={remaining === 0 || availPhysical === 0}
                                        className={`w-16 border rounded-lg px-2 py-1 text-center font-black focus:outline-none ${
                                          hasStockError 
                                            ? 'border-red-305 bg-red-50 text-red-750' 
                                            : 'border-slate-205 bg-white text-slate-900 focus:border-slate-900'
                                        }`}
                                      />
                                      {remaining === 0 && <span className="text-[7px] text-emerald-600 font-black block mt-0.5 uppercase">Completed</span>}
                                      {remaining > 0 && availPhysical === 0 && <span className="text-[7px] text-red-500 font-black block mt-0.5 uppercase">Deficit</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {!isLoadingDetails && !errorMsg && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 rounded-xl cursor-pointer text-center text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || Object.entries(dispatchQuantities).some(([id, qty]) => {
                        const item = items.find(i => i.id === id);
                        return item ? qty > (item.availableStock ?? 0) : false;
                      })}
                      className="flex-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isPending ? 'Saving Shipment...' : 'Post Dispatch & Deduct Stock'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
