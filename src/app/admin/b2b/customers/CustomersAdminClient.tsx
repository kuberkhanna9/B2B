'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { 
  createCustomerAction, 
  createCustomerUserAction, 
  setCustomerPricingAction, 
  deleteCustomerPricingAction,
  updateCustomerStatusAction,
  createBranchAction
} from '@/app/actions';
import { 
  Users, 
  UserPlus, 
  Key, 
  Tags, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Mail,
  Phone,
  ShieldAlert,
  Search,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { Customer, CustomerUser, CustomerPricing, CustomerBranch } from '@/utils/types';

interface VariantInfo {
  variantId: string;
  sku: string;
  productName: string;
  colorName: string;
  sizeName: string;
  wholesalePrice: number;
}

interface CustomersAdminClientProps {
  customers: Customer[];
  customerUsers: CustomerUser[];
  variants: VariantInfo[];
  pricing: CustomerPricing[];
  branches: CustomerBranch[];
}

const initialFormState = { success: false, error: '', message: '' };

export default function CustomersAdminClient({ customers, customerUsers, variants, pricing, branches }: CustomersAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'branches' | 'users' | 'pricing'>('clients');

  // Onboarding branches list state
  const [onboardingBranches, setOnboardingBranches] = useState<{
    branchName: string;
    branchCode: string;
    contactPerson: string;
    phone: string;
    email: string;
    gst: string;
    billingAddress: string;
    shippingAddress: string;
  }[]>([]);

  // Individual branch registry form states (Tab 4)
  const [newBranchCust, setNewBranchCust] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchContact, setNewBranchContact] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchGst, setNewBranchGst] = useState('');
  const [newBranchBilling, setNewBranchBilling] = useState('');
  const [newBranchShipping, setNewBranchShipping] = useState('');

  // Submissions State
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Form states (Custom Pricing)
  const [prCustomer, setPrCustomer] = useState('');
  const [prVariant, setPrVariant] = useState('');
  const [prPrice, setPrPrice] = useState('');
  const [variantFilterQuery, setVariantFilterQuery] = useState('');

  // Tab 1 Action state hooks
  const [custFormState, custFormAction, isCustPending] = useActionState(createCustomerAction, initialFormState);
  const [userFormState, userFormAction, isUserPending] = useActionState(createCustomerUserAction, initialFormState);

  useEffect(() => {
    if (custFormState.success) {
      setOnboardingBranches([]);
    }
  }, [custFormState.success]);

  // Status Toggles
  const handleToggleCustomerStatus = (cId: string, active: boolean) => {
    startTransition(async () => {
      const res = await updateCustomerStatusAction(cId, !active);
      if (res.success) {
        setStatusMsg({ success: true, message: 'Customer account status successfully toggled!' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to update.' });
      }
    });
  };

  // Submit custom price override
  const handleSetPriceOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prCustomer || !prVariant || !prPrice || Number(prPrice) < 0) return;

    setStatusMsg(null);
    startTransition(async () => {
      const res = await setCustomerPricingAction(prCustomer, prVariant, Number(prPrice));
      if (res.success) {
        setStatusMsg({ success: true, message: 'Custom SKU pricing override successfully updated!' });
        setPrPrice('');
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to set pricing.' });
      }
    });
  };

  // Delete price override
  const handleDeletePriceOverride = (pricingId: string) => {
    startTransition(async () => {
      const res = await deleteCustomerPricingAction(pricingId);
      if (res.success) {
        setStatusMsg({ success: true, message: 'Custom SKU price override removed.' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    });
  };

  const handleRegisterBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchCust || !newBranchName || !newBranchCode) return;

    setStatusMsg(null);
    startTransition(async () => {
      const res = await createBranchAction(newBranchCust, {
        branchName: newBranchName,
        branchCode: newBranchCode,
        contactPerson: newBranchContact,
        phone: newBranchPhone,
        email: newBranchEmail,
        gst: newBranchGst,
        billingAddress: newBranchBilling,
        shippingAddress: newBranchShipping
      });
      if (res.success) {
        setStatusMsg({ success: true, message: 'Customer branch successfully registered!' });
        setNewBranchName('');
        setNewBranchCode('');
        setNewBranchContact('');
        setNewBranchPhone('');
        setNewBranchEmail('');
        setNewBranchGst('');
        setNewBranchBilling('');
        setNewBranchShipping('');
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to register branch.' });
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

  // Search filter variants for dropdown picker
  const filteredVariants = variants.filter(v => 
    v.sku.toLowerCase().includes(variantFilterQuery.toLowerCase()) ||
    v.productName.toLowerCase().includes(variantFilterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* 1. Tab Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('clients'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'clients' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Wholesale Client Registries
        </button>
        <button
          onClick={() => { setActiveTab('branches'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'branches' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Branch Registry
        </button>
        <button
          onClick={() => { setActiveTab('users'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Customer Portal Logins
        </button>
        <button
          onClick={() => { setActiveTab('pricing'); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === 'pricing' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Customer Price Overrides
        </button>
      </div>

      {/* Global Status messages */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* =============================================================================
          TAB 1: CLIENT REGISTRATION
          ============================================================================= */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Client Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-max">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Building size={14} className="text-slate-500" />
              Register New Client
            </h2>
            <form action={custFormAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="E.g. ABC Exports Ltd."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Primary Email *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={12} /></span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="accounts@abc.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={12} /></span>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91 99999 99999"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Billing Address</label>
                <textarea
                  name="billingAddress"
                  placeholder="Official billing address..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Shipping Address</label>
                <textarea
                  name="shippingAddress"
                  placeholder="Primary warehouse shipping address..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              {/* Branch Onboarding Registry */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Onboarding Branches</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingBranches([
                        ...onboardingBranches,
                        { branchName: '', branchCode: '', contactPerson: '', phone: '', email: '', gst: '', billingAddress: '', shippingAddress: '' }
                      ]);
                    }}
                    className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Plus size={10} /> Add Branch
                  </button>
                </div>

                {onboardingBranches.length > 0 && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto">
                    {onboardingBranches.map((br, index) => (
                      <div key={index} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setOnboardingBranches(onboardingBranches.filter((_, i) => i !== index));
                          }}
                          className="absolute right-2 top-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                        
                        <div className="text-[9px] font-bold text-slate-400">Branch #{index + 1}</div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Branch Name *"
                            required
                            value={br.branchName}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].branchName = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Branch Code *"
                            required
                            value={br.branchCode}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].branchCode = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Contact Person"
                            value={br.contactPerson}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].contactPerson = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="GSTIN"
                            value={br.gst}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].gst = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Phone"
                            value={br.phone}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].phone = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={br.email}
                            onChange={(e) => {
                              const updated = [...onboardingBranches];
                              updated[index].email = e.target.value;
                              setOnboardingBranches(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                          />
                        </div>

                        <textarea
                          placeholder="Billing Address (Defaults to Company's)"
                          rows={1}
                          value={br.billingAddress}
                          onChange={(e) => {
                            const updated = [...onboardingBranches];
                            updated[index].billingAddress = e.target.value;
                            setOnboardingBranches(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                        />

                        <textarea
                          placeholder="Shipping Address (Defaults to Company's)"
                          rows={1}
                          value={br.shippingAddress}
                          onChange={(e) => {
                            const updated = [...onboardingBranches];
                            updated[index].shippingAddress = e.target.value;
                            setOnboardingBranches(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:bg-white font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <input type="hidden" name="branchesJson" value={JSON.stringify(onboardingBranches)} />
              </div>

              {custFormState.error && (
                <p className="text-[10px] text-red-650 bg-red-50 border border-red-200 p-2.5 rounded-xl font-bold">{custFormState.error}</p>
              )}

              {custFormState.success && (
                <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-bold">{custFormState.message}</p>
              )}

              <button
                type="submit"
                disabled={isCustPending}
                className="w-full bg-slate-905 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {isCustPending ? 'Saving...' : 'Register Client'}
              </button>
            </form>
          </div>

          {/* Customer registry table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-max">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Client Accounts Registry</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-3">Client Company</th>
                    <th className="px-5 py-3">Contact Details</th>
                    <th className="px-5 py-3">Addresses</th>
                    <th className="px-5 py-3 text-center">Active Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">No customer records.</td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-5 py-3.5 font-black text-slate-900">{c.companyName}</td>
                        <td className="px-5 py-3.5 text-slate-500">
                          <span className="block font-bold">{c.email}</span>
                          {c.phone && <span className="block text-[10px] font-semibold mt-0.5">{c.phone}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate font-medium">
                          {c.billingAddress && <span className="block truncate">Bill: {c.billingAddress}</span>}
                          {c.shippingAddress && <span className="block truncate mt-0.5">Ship: {c.shippingAddress}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleCustomerStatus(c.id, c.active)}
                            disabled={isPending}
                            className={`font-black text-[9px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              c.active 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {c.active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================================
          TAB 1.5: BRANCH REGISTRY & LISTING
          ============================================================================= */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Branch Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-max">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-500" />
              Register New Branch
            </h2>
            <form onSubmit={handleRegisterBranch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Customer Company *</label>
                <select
                  value={newBranchCust}
                  onChange={e => setNewBranchCust(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Choose client...</option>
                  {customers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Delhi Depot"
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. DEL-02"
                    value={newBranchCode}
                    onChange={e => setNewBranchCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Sanjay Gupta"
                    value={newBranchContact}
                    onChange={e => setNewBranchContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">GSTIN</label>
                  <input
                    type="text"
                    placeholder="07AAAAA1111A1Z2"
                    value={newBranchGst}
                    onChange={e => setNewBranchGst(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 99999 11111"
                    value={newBranchPhone}
                    onChange={e => setNewBranchPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    placeholder="delhi@abc.com"
                    value={newBranchEmail}
                    onChange={e => setNewBranchEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Billing Address</label>
                <textarea
                  placeholder="Official billing address for this branch..."
                  rows={2}
                  value={newBranchBilling}
                  onChange={e => setNewBranchBilling(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Shipping Address</label>
                <textarea
                  placeholder="Warehouse delivery address for this branch..."
                  rows={2}
                  value={newBranchShipping}
                  onChange={e => setNewBranchShipping(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {isPending ? 'Registering...' : 'Register Branch'}
              </button>
            </form>
          </div>

          {/* Branches Listing Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-max">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Branch Registries</span>
              </div>
              <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{branches.length} Branches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-3">Branch Name / Code</th>
                    <th className="px-5 py-3">Linked Customer</th>
                    <th className="px-5 py-3">Contact & GSTIN</th>
                    <th className="px-5 py-3">Delivery Address</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No branch registry records found.</td>
                    </tr>
                  ) : (
                    branches.map((b) => {
                      const cust = customers.find(c => c.id === b.customerId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-black text-slate-900 block">{b.branchName}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{b.branchCode}</span>
                          </td>
                          <td className="px-5 py-3.5 font-black text-slate-800">{cust ? cust.companyName : 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-slate-500">
                            {b.contactPerson && <span className="block font-bold text-slate-700">{b.contactPerson}</span>}
                            {b.phone && <span className="block text-[9px] font-medium mt-0.5">{b.phone}</span>}
                            {b.gst && <span className="block text-[8px] font-mono font-bold bg-indigo-50 text-indigo-700 w-max px-1.5 py-0.5 rounded-md mt-1">GST: {b.gst}</span>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate font-medium">
                            <span className="block truncate">{b.shippingAddress || b.billingAddress}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <a
                              href={`/admin/b2b/orders/new?customerId=${b.customerId}&branchId=${b.id}`}
                              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Create Order
                              <ArrowRight size={10} />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-max">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Key size={14} className="text-slate-500" />
              Register Portal User
            </h2>
            <form action={userFormAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Customer Company *</label>
                <select
                  name="customerId"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Choose client...</option>
                  {customers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">User Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Primary contact name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Login Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="client@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Login ID (Username) *</label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="abc_exports"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Initial Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              {userFormState.error && (
                <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl font-bold">{userFormState.error}</p>
              )}

              {userFormState.success && (
                <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-bold">{userFormState.message}</p>
              )}

              <button
                type="submit"
                disabled={isUserPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {isUserPending ? 'Saving...' : 'Register Portal User'}
              </button>
            </form>
          </div>

          {/* Portal logins table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-max">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Key size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Portal Logins Registry</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-3">Login Name</th>
                    <th className="px-5 py-3">Username / ID</th>
                    <th className="px-5 py-3">Linked Customer</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">No portal login records.</td>
                    </tr>
                  ) : (
                    customerUsers.map((u) => {
                      const cust = customers.find(c => c.id === u.customerId);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-black text-slate-900 block">{u.fullName}</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{u.email}</span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">{u.username}</td>
                          <td className="px-5 py-3.5 font-black text-slate-800">{cust ? cust.companyName : 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                              u.active 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-red-50 text-red-755 border-red-100'
                            }`}>
                              {u.active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================================
          TAB 3: CUSTOMER SPECIFIC PRICING OVERRIDES
          ============================================================================= */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Pricing Override Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-max space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Tags size={14} className="text-slate-500" />
              Configure Specific Price Override
            </h2>
            <form onSubmit={handleSetPriceOverride} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Customer Company *</label>
                <select
                  value={prCustomer}
                  onChange={e => setPrCustomer(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Choose client...</option>
                  {customers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>

              {/* Variant search filter query */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filter Garment Variant Options</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={11} /></span>
                  <input
                    type="text"
                    placeholder="Type SKU or garment name..."
                    value={variantFilterQuery}
                    onChange={e => setVariantFilterQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Garment Variant (SKU) *</label>
                <select
                  value={prVariant}
                  onChange={e => setPrVariant(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Choose variant SKU...</option>
                  {filteredVariants.slice(0, 100).map(v => (
                    <option key={v.variantId} value={v.variantId}>
                      {v.sku} — {v.productName} ({v.colorName}/{v.sizeName}) [Wholesale: ₹{v.wholesalePrice}]
                    </option>
                  ))}
                </select>
                {filteredVariants.length > 100 && (
                  <span className="text-[8px] text-slate-400 font-bold italic mt-1 block">Showing first 100 matches. Use search filter above.</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custom Price (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="Override price, e.g. 850"
                  value={prPrice}
                  onChange={e => setPrPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                {isPending ? 'Saving Override...' : 'Set Pricing Override'}
              </button>
            </form>
          </div>

          {/* Price overrides list table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-max">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Tags size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Client Pricing Overrides</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase text-slate-455 tracking-wider">
                    <th className="px-5 py-3">Client Company</th>
                    <th className="px-5 py-3">Garment variant SKU</th>
                    <th className="px-5 py-3 text-right">Standard Wholesale</th>
                    <th className="px-5 py-3 text-right">Custom Price Override</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pricing.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No custom price overrides defined yet.</td>
                    </tr>
                  ) : (
                    pricing.map((p) => {
                      const cust = customers.find(c => c.id === p.customerId);
                      const variant = variants.find(v => v.variantId === p.variantId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-5 py-3 font-black text-slate-900">{cust ? cust.companyName : 'Unknown'}</td>
                          <td className="px-5 py-3 font-bold text-slate-700">
                            {variant ? (
                              <>
                                <span className="block text-slate-800">{variant.productName} ({variant.colorName}/{variant.sizeName})</span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">{variant.sku}</span>
                              </>
                            ) : 'Unknown variant'}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-450">
                            {variant ? formatCurrency(variant.wholesalePrice) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-black text-emerald-700 bg-emerald-50/20">
                            {formatCurrency(p.customPrice)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => handleDeletePriceOverride(p.id)}
                              disabled={isPending}
                              className="text-slate-450 hover:text-red-500 cursor-pointer p-1.5 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
