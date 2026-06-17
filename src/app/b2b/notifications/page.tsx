import { getSession } from '@/utils/session';
import { getNotifications } from '@/utils/db';
import { dismissNotificationsAction } from '@/app/actions';
import Navigation from '@/components/Navigation';
import { 
  Bell, 
  ShoppingCart, 
  Ship, 
  Receipt, 
  CreditCard, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import { redirect } from 'next/navigation';
import DismissNotificationsTrigger from './DismissNotificationsTrigger';

export const revalidate = 0;

export default async function CustomerNotificationsPage() {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    redirect('/login');
  }

  // Fetch notifications
  const notifications = await getNotifications(user.customerId);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_SUBMITTED':
      case 'ORDER_APPROVED':
      case 'ORDER_REJECTED':
        return <ShoppingCart size={14} className="text-blue-500" />;
      case 'DISPATCH_CREATED':
        return <Ship size={14} className="text-emerald-500" />;
      case 'INVOICE_UPLOADED':
        return <Receipt size={14} className="text-purple-500" />;
      case 'PAYMENT_VERIFIED':
      case 'PAYMENT_REJECTED':
        return <CreditCard size={14} className="text-amber-500" />;
      default:
        return <Bell size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      {/* Invisible trigger to automatically mark notifications as read on the server */}
      <DismissNotificationsTrigger />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Notifications</h1>
            <p className="text-slate-500 text-xs mt-1">Updates on order approvals, dispatches, and accounts ledgers validations.</p>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl space-y-4 text-xs font-semibold">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="mx-auto text-slate-350 mb-2" size={24} />
              <p className="font-semibold text-xs">No alerts or notifications recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-3">
              {notifications.map((n: any) => (
                <div key={n.id} className="flex gap-4 items-start pt-3 first:pt-0">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className={`text-xs ${n.read ? 'text-slate-600 font-semibold' : 'text-slate-950 font-black'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                      <Clock size={10} />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      {!n.read && (
                        <span className="bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-1 py-0.5 rounded border border-blue-200">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
