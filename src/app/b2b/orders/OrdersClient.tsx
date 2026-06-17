'use client';

import { useState } from 'react';
import { getOrderDetailsAction } from '@/app/actions';
import { 
  Eye, 
  Calendar, 
  DollarSign, 
  X, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle,
  TrendingUp,
  PackageCheck,
  ShoppingCart
} from 'lucide-react';
import { SalesOrder, SalesOrderItem } from '@/utils/types';

interface OrdersClientProps {
  orders: SalesOrder[];
}

export default function OrdersClient({ orders }: OrdersClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<SalesOrderItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOrderDetails = async (order: SalesOrder) => {
    setSelectedOrder(order);
    setSelectedOrderItems([]);
    setIsLoadingDetails(true);
    setErrorMsg('');

    try {
      const response = await getOrderDetailsAction(order.id);
      if (response.success && response.data) {
        setSelectedOrderItems(response.data.items);
      } else {
        setErrorMsg(response.error || 'Failed to fetch items.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Status mapping to steps
  const getTimelineSteps = (status: string) => {
    const steps = [
      { key: 'PENDING_APPROVAL', label: 'Submitted', desc: 'Awaiting admin review' },
      { key: 'APPROVED', label: 'Approved', desc: 'Stock reserved in warehouse' },
      { key: 'PARTIALLY_FULFILLED', label: 'Processing', desc: 'Partial items dispatched' },
      { key: 'DISPATCHED', label: 'Shipped', desc: 'Fully handed over to courier' },
      { key: 'DELIVERED', label: 'Delivered', desc: 'Received at destination' }
    ];

    if (status === 'CANCELLED') {
      return [
        { key: 'PENDING_APPROVAL', label: 'Submitted', active: true, done: true },
        { key: 'CANCELLED', label: 'Cancelled', active: true, error: true, desc: 'Order rejected or cancelled.' }
      ];
    }

    let currentStepIdx = steps.findIndex(s => s.key === status);
    if (status === 'APPROVED' && currentStepIdx === -1) currentStepIdx = 1;

    return steps.map((s, idx) => {
      const isDone = idx < currentStepIdx || status === s.key || (status === 'DISPATCHED' && idx <= 3) || (status === 'DELIVERED');
      const isActive = s.key === status;
      return {
        ...s,
        done: isDone,
        active: isActive
      };
    });
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingCart className="mx-auto text-slate-350 mb-2" size={24} />
            <p className="font-semibold text-xs">You have not placed any wholesale orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  <th className="px-6 py-4">Order Number</th>
                  <th className="px-6 py-4">Date Submitted</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">{o.orderNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(o.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[9px] font-black uppercase inline-block px-2.5 py-1 rounded-md ${
                        o.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        o.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                        o.status === 'PARTIALLY_FULFILLED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => fetchOrderDetails(o)}
                        className="bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 hover:text-white transition-all rounded-xl p-1.5 px-3 font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white flex flex-col shadow-2xl">
              
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Order Details</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">Number: {selectedOrder.orderNumber}</span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-650 focus:outline-none p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Status Timeline Steps */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-4">Fulfillment Status Timeline</span>
                  
                  {selectedOrder.status === 'CANCELLED' ? (
                    <div className="flex gap-4 items-start">
                      <div className="p-2 bg-red-50 text-red-650 rounded-xl border border-red-100"><X size={18} /></div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">Order Cancelled</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">This order has been cancelled or rejected by administrators.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-slate-200 z-0 hidden sm:block" />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                        {getTimelineSteps(selectedOrder.status).map((step, idx) => (
                          <div key={idx} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black border text-[10px] shrink-0 transition-colors ${
                              step.done
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="text-left sm:text-center">
                              <h5 className={`font-extrabold text-[10px] ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                                {step.label}
                              </h5>
                              {step.desc && (
                                <p className="text-[8px] text-slate-400 font-semibold mt-0.5 leading-none hidden sm:block">
                                  {step.desc}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Order Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Submission Date</span>
                    <span className="font-black text-slate-800 mt-1 block">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Order Subtotal</span>
                    <span className="font-black text-slate-900 mt-1 block text-sm">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* 3. Items list */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ordered Garment SKUs</span>
                  
                  {isLoadingDetails ? (
                    <div className="py-8 text-center text-slate-400 font-semibold">Loading items...</div>
                  ) : errorMsg ? (
                    <div className="py-4 text-center text-red-650 bg-red-50 rounded-xl border border-red-200 font-semibold">{errorMsg}</div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-450 tracking-wider">
                            <th className="px-4 py-2.5">Garment Details</th>
                            <th className="px-4 py-2.5 text-right">Ordered</th>
                            <th className="px-4 py-2.5 text-right">Approved</th>
                            <th className="px-4 py-2.5 text-right">Shipped</th>
                            <th className="px-4 py-2.5 text-right">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {selectedOrderItems.map(item => {
                            const remaining = Math.max(0, item.approvedQuantity - item.dispatchedQuantity);
                            return (
                              <tr key={item.id} className="hover:bg-slate-100/20 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  <span className="block text-xs font-black text-slate-900">{item.productName}</span>
                                  <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{item.sku} | Color: {item.colorName} | Size: {item.sizeName}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-500">{item.orderedQuantity}</td>
                                <td className="px-4 py-3 text-right font-black text-slate-900">
                                  {selectedOrder.status === 'PENDING_APPROVAL' ? '—' : item.approvedQuantity}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                  {selectedOrder.status === 'PENDING_APPROVAL' ? '—' : item.dispatchedQuantity}
                                </td>
                                <td className="px-4 py-3 text-right font-black text-slate-900">
                                  {selectedOrder.status === 'PENDING_APPROVAL' ? '—' : remaining}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. Remarks */}
                {selectedOrder.remarks && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Customer Remarks</span>
                    <p className="text-[10px] text-slate-600 font-semibold mt-1 leading-relaxed">{selectedOrder.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
