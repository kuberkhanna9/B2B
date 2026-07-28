'use client';

import { useState, useTransition } from 'react';
import { createOrderAction } from '@/app/actions';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  X
} from 'lucide-react';

interface CatalogVariant {
  variantId: string;
  sku: string;
  barcode: string;
  colorName: string;
  sizeName: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  standardWholesalePrice: number;
  customerPrice: number;
  mrp: number;
  rackLocation?: string;
}

interface CatalogProduct {
  productId: string;
  productName: string;
  category: string;
  description?: string;
  active: boolean;
  variants: CatalogVariant[];
}

interface CatalogClientProps {
  catalog: CatalogProduct[];
  categories: string[];
  colors: string[];
  sizes: string[];
  branches: any[];
}

interface CartItem {
  variantId: string;
  sku: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  price: number;
  mrp: number;
  availableStock: number;
  category?: string;
}

export default function CatalogClient({ catalog, categories, colors, sizes, branches }: CatalogClientProps) {
  const [selectedBranchId, setSelectedBranchId] = useState('');
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Form State
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Filter products and their variants dynamically
  const filteredCatalog = catalog
    .map(prod => {
      // Filter variants
      const matchingVariants = prod.variants.filter(v => {
        const matchesColor = !selectedColor || v.colorName === selectedColor;
        const matchesSize = !selectedSize || v.sizeName === selectedSize;
        return matchesColor && matchesSize;
      });

      return {
        ...prod,
        variants: matchingVariants
      };
    })
    .filter(prod => {
      const matchesSearch = prod.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        prod.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || prod.category === selectedCategory;
      
      return matchesSearch && matchesCategory && prod.variants.length > 0;
    });

  const isProductMadeToOrder = (prodCategory: string) => {
    const cat = (prodCategory || '').toUpperCase();
    return cat.includes('PONCHO') || cat.includes('SWEATER');
  };

  // Cart Management Functions
  const addToCart = (variant: CatalogVariant, productName: string, category: string) => {
    const isMadeToOrder = isProductMadeToOrder(category);
    if (variant.availableStock <= 0 && !isMadeToOrder) return;

    setCart(prev => {
      const exists = prev.find(item => item.variantId === variant.variantId);
      if (exists) {
        const maxLimit = isMadeToOrder ? 99999 : variant.availableStock;
        const nextQty = Math.min(exists.quantity + 1, maxLimit);
        return prev.map(item => item.variantId === variant.variantId ? { ...item, quantity: nextQty } : item);
      }
      return [...prev, {
        variantId: variant.variantId,
        sku: variant.sku,
        productName,
        colorName: variant.colorName,
        sizeName: variant.sizeName,
        quantity: 1,
        price: variant.customerPrice,
        mrp: variant.mrp,
        availableStock: variant.availableStock,
        category
      }];
    });
    
    // Auto open cart drawer
    setIsCartOpen(true);
  };

  const updateCartQty = (variantId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.variantId === variantId) {
          const isMadeToOrder = isProductMadeToOrder(item.category || '');
          const maxLimit = isMadeToOrder ? 99999 : item.availableStock;
          const nextQty = Math.max(1, Math.min(item.quantity + delta, maxLimit));
          return { ...item, quantity: nextQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Submit Order Action
  const handleSubmitOrder = () => {
    if (cart.length === 0) return;
    if (!selectedBranchId) {
      setStatus({ success: false, message: 'Please select a branch before placing the order.' });
      return;
    }

    setStatus(null);
    startTransition(async () => {
      const orderItems = cart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));

      const response = await createOrderAction(selectedBranchId, orderItems, remarks);
      if (response.success) {
        setStatus({ success: true, message: response.message || 'Order placed successfully!' });
        setCart([]);
        setRemarks('');
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ success: false, message: response.error || 'Failed to submit order.' });
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
    <div className="space-y-6">
      {/* 1. Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={12} />
            Search & Filter Controls
          </span>
          {cart.length > 0 && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 select-none"
            >
              <ShoppingCart size={12} />
              <span>Cart ({getCartItemsCount()})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Query input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={12} /></span>
            <input
              type="text"
              placeholder="Search product style or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Color Filter */}
          <select
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
          >
            <option value="">All Colors</option>
            {colors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Size Filter */}
          <select
            value={selectedSize}
            onChange={e => setSelectedSize(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
          >
            <option value="">All Sizes</option>
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Status Alert Banner */}
      {status && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex gap-2 items-start ${
          status.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      {/* 2. Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCatalog.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
            <p className="text-xs font-semibold">No active styles found matching your filter criteria.</p>
          </div>
        ) : (
          filteredCatalog.map(product => (
            <div key={product.productId} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-colors flex flex-col justify-between">
              
              {/* Product Info */}
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{product.productName}</h3>
                    {product.description && (
                      <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                  </div>
                </div>

                {/* Variants Matrix */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-150 text-[8px] font-black uppercase text-slate-450 tracking-wider">
                        <th className="px-3 py-2">Color/Size</th>
                        <th className="px-3 py-2 text-right">Your WSP</th>
                        <th className="px-3 py-2 text-right">MRP</th>
                        <th className="px-3 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {product.variants.map(v => {
                        const inCart = cart.find(item => item.variantId === v.variantId);
                        const isMadeToOrder = isProductMadeToOrder(product.category);
                        return (
                          <tr key={v.variantId} className="hover:bg-slate-100/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-slate-800">
                              <span className="block">{v.colorName} / {v.sizeName}</span>
                              <span className="text-[8px] text-slate-400 font-semibold uppercase block">{v.sku}</span>
                              {/* Availability Badge */}
                              {(() => {
                                let badgeText = 'Available';
                                let badgeColorClass = 'text-emerald-600';
                                if (v.availableStock > 5) {
                                  badgeText = 'Available';
                                  badgeColorClass = 'text-emerald-600';
                                } else if (v.availableStock >= 1) {
                                  badgeText = 'Limited Availability';
                                  badgeColorClass = 'text-amber-600';
                                } else if (isMadeToOrder) {
                                  badgeText = 'Made To Order';
                                  badgeColorClass = 'text-indigo-600';
                                } else {
                                  badgeText = 'Out Of Stock';
                                  badgeColorClass = 'text-rose-500';
                                }
                                return (
                                  <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-extrabold ${badgeColorClass}`}>
                                    <span className="text-[10px]">●</span> {badgeText}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-950">
                              {formatCurrency(v.customerPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-500">
                              {formatCurrency(v.mrp)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => addToCart(v, product.productName, product.category)}
                                disabled={v.availableStock <= 0 && !isMadeToOrder}
                                className={`font-black text-[9px] px-2 py-1 rounded-lg border transition-all ${
                                  inCart
                                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                                    : 'bg-white hover:bg-slate-900 hover:text-white text-slate-700 border-slate-200 cursor-pointer disabled:opacity-50'
                                }`}
                              >
                                {inCart ? `In Cart (${inCart.quantity})` : 'Add +'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Sliding Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-xs">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white flex flex-col shadow-2xl">
              
              {/* Cart Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-slate-800" />
                  <span className="text-sm font-black text-slate-900 tracking-tight">Wholesale Order Cart</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <ShoppingCart size={32} className="text-slate-300" />
                    <p className="font-semibold text-xs text-center">Your shopping cart is currently empty.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.variantId} className="flex justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-xs truncate leading-tight">{item.productName}</h4>
                        <span className="text-[9px] font-bold text-slate-450 block">
                          SKU: {item.sku} | Color: {item.colorName} | Size: {item.sizeName}
                        </span>
                        <span className="text-[10px] font-black text-slate-900 block mt-1">
                          {formatCurrency(item.price)} <span className="text-[8px] text-slate-400 font-bold">each</span>
                        </span>
                      </div>

                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => updateCartQty(item.variantId, -1)}
                            className="text-slate-500 hover:bg-slate-100 p-0.5 rounded cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="font-extrabold w-4 text-center text-[10px]">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.variantId, 1)}
                            disabled={item.quantity >= (isProductMadeToOrder(item.category || '') ? 99999 : item.availableStock)}
                            className="text-slate-500 hover:bg-slate-100 p-0.5 rounded cursor-pointer disabled:opacity-30"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (() => {
                const branchCount = branches ? branches.length : 0;
                
                // Auto-selection logic inside component render cycle or via local state initialization
                let displayBranchSelector = false;
                let displayReadOnlyBranch = false;
                let displayNoBranchWarning = false;
                let activeBranchName = "";

                if (branchCount === 1) {
                  displayReadOnlyBranch = true;
                  activeBranchName = `${branches[0].branchName} (${branches[0].branchCode})`;
                  if (selectedBranchId !== branches[0].id) {
                    // Set timeout to avoid setting state during render phase
                    setTimeout(() => setSelectedBranchId(branches[0].id), 0);
                  }
                } else if (branchCount > 1) {
                  displayBranchSelector = true;
                } else {
                  displayNoBranchWarning = true;
                }

                return (
                  <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-4">
                    {/* CASE 1: Single assigned branch (Read-only) */}
                    {displayReadOnlyBranch && (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Shipping Branch</label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] text-slate-700 font-extrabold shadow-inner select-none">
                          {activeBranchName}
                        </div>
                      </div>
                    )}

                    {/* CASE 2: Multiple assigned branches (Select dropdown) */}
                    {displayBranchSelector && (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Shipping Branch *</label>
                        <select
                          value={selectedBranchId}
                          onChange={e => setSelectedBranchId(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all font-semibold"
                        >
                          <option value="">-- Choose Branch --</option>
                          {branches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.branchName} ({b.branchCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* CASE 3: Zero assigned branches (Informative Warning) */}
                    {displayNoBranchWarning && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-[10px] text-rose-700 font-bold flex gap-2 items-start leading-relaxed">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>No shipping branch has been assigned to your account. Please contact your administrator.</span>
                      </div>
                    )}

                    {/* Order Remarks */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Order Remarks / Dispatch Notes</label>
                      <textarea
                        placeholder="Add any specific shipping, tagging, or booking requests..."
                        rows={2}
                        value={remarks}
                        disabled={displayNoBranchWarning}
                        onChange={e => setRemarks(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all font-semibold disabled:opacity-50"
                      />
                    </div>

                    {/* Summary math */}
                    <div className="flex justify-between items-center py-2 border-t border-b border-slate-200">
                      <span className="font-bold text-slate-500">Order Subtotal:</span>
                      <span className="text-base font-black text-slate-900">{formatCurrency(getCartTotal())}</span>
                    </div>

                    <button
                      onClick={handleSubmitOrder}
                      disabled={isPending || displayNoBranchWarning || (displayBranchSelector && !selectedBranchId)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isPending ? 'Submitting Order...' : 'Submit Order for Approval'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
