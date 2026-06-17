import { getSession } from '@/utils/session';
import { getDispatches } from '@/utils/db';
import Navigation from '@/components/Navigation';
import { Ship, Calendar, ShoppingBag, Truck, ExternalLink } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomerDispatchesPage() {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    redirect('/login');
  }

  // Fetch dispatches for this customer
  const dispatches = await getDispatches(user.customerId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dispatch Tracking</h1>
          <p className="text-slate-500 text-xs mt-1">Track partial or full shipments handed over to carriers, courier services, and tracking reference numbers.</p>
        </div>

        {/* Dispatches Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Ship size={14} className="text-slate-500" />
            <span className="text-xs font-black text-slate-900 uppercase">Shipped Consignments</span>
          </div>

          {dispatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Ship className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold text-xs">No dispatches created for your account yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    <th className="px-6 py-4">Dispatch Number</th>
                    <th className="px-6 py-4">Courier Partner</th>
                    <th className="px-6 py-4">Tracking Reference</th>
                    <th className="px-6 py-4">Shipment Date</th>
                    <th className="px-6 py-4">Linked Order</th>
                    <th className="px-6 py-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatches.map((disp: any) => (
                    <tr key={disp.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Dispatch Number */}
                      <td className="px-6 py-4 font-black text-slate-900">{disp.dispatchNumber}</td>

                      {/* Courier */}
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Truck size={12} className="text-slate-400" />
                          {disp.courier}
                        </div>
                      </td>

                      {/* Tracking number */}
                      <td className="px-6 py-4 font-black text-slate-800">
                        <div className="flex items-center gap-1 text-slate-900">
                          <span>{disp.trackingNumber}</span>
                        </div>
                      </td>

                      {/* Dispatch Date */}
                      <td className="px-6 py-4 font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(disp.dispatchDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Order linkage */}
                      <td className="px-6 py-4 font-black text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag size={12} className="text-slate-400" />
                          {disp.orderNumber || '—'}
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="px-6 py-4 text-slate-500 font-semibold max-w-xs truncate">
                        {disp.remarks || <span className="text-slate-300">No notes</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
