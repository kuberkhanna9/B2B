'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  createOrderOnBehalfAction,
  getB2BCatalogAction
} from '@/app/actions';
import { 
  Building,
  MapPin,
  FileText,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Tag,
  Package,
  ArrowLeft
} from 'lucide-react';
import { Customer, CustomerBranch } from '@/utils/types';

interface CatalogProduct {
  productId: string;
  productName: string;
  category: string;
  variants: {
    variantId: string;
    sku: string;
    colorName: string;
    sizeName: string;
    availableStock: number;
    customerPrice: number;
    mrp: number;
  }[];
}

interface CreateOrderOnBehalfClientProps {
  customers: Customer[];
  branches: CustomerBranch[];
  initialCatalog: CatalogProduct[];
}

function OrderOnBehalfForm({ customers, branches, initialCatalog }: CreateOrderOnBehalfClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL Pre-fills
  const preFilledCust = searchParams.get('customerId') || '';
  const preFilledBranch = searchParams.get('branchId') || '';

  // Core order states
  const [selectedCust, setSelectedCust] = useState(preFilledCust);
  const [selectedBranch, setSelectedBranch] = useState(preFilledBranch);
  const [orderSource, setOrderSource] = useState('WHATSAPP');
  const [remarks, setRemarks] = useState('');
  
  // Catalog & pricing state
  const [catalog, setCatalog] = useState<CatalogProduct[]>(initialCatalog);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart states
  const [standardCart, setStandardCart] = useState<{ variantId: string; sku: string; name: string; price: number; quantity: number }[]>([]);
  const [customCart, setCustomCart] = useState<{
    itemName: string;
    description: string;
    quantity: number;
    wsp: number;
    mrp: number;
    gstPercent: number;
    hsnCode: string;
    remarks: string;
    imageUrl?: string;
  }[]>([]);

  // Custom item form states
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cQty, setCQty] = useState('1');
  const [cWsp, setCWsp] = useState('');
  const [cMrp, setCMrp] = useState('');
  const [cGst, setCGst] = useState('18');
  const [cHsn, setCHsn] = useState('');
  const [cRemarks, setCRemarks] = useState('');
  const [cImage, setCImage] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Submissions State
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Filter branches of selected customer
  const filteredBranches = branches.filter(b => b.customerId === selectedCust && b.status === 'ACTIVE');

  // Trigger customer catalog pricing fetch when selected customer changes
  useEffect(() => {
    if (!selectedCust) {
      setCatalog(initialCatalog);
      setStandardCart([]);
      return;
    }

    setCatalogLoading(true);
    startTransition(async () => {
      const res = await getB2BCatalogAction(selectedCust);
      setCatalogLoading(false);
      if (res.success && res.data) {
        setCatalog(res.data);
      } else {
        console.error('Failed to load customer catalog:', res.error);
        setCatalog(initialCatalog);
      }
    });

    // Reset branch selection if the prefilled branch does not belong to new customer
    const match = branches.find(b => b.id === selectedBranch && b.customerId === selectedCust);
    if (!match) {
      setSelectedBranch('');
    }
  }, [selectedCust]);

  // Handle standard item quantity adjustments
  const handleAddToStandardCart = (variant: any, pName: string) => {
    const exists = standardCart.find(item => item.variantId === variant.variantId);
    if (exists) {
      if (exists.quantity >= variant.availableStock) {
        alert('Insufficient physical stock available in warehouse!');
        return;
      }
      setStandardCart(standardCart.map(item => 
        item.variantId === variant.variantId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (variant.availableStock <= 0) {
        alert('This variant is out of stock!');
        return;
      }
      setStandardCart([...standardCart, {
        variantId: variant.variantId,
        sku: variant.sku,
        name: `${pName} (${variant.colorName}/${variant.sizeName})`,
        price: variant.customerPrice,
        quantity: 1
      }]);
    }
  };

  const handleUpdateQty = (variantId: string, qty: number, maxStock: number) => {
    if (qty <= 0) {
      setStandardCart(standardCart.filter(item => item.variantId !== variantId));
      return;
    }
    if (qty > maxStock) {
      alert(`Only ${maxStock} items available in stock!`);
      return;
    }
    setStandardCart(standardCart.map(item => 
      item.variantId === variantId ? { ...item, quantity: qty } : item
    ));
  };

  // Handle custom design items addition
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cQty || !cWsp || !cMrp) return;

    setCustomCart([...customCart, {
      itemName: cName,
      description: cDesc,
      quantity: Number(cQty),
      wsp: Number(cWsp),
      mrp: Number(cMrp),
      gstPercent: Number(cGst),
      hsnCode: cHsn,
      remarks: cRemarks,
      imageUrl: cImage || undefined
    }]);

    // Reset Custom Form
    setCName('');
    setCDesc('');
    setCQty('1');
    setCWsp('');
    setCMrp('');
    setCGst('18');
    setCHsn('');
    setCRemarks('');
    setCImage('');
    setShowCustomForm(false);
  };

  // Cart total calculations
  const totalStandardPrice = standardCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCustomPrice = customCart.reduce((sum, item) => sum + (item.wsp * item.quantity), 0);
  const finalTotal = totalStandardPrice + totalCustomPrice;

  // Submit complete order
  const handleSubmitOrder = () => {
    if (!selectedCust) {
      setStatusMsg({ success: false, message: 'Please select a wholesale customer.' });
      return;
    }
    if (!selectedBranch) {
      setStatusMsg({ success: false, message: 'Please select a shipping/billing customer branch.' });
      return;
    }
    if (standardCart.length === 0 && customCart.length === 0) {
      setStatusMsg({ success: false, message: 'Order cart is empty! Please add standard or custom items.' });
      return;
    }

    setStatusMsg(null);
    startTransition(async () => {
      const orderItems = standardCart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price
      }));

      const res = await createOrderOnBehalfAction(
        selectedCust,
        selectedBranch,
        orderSource,
        orderItems,
        customCart,
        remarks
      );

      if (res.success) {
        setStatusMsg({ success: true, message: res.message || 'Order placed successfully!' });
        setStandardCart([]);
        setCustomCart([]);
        setRemarks('');
        setTimeout(() => {
          router.push('/admin/b2b/orders');
        }, 2000);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to place order.' });
      }
    });
  };

  // Catalog filtering
  const filteredCatalog = catalog.filter(p => 
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-xs font-semibold">
      
      {/* Configuration Form & Cart (Left Side) */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Step 1: Customer Branch Selection */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Building size={14} className="text-slate-500" />
            1. Client & Source Setup
          </h2>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Client Company *</label>
              <select
                value={selectedCust}
                onChange={e => setSelectedCust(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">Choose wholesale client...</option>
                {customers.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Shipping Branch *</label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                disabled={!selectedCust}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold disabled:opacity-50"
              >
                <option value="">Choose client branch...</option>
                {filteredBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
              {!selectedCust && (
                <span className="text-[8.5px] text-slate-400 block italic">Please select a client first.</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ordering Channel Source *</label>
              <select
                value={orderSource}
                onChange={e => setOrderSource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="WHATSAPP">WhatsApp Message</option>
                <option value="PHONE">Phone Call</option>
                <option value="EMAIL">Official Email</option>
                <option value="ADMIN_CREATED">Direct Admin Entry</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Item Adder */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-slate-500" />
              2. Custom Non-SKU Item
            </h2>
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              {showCustomForm ? 'Cancel' : '+ Add Custom Item'}
            </button>
          </div>

          {showCustomForm && (
            <form onSubmit={handleAddCustomItem} className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Custom Item Name *"
                  required
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <textarea
                  placeholder="Item description (fabric details, custom school specs)..."
                  rows={2}
                  value={cDesc}
                  onChange={e => setCDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-tight">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Qty"
                    value={cQty}
                    onChange={e => setCQty(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-tight">WSP (Wholesale) *</label>
                  <input
                    type="number"
                    required
                    placeholder="WSP"
                    value={cWsp}
                    onChange={e => setCWsp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-tight">MRP (Retail) *</label>
                  <input
                    type="number"
                    required
                    placeholder="MRP"
                    value={cMrp}
                    onChange={e => setCMrp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-tight">GST %</label>
                  <input
                    type="number"
                    placeholder="E.g. 12"
                    value={cGst}
                    onChange={e => setCGst(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-tight">HSN Code</label>
                  <input
                    type="text"
                    placeholder="HSN"
                    value={cHsn}
                    onChange={e => setCHsn(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Design Image URL (optional)"
                  value={cImage}
                  onChange={e => setCImage(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Remarks/Production details"
                  value={cRemarks}
                  onChange={e => setCRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-slate-800 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Add Custom Item to Order
              </button>
            </form>
          )}

          {/* Custom cart display */}
          {customCart.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Custom items added:</span>
              <div className="space-y-1.5">
                {customCart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-indigo-50/40 border border-indigo-100 rounded-xl p-2.5">
                    <div>
                      <span className="font-black text-slate-900 block">{item.itemName}</span>
                      <span className="text-[9px] font-medium text-slate-500">Qty: {item.quantity} × WSP: ₹{item.wsp}</span>
                    </div>
                    <button
                      onClick={() => setCustomCart(customCart.filter((_, i) => i !== index))}
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Remarks & Submission */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <FileText size={14} className="text-slate-500" />
            3. Finalize Order
          </h2>

          <div className="space-y-3">
            <textarea
              placeholder="Internal notes/remarks..."
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
            />

            {statusMsg && (
              <div className={`p-4 rounded-xl border flex gap-2 items-start ${
                statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {statusMsg.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span className="text-[10px]">{statusMsg.message}</span>
              </div>
            )}

            <button
              onClick={handleSubmitOrder}
              disabled={isPending}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
            >
              {isPending ? 'Placing Order...' : `Submit Order (Total: ₹${finalTotal.toLocaleString('en-IN')})`}
            </button>
          </div>
        </div>

      </div>

      {/* Cart Items and Product Catalogue Selector (Right Side) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Shopping Cart Summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Package size={14} className="text-slate-500" />
            Standard Order Cart
          </h2>

          {standardCart.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">No standard inventory items selected yet. Click SKUs in catalogue below.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {standardCart.map(item => (
                <div key={item.variantId} className="flex justify-between items-center py-3">
                  <div>
                    <span className="font-black text-slate-905 text-slate-950 block">{item.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700">₹{item.price.toLocaleString('en-IN')} / unit</span>
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => handleUpdateQty(item.variantId, item.quantity - 1, 99999)}
                        className="px-2 py-1 hover:bg-slate-200 cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <span className="px-2 py-1 bg-white font-bold text-[10px] w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const lookup = catalog.flatMap(p => p.variants).find(v => v.variantId === item.variantId);
                          handleUpdateQty(item.variantId, item.quantity + 1, lookup ? lookup.availableStock : 99999);
                        }}
                        className="px-2 py-1 hover:bg-slate-200 cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleUpdateQty(item.variantId, 0, 0)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Catalogue Browser */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-slate-500" />
              Catalogue Product variants selector
            </h2>
            <div className="relative w-full max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={12} /></span>
              <input
                type="text"
                placeholder="Search catalog SKU or design name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          {catalogLoading ? (
            <div className="p-8 text-center text-slate-500">Recalculating client price tiers...</div>
          ) : filteredCatalog.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No active products or SKUs match search logic.</div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredCatalog.map(product => (
                <div key={product.productId} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                  <span className="font-black text-slate-900 text-[10px] uppercase tracking-wide block border-b border-slate-100 pb-1.5 mb-2">{product.productName} ({product.category})</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.variants.map(variant => (
                      <div
                        key={variant.variantId}
                        onClick={() => handleAddToStandardCart(variant, product.productName)}
                        className={`bg-white border hover:border-slate-900 rounded-xl p-3 flex justify-between items-center transition-all cursor-pointer ${
                          variant.availableStock <= 0 ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 block text-[10px]">{variant.colorName} / {variant.sizeName}</span>
                          <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{variant.sku}</span>
                          <span className="text-[9px] text-slate-500 font-semibold block mt-1">
                            Stock: <span className={variant.availableStock > 0 ? 'text-emerald-700 font-bold' : 'text-red-500'}>
                              {variant.availableStock > 0 ? `${variant.availableStock} Available` : 'Out of stock'}
                            </span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900 block">₹{variant.customerPrice.toLocaleString('en-IN')}</span>
                          <span className="text-[8px] text-slate-400 font-bold block">MRP: ₹{variant.mrp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default function CreateOrderOnBehalfClient(props: CreateOrderOnBehalfClientProps) {
  return (
    <Suspense fallback={<div className="text-center text-slate-500 py-12">Loading setup details...</div>}>
      <OrderOnBehalfForm {...props} />
    </Suspense>
  );
}
