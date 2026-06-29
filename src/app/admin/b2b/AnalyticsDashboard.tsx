'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle, 
  Package, 
  Truck, 
  Calendar, 
  Building2,
  ChevronRight,
  Download,
  Printer,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';

interface Customer {
  id: string;
  companyName: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  active: boolean;
  createdAt: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  branchId: string | null;
  sourceId: string | null;
  createdBy: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'PARTIALLY_FULFILLED' | 'PARTIALLY_DISPATCHED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: string;
  remarks: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface SalesOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  orderedQuantity: number;
  approvedQuantity: number;
  dispatchedQuantity: number;
  pricePerUnit: string;
  totalPrice: string;
  createdAt: string;
}

interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  colorId: string;
  sizeId: string;
  costPrice: string;
  wholesalePrice: string;
  mrp: string;
  rackLocation: string | null;
  active: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  productName: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  brand: string | null;
  season: string | null;
  active: boolean;
  createdAt: string;
}

interface CustomerLedger {
  id: string;
  customerId: string;
  date: string;
  referenceType: 'INVOICE' | 'PAYMENT';
  referenceId: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  description: string;
  createdAt: string;
}

interface ReturnRequest {
  id: string;
  returnNumber: string;
  customerId: string;
  branchId: string | null;
  orderId: string | null;
  invoiceNumber: string | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'CLOSED';
  reason: 'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER' | 'COLOUR_ISSUE' | 'SHORT_QUANTITY' | 'CUSTOMER_CANCELLATION';
  remarks: string | null;
  createdByType: string;
  createdBy: string;
  createdAt: string;
}

interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  variantId: string | null;
  customItemName: string | null;
  quantity: number;
}

interface CustomerBranch {
  id: string;
  customerId: string;
  branchName: string;
  branchCode: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gst: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  status: string;
  createdAt: string;
}

interface Dispatch {
  id: string;
  orderId: string;
  dispatchNumber: string;
  courier: string;
  trackingNumber: string;
  dispatchDate: string;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  entity: string | null;
  action: string;
  module: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface StockTransaction {
  id: string;
  requestId: string;
  variantId: string;
  transactionType: 'STOCK_IN' | 'SALE' | 'DAMAGE_REPAIRABLE' | 'DAMAGE_NON_REPAIRABLE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  referenceNumber: string | null;
  invoiceNumber: string | null;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
}

interface AnalyticsDashboardRawData {
  customers: Customer[];
  salesOrders: SalesOrder[];
  salesOrderItems: SalesOrderItem[];
  productVariants: ProductVariant[];
  products: Product[];
  customerLedger: CustomerLedger[];
  returnRequests: ReturnRequest[];
  returnRequestItems: ReturnRequestItem[];
  customerBranches: CustomerBranch[];
  dispatches: Dispatch[];
  auditLogs: AuditLog[];
  stockTransactions: StockTransaction[];
}

export default function AnalyticsDashboard({ data }: { data: AnalyticsDashboardRawData | null }) {
  // Global Filters State
  const [datePreset, setDatePreset] = useState<string>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('all'); // 'all', 'group:Exporters', 'cust-1' etc.
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  if (!data) return null;

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Resolve date boundaries based on datePreset
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // end is exclusive of next day

    switch (datePreset) {
      case '90d': {
        start.setDate(now.getDate() - 90);
        break;
      }
      case 'cur_fy': {
        const currentYear = now.getFullYear();
        const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear; // FY starts April 1st
        start = new Date(startYear, 3, 1, 0, 0, 0);
        end = new Date(startYear + 1, 2, 31, 23, 59, 59);
        break;
      }
      case 'prev_fy': {
        const currentYear = now.getFullYear();
        const startYear = (now.getMonth() < 3 ? currentYear - 1 : currentYear) - 1; // last FY starts April 1st
        start = new Date(startYear, 3, 1, 0, 0, 0);
        end = new Date(startYear + 1, 2, 31, 23, 59, 59);
        break;
      }
      case 'custom': {
        if (customStartDate) start = new Date(customStartDate);
        else start.setDate(now.getDate() - 30);
        if (customEndDate) end = new Date(new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000);
        break;
      }
      case '30d':
      default: {
        start.setDate(now.getDate() - 30);
        break;
      }
    }
    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // 2. Classify Customer Groups
  const customerGroupMap = useMemo(() => {
    const map: Record<string, string> = {}; // customerId -> group
    data.customers.forEach(c => {
      if (c.companyName.toLowerCase().includes('exports')) {
        map[c.id] = 'Exporters';
      } else if (c.companyName.toLowerCase().includes('retail')) {
        map[c.id] = 'Retailers';
      } else {
        map[c.id] = 'Wholesalers & Distributors';
      }
    });
    return map;
  }, [data.customers]);

  // Get active customers list under current customer filter
  const filteredCustomerIds = useMemo(() => {
    if (customerFilter === 'all') {
      return data.customers.map(c => c.id);
    }
    if (customerFilter.startsWith('group:')) {
      const targetGroup = customerFilter.split('group:')[1];
      return data.customers.filter(c => customerGroupMap[c.id] === targetGroup).map(c => c.id);
    }
    return [customerFilter];
  }, [customerFilter, data.customers, customerGroupMap]);

  // Get branches list based on filtered customers
  const availableBranches = useMemo(() => {
    return data.customerBranches.filter(b => filteredCustomerIds.includes(b.customerId));
  }, [filteredCustomerIds, data.customerBranches]);

  // Handle auto-reset of branch filter when customer filter changes
  React.useEffect(() => {
    if (branchFilter !== 'all') {
      const exists = availableBranches.some(b => b.id === branchFilter);
      if (!exists) setBranchFilter('all');
    }
  }, [customerFilter, availableBranches, branchFilter]);

  // 3. Centralized Raw Filter Engine
  const filteredData = useMemo(() => {
    const { start, end } = dateBoundaries;

    // Filter Sales Orders
    const salesOrders = data.salesOrders.filter(o => {
      // Customer Filter
      if (!filteredCustomerIds.includes(o.customerId)) return false;
      // Branch Filter
      if (branchFilter !== 'all' && o.branchId !== branchFilter) return false;
      // Date Range Filter (Order approval date or fallback to creation date)
      const orderDate = new Date(o.approvedAt || o.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    const salesOrderIds = salesOrders.map(o => o.id);

    // Filter Sales Order Items
    const salesOrderItems = data.salesOrderItems.filter(i => salesOrderIds.includes(i.orderId));

    // Filter Return Requests
    const returnRequests = data.returnRequests.filter(r => {
      if (!filteredCustomerIds.includes(r.customerId)) return false;
      if (branchFilter !== 'all' && r.branchId !== branchFilter) return false;
      const returnDate = new Date(r.createdAt);
      return returnDate >= start && returnDate <= end;
    });

    return {
      salesOrders,
      salesOrderItems,
      returnRequests,
      start,
      end
    };
  }, [data, dateBoundaries, filteredCustomerIds, branchFilter]);

  // ===========================================================================
  // WIDGET DATA CALCULATIONS (DYNAMICALLY FILTERED)
  // ===========================================================================

  // 1. Monthly Sales Trend Data Points
  const salesTrendData = useMemo(() => {
    const { start, end, salesOrders } = filteredData;
    const approved = salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_APPROVAL');
    const rangeMs = end.getTime() - start.getTime();
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);

    if (rangeDays <= 95) {
      // Daily Grouping
      const map: Record<string, { label: string; amount: number }> = {};
      for (let i = 0; i <= Math.ceil(rangeDays); i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (d > end) continue;
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        map[key] = { label, amount: 0 };
      }
      approved.forEach(o => {
        const oDateStr = new Date(o.approvedAt || o.createdAt).toISOString().split('T')[0];
        if (map[oDateStr]) {
          map[oDateStr].amount += Number(o.totalAmount) || 0;
        }
      });
      return Object.entries(map).map(([key, val]) => ({ key, label: val.label, amount: val.amount }));
    } else {
      // Monthly Grouping
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();

      const map: Record<string, { label: string; amount: number; order: number }> = {};
      let temp = new Date(startYear, startMonth, 1);
      let count = 0;
      while (temp <= end) {
        const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        const label = temp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        map[key] = { label, amount: 0, order: count++ };
        temp.setMonth(temp.getMonth() + 1);
      }

      approved.forEach(o => {
        const oDate = new Date(o.approvedAt || o.createdAt);
        const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
        if (map[key]) {
          map[key].amount += Number(o.totalAmount) || 0;
        }
      });
      return Object.entries(map)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key, val]) => ({ key, label: val.label, amount: val.amount }));
    }
  }, [filteredData]);

  // 2. Top Customers
  const topCustomersData = useMemo(() => {
    const approved = filteredData.salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_APPROVAL');
    const totals: Record<string, number> = {};
    approved.forEach(o => {
      totals[o.customerId] = (totals[o.customerId] || 0) + Number(o.totalAmount);
    });

    return Object.entries(totals)
      .map(([id, totalSales]) => {
        const cObj = data.customers.find(c => c.id === id);
        return {
          companyName: cObj ? cObj.companyName : 'Unknown Client',
          totalSales
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
  }, [filteredData, data.customers]);

  // 3. Order Status Distribution
  const orderStatusData = useMemo(() => {
    const counts = {
      'Pending Approval': 0,
      'Approved': 0,
      'Partially Fulfilled': 0,
      'Dispatched': 0,
      'Delivered': 0,
      'Cancelled': 0
    };
    filteredData.salesOrders.forEach(o => {
      if (o.status === 'PENDING_APPROVAL') counts['Pending Approval']++;
      else if (o.status === 'APPROVED' || o.status === 'PARTIALLY_APPROVED') counts['Approved']++;
      else if (o.status === 'PARTIALLY_FULFILLED' || o.status === 'PARTIALLY_DISPATCHED') counts['Partially Fulfilled']++;
      else if (o.status === 'DISPATCHED') counts['Dispatched']++;
      else if (o.status === 'DELIVERED' || o.status === 'COMPLETED') counts['Delivered']++;
      else if (o.status === 'CANCELLED') counts['Cancelled']++;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filteredData]);

  // Order Status Donut Chart Visual
  const orderStatusDonut = useMemo(() => {
    const total = orderStatusData.reduce((sum, item) => sum + item.count, 0);
    const colors = {
      'Pending Approval': '#f59e0b',
      'Approved': '#10b981',
      'Partially Fulfilled': '#6366f1',
      'Dispatched': '#8b5cf6',
      'Delivered': '#0ea5e9',
      'Cancelled': '#ef4444'
    };

    if (total === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
          No orders in selected period
        </div>
      );
    }

    const r = 40;
    const circ = 2 * Math.PI * r;
    let accumulatedLength = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {orderStatusData.map((item, idx) => {
              if (item.count === 0) return null;
              const percentage = item.count / total;
              const strokeLength = percentage * circ;
              const strokeOffset = -accumulatedLength;
              accumulatedLength += strokeLength;
              const color = colors[item.status as keyof typeof colors] || '#cbd5e1';

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={color}
                  strokeWidth="10"
                  strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300"
                />
              );
            })}
            <circle cx="50" cy="50" r={r - 5} fill="#ffffff" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-slate-800">{total}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Orders</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[130px] flex-1">
          {orderStatusData.map((item, idx) => {
            if (item.count === 0) return null;
            const color = colors[item.status as keyof typeof colors] || '#cbd5e1';
            const percentage = ((item.count / total) * 100).toFixed(0);
            return (
              <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate max-w-[90px]">{item.status}</span>
                <span className="text-slate-900 font-extrabold ml-auto shrink-0">{item.count} ({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [orderStatusData]);

  // 4. Top Selling Products
  const topSellingProductsData = useMemo(() => {
    const approved = filteredData.salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_APPROVAL');
    const approvedIds = approved.map(o => o.id);
    const totals: Record<string, number> = {};

    data.salesOrderItems.forEach(i => {
      if (approvedIds.includes(i.orderId)) {
        const variant = data.productVariants.find(v => v.id === i.variantId);
        const prod = variant ? data.products.find(p => p.id === variant.productId) : null;
        if (prod) {
          const qty = i.approvedQuantity > 0 ? i.approvedQuantity : i.orderedQuantity;
          totals[prod.productName] = (totals[prod.productName] || 0) + qty;
        }
      }
    });

    return Object.entries(totals)
      .map(([productName, quantitySold]) => ({ productName, quantitySold }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);
  }, [filteredData, data]);

  // 5. Outstanding Receivables
  const outstandingReceivablesData = useMemo(() => {
    const { end } = filteredData;
    return data.customers
      .filter(c => filteredCustomerIds.includes(c.id))
      .map(c => {
        // Find latest ledger entry on or before endDate
        const ledgerOnBefore = data.customerLedger
          .filter(l => l.customerId === c.id && new Date(l.date) <= end)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const outstandingAmount = ledgerOnBefore.length > 0 ? Number(ledgerOnBefore[0].runningBalance) : 0;
        return {
          companyName: c.companyName,
          outstandingAmount
        };
      })
      .filter(c => c.outstandingAmount > 0)
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
      .slice(0, 10);
  }, [filteredData, data, filteredCustomerIds]);

  // 6. Returns Analysis
  const returnsData = useMemo(() => {
    const counts = {
      'Defective Piece': 0,
      'Wrong Item': 0,
      'Transit Damage': 0,
      'SOR Return': 0,
      'Excess Quantity': 0,
      'Other': 0
    };
    filteredData.returnRequests.forEach(r => {
      if (r.status === 'REJECTED') return;
      if (r.reason === 'DEFECTIVE') counts['Defective Piece']++;
      else if (r.reason === 'WRONG_ITEM' || r.reason === 'SIZE_ISSUE' || r.reason === 'COLOUR_ISSUE') counts['Wrong Item']++;
      else if (r.reason === 'TRANSIT_DAMAGE') counts['Transit Damage']++;
      else if (r.reason === 'SOR_RETURN') counts['SOR Return']++;
      else if (r.reason === 'EXCESS_QUANTITY') counts['Excess Quantity']++;
      else counts['Other']++;
    });
    return Object.entries(counts).map(([reason, count]) => ({ reason, count }));
  }, [filteredData]);

  // Returns Analysis Donut Chart Visual
  const returnsAnalysisDonut = useMemo(() => {
    const total = returnsData.reduce((sum, item) => sum + item.count, 0);
    const colors = {
      'Defective Piece': '#ef4444',
      'Wrong Item': '#f59e0b',
      'Transit Damage': '#6366f1',
      'SOR Return': '#8b5cf6',
      'Excess Quantity': '#3b82f6',
      'Other': '#64748b'
    };

    if (total === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
          No return claims in selected period
        </div>
      );
    }

    const r = 40;
    const circ = 2 * Math.PI * r;
    let accumulatedLength = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {returnsData.map((item, idx) => {
              if (item.count === 0) return null;
              const percentage = item.count / total;
              const strokeLength = percentage * circ;
              const strokeOffset = -accumulatedLength;
              accumulatedLength += strokeLength;
              const color = colors[item.reason as keyof typeof colors] || '#cbd5e1';

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={color}
                  strokeWidth="10"
                  strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300"
                />
              );
            })}
            <circle cx="50" cy="50" r={r - 5} fill="#ffffff" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-slate-800">{total}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Claims</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[130px] flex-1">
          {returnsData.map((item, idx) => {
            if (item.count === 0) return null;
            const color = colors[item.reason as keyof typeof colors] || '#cbd5e1';
            const percentage = ((item.count / total) * 100).toFixed(0);
            return (
              <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate max-w-[90px]">{item.reason}</span>
                <span className="text-slate-900 font-extrabold ml-auto shrink-0">{item.count} ({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [returnsData]);

  // 7. Branch-wise Sales
  const branchSalesData = useMemo(() => {
    const approved = filteredData.salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_APPROVAL');
    const totals: Record<string, number> = {};
    approved.forEach(o => {
      const key = o.branchId || 'DIRECT';
      totals[key] = (totals[key] || 0) + Number(o.totalAmount);
    });

    return Object.entries(totals).map(([id, totalSales]) => {
      let branchName = 'Main / Direct Sales';
      if (id !== 'DIRECT') {
        const bObj = data.customerBranches.find(b => b.id === id);
        if (bObj) {
          branchName = `${bObj.branchName} (${bObj.branchCode})`;
        }
      }
      return { branchName, totalSales };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredData, data]);

  // 8. Dispatch Performance Lead Times
  const dispatchPerformanceData = useMemo(() => {
    const approved = filteredData.salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_APPROVAL');
    
    // Order -> Approval
    let appSum = 0, appCount = 0;
    approved.forEach(o => {
      if (o.approvedAt) {
        const diff = (new Date(o.approvedAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          appSum += diff;
          appCount++;
        }
      }
    });
    const orderToApproval = appCount > 0 ? Number((appSum / appCount).toFixed(1)) : 0;

    // Approval -> Dispatch
    let dispSum = 0, dispCount = 0;
    data.dispatches.forEach(d => {
      const order = approved.find(o => o.id === d.orderId);
      if (order && order.approvedAt) {
        const diff = (new Date(d.dispatchDate).getTime() - new Date(order.approvedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          dispSum += diff;
          dispCount++;
        }
      }
    });
    const approvalToDispatch = dispCount > 0 ? Number((dispSum / dispCount).toFixed(1)) : 0;

    // Dispatch -> Delivery
    let delivSum = 0, delivCount = 0;
    data.dispatches.forEach(d => {
      const order = approved.find(o => o.id === d.orderId);
      if (order && (order.status === 'DELIVERED' || order.status === 'COMPLETED')) {
        const logs = data.auditLogs.filter(l => 
          l.entity === 'B2B_ORDERS' && 
          (l.description?.includes(order.orderNumber) || l.description?.includes(order.id)) &&
          (l.newValue?.includes('DELIVERED') || l.newValue?.includes('COMPLETED') || l.description?.toLowerCase().includes('delivered') || l.description?.toLowerCase().includes('completed'))
        );
        let deliveryDate = null;
        if (logs.length > 0) {
          deliveryDate = new Date(logs[0].createdAt);
        } else {
          deliveryDate = new Date(new Date(d.dispatchDate).getTime() + 2.5 * 24 * 60 * 60 * 1000);
        }
        const diff = (deliveryDate.getTime() - new Date(d.dispatchDate).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          delivSum += diff;
          delivCount++;
        }
      }
    });
    const dispatchToDelivery = delivCount > 0 ? Number((delivSum / delivCount).toFixed(1)) : 2.5;

    return { orderToApproval, approvalToDispatch, dispatchToDelivery };
  }, [filteredData, data]);

  // 9. Customer Acquisition / Customer Growth Trend
  const customerGrowthData = useMemo(() => {
    const { start, end } = filteredData;
    const activeCusts = data.customers.filter(c => {
      if (!filteredCustomerIds.includes(c.id)) return false;
      const regDate = new Date(c.createdAt);
      return regDate >= start && regDate <= end;
    });

    const rangeMs = end.getTime() - start.getTime();
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);

    if (rangeDays <= 95) {
      // Group daily
      const map: Record<string, { label: string; count: number }> = {};
      for (let i = 0; i <= Math.ceil(rangeDays); i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (d > end) continue;
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        map[key] = { label, count: 0 };
      }
      activeCusts.forEach(c => {
        const cDateStr = new Date(c.createdAt).toISOString().split('T')[0];
        if (map[cDateStr]) map[cDateStr].count++;
      });
      return Object.entries(map).map(([month, val]) => ({ month, label: val.label, count: val.count }));
    } else {
      // Group monthly
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const map: Record<string, { label: string; count: number; order: number }> = {};
      
      let temp = new Date(startYear, startMonth, 1);
      let count = 0;
      while (temp <= end) {
        const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        const label = temp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        map[key] = { label, count: 0, order: count++ };
        temp.setMonth(temp.getMonth() + 1);
      }

      activeCusts.forEach(c => {
        const cDate = new Date(c.createdAt);
        const key = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}`;
        if (map[key]) map[key].count++;
      });

      return Object.entries(map)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([month, val]) => ({ month, label: val.label, count: val.count }));
    }
  }, [filteredData, data.customers, filteredCustomerIds]);

  // ===========================================================================
  // ADDITIONAL WIDGETS CALCULATIONS
  // ===========================================================================

  // 1. Top Slow Moving Products
  // Products with current stock > 0 but 0 units sold in the selected period.
  const slowMovingProductsData = useMemo(() => {
    const { end, salesOrderItems } = filteredData;

    // A. Calculate current stock for each variant up to endDate
    const variantStock: Record<string, number> = {};
    
    // Init all variants stock
    data.productVariants.forEach(v => {
      variantStock[v.id] = 0;
    });

    data.stockTransactions.forEach(t => {
      if (new Date(t.createdAt) <= end) {
        if (t.transactionType === 'STOCK_IN' || t.transactionType === 'ADJUSTMENT_IN' || t.transactionType === 'DAMAGE_REPAIRABLE') {
          variantStock[t.variantId] = (variantStock[t.variantId] || 0) + Number(t.quantity);
        } else if (t.transactionType === 'SALE' || t.transactionType === 'ADJUSTMENT_OUT' || t.transactionType === 'DAMAGE_NON_REPAIRABLE') {
          variantStock[t.variantId] = (variantStock[t.variantId] || 0) - Number(t.quantity);
        }
      }
    });

    // Sum stock to product level
    const productStock: Record<string, { productName: string; currentStock: number; id: string }> = {};
    data.products.forEach(p => {
      productStock[p.id] = { productName: p.productName, currentStock: 0, id: p.id };
    });

    data.productVariants.forEach(v => {
      if (productStock[v.productId]) {
        productStock[v.productId].currentStock += variantStock[v.id] || 0;
      }
    });

    // B. Calculate units sold during selected period
    const productSales: Record<string, number> = {};
    salesOrderItems.forEach(i => {
      const variant = data.productVariants.find(v => v.id === i.variantId);
      if (variant) {
        const qty = i.approvedQuantity > 0 ? i.approvedQuantity : i.orderedQuantity;
        productSales[variant.productId] = (productSales[variant.productId] || 0) + qty;
      }
    });

    // C. Combine: Stock > 0 AND Sales === 0
    return Object.values(productStock)
      .filter(p => p.currentStock > 0 && (productSales[p.id] || 0) === 0)
      .map(p => ({ productName: p.productName, currentStock: p.currentStock }))
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10);
  }, [filteredData, data]);

  // 2. Top Returned Products
  // Ranked by return quantity
  const topReturnedProductsData = useMemo(() => {
    const { returnRequests } = filteredData;
    const approvedReturnIds = returnRequests.filter(r => r.status !== 'REJECTED').map(r => r.id);
    const totals: Record<string, number> = {};

    data.returnRequestItems.forEach(item => {
      if (approvedReturnIds.includes(item.returnRequestId) && item.variantId) {
        const variant = data.productVariants.find(v => v.id === item.variantId);
        const prod = variant ? data.products.find(p => p.id === variant.productId) : null;
        if (prod) {
          totals[prod.productName] = (totals[prod.productName] || 0) + item.quantity;
        }
      }
    });

    return Object.entries(totals)
      .map(([productName, quantityReturned]) => ({ productName, quantityReturned }))
      .sort((a, b) => b.quantityReturned - a.quantityReturned)
      .slice(0, 10);
  }, [filteredData, data]);

  // 3. Outstanding Orders Aging
  // Pending, Approved, Partially Fulfilled/Dispatched/Dispatched orders (status not Cancelled, Completed, Delivered)
  const outstandingOrdersAgingData = useMemo(() => {
    const now = new Date();
    const aging = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 }
    };

    filteredData.salesOrders.forEach(o => {
      const isOutstanding = o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'COMPLETED';
      if (isOutstanding) {
        const oDate = new Date(o.createdAt);
        const ageDays = (now.getTime() - oDate.getTime()) / (1000 * 60 * 60 * 24);
        const amt = Number(o.totalAmount) || 0;

        if (ageDays <= 30) {
          aging['0-30'].count++;
          aging['0-30'].amount += amt;
        } else if (ageDays <= 60) {
          aging['31-60'].count++;
          aging['31-60'].amount += amt;
        } else if (ageDays <= 90) {
          aging['61-90'].count++;
          aging['61-90'].amount += amt;
        } else {
          aging['90+'].count++;
          aging['90+'].amount += amt;
        }
      }
    });

    return aging;
  }, [filteredData]);

  // 4. Monthly Order Count (Separate from sales trend value)
  const monthlyOrderCountData = useMemo(() => {
    const { start, end, salesOrders } = filteredData;
    const activeOrders = salesOrders.filter(o => o.status !== 'CANCELLED');
    const rangeMs = end.getTime() - start.getTime();
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);

    if (rangeDays <= 95) {
      // Group daily
      const map: Record<string, { label: string; count: number }> = {};
      for (let i = 0; i <= Math.ceil(rangeDays); i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (d > end) continue;
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        map[key] = { label, count: 0 };
      }
      activeOrders.forEach(o => {
        const oDateStr = new Date(o.createdAt).toISOString().split('T')[0];
        if (map[oDateStr]) map[oDateStr].count++;
      });
      return Object.entries(map).map(([key, val]) => ({ key, label: val.label, count: val.count }));
    } else {
      // Group monthly
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const map: Record<string, { label: string; count: number; order: number }> = {};
      
      let temp = new Date(startYear, startMonth, 1);
      let count = 0;
      while (temp <= end) {
        const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        const label = temp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        map[key] = { label, count: 0, order: count++ };
        temp.setMonth(temp.getMonth() + 1);
      }

      activeOrders.forEach(o => {
        const oDate = new Date(o.createdAt);
        const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
        if (map[key]) map[key].count++;
      });

      return Object.entries(map)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key, val]) => ({ key, label: val.label, count: val.count }));
    }
  }, [filteredData]);

  // ===========================================================================
  // EXPORT HANDLERS
  // ===========================================================================

  const handleExcelExport = () => {
    let csv = 'LALL JI B2B PLATFORM - SUPERADMIN ADVANCED ANALYTICS SUMMARY\n';
    csv += `Export Date,${new Date().toLocaleString('en-IN')}\n`;
    csv += `Date Range Filter,${datePreset} (${filteredData.start.toLocaleDateString()} to ${filteredData.end.toLocaleDateString()})\n`;
    csv += `Customer Filter,${customerFilter === 'all' ? 'All Customers' : customerFilter}\n`;
    csv += `Branch Filter,${branchFilter === 'all' ? 'All Branches' : branchFilter}\n\n`;

    // 1. Sales Trend
    csv += '=== MONTHLY SALES TREND ===\n';
    csv += 'Period/Date,Total Sales (INR)\n';
    salesTrendData.forEach(p => { csv += `"${p.label}",${p.amount}\n`; });
    csv += '\n';

    // 2. Top Customers
    csv += '=== TOP CUSTOMERS BY SALES VALUE ===\n';
    csv += 'Customer Name,Total Sales Value (INR)\n';
    topCustomersData.forEach(c => { csv += `"${c.companyName}",${c.totalSales}\n`; });
    csv += '\n';

    // 3. Order Status Distribution
    csv += '=== ORDER STATUS DISTRIBUTION ===\n';
    csv += 'Status,Order Count\n';
    orderStatusData.forEach(s => { csv += `"${s.status}",${s.count}\n`; });
    csv += '\n';

    // 4. Top Selling Products
    csv += '=== TOP SELLING PRODUCTS ===\n';
    csv += 'Product Name,Quantity Sold (Units)\n';
    topSellingProductsData.forEach(p => { csv += `"${p.productName}",${p.quantitySold}\n`; });
    csv += '\n';

    // 5. Outstanding Receivables
    csv += '=== OUTSTANDING CREDIT RECEIVABLES ===\n';
    csv += 'Customer Name,Receivable Amount (INR)\n';
    outstandingReceivablesData.forEach(c => { csv += `"${c.companyName}",${c.outstandingAmount}\n`; });
    csv += '\n';

    // 6. Returns Analysis
    csv += '=== RETURNS CLAIMS BY REASON ===\n';
    csv += 'Return Reason,Claim Count\n';
    returnsData.forEach(r => { csv += `"${r.reason}",${r.count}\n`; });
    csv += '\n';

    // 7. Branch Sales
    csv += '=== BRANCH-WISE SALES ===\n';
    csv += 'Branch Name,Total Sales (INR)\n';
    branchSalesData.forEach(b => { csv += `"${b.branchName}",${b.totalSales}\n`; });
    csv += '\n';

    // 8. Lead Times
    csv += '=== DISPATCH & SHIPPING LEAD TIMES ===\n';
    csv += 'Pipeline Step,Average Time (Days)\n';
    csv += `"Order to Approval Approval Time",${dispatchPerformanceData.orderToApproval}\n`;
    csv += `"Approval to Dispatch Courier Booking Time",${dispatchPerformanceData.approvalToDispatch}\n`;
    csv += `"Dispatch to Delivery Courier Shipping Duration",${dispatchPerformanceData.dispatchToDelivery}\n\n`;

    // 9. Slow Moving Products
    csv += '=== TOP SLOW MOVING PRODUCTS ===\n';
    csv += 'Product Name,Current Stock (Units),Sales units in period\n';
    slowMovingProductsData.forEach(p => { csv += `"${p.productName}",${p.currentStock},0\n`; });
    csv += '\n';

    // 10. Top Returned Products
    csv += '=== TOP RETURNED PRODUCTS ===\n';
    csv += 'Product Name,Quantity Returned (Units)\n';
    topReturnedProductsData.forEach(p => { csv += `"${p.productName}",${p.quantityReturned}\n`; });
    csv += '\n';

    // 11. Outstanding Orders Aging
    csv += '=== OUTSTANDING ORDERS AGING ===\n';
    csv += 'Aging Bracket,Pending Orders Count,Value (INR)\n';
    csv += `"0-30 Days",${outstandingOrdersAgingData['0-30'].count},${outstandingOrdersAgingData['0-30'].amount}\n`;
    csv += `"31-60 Days",${outstandingOrdersAgingData['31-60'].count},${outstandingOrdersAgingData['31-60'].amount}\n`;
    csv += `"61-90 Days",${outstandingOrdersAgingData['61-90'].count},${outstandingOrdersAgingData['61-90'].amount}\n`;
    csv += `"90+ Days",${outstandingOrdersAgingData['90+'].count},${outstandingOrdersAgingData['90+'].amount}\n\n`;

    // 12. Monthly Order Volume
    csv += '=== MONTHLY ORDER COUNT ===\n';
    csv += 'Period/Date,Total Orders count\n';
    monthlyOrderCountData.forEach(o => { csv += `"${o.label}",${o.count}\n`; });
    csv += '\n';

    // 13. Customer Growth Registrations
    csv += '=== CUSTOMER ACQUISITION TREND ===\n';
    csv += 'Period/Date,New Registrations\n';
    customerGrowthData.forEach(g => { csv += `"${g.label}",${g.count}\n`; });
    csv += '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ljk_advanced_analytics_${datePreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePdfPrint = () => {
    window.print();
  };

  // Helper values for Top horizontal bar chart percentages
  const maxCustomerSales = Math.max(...topCustomersData.map(c => c.totalSales), 1);
  const maxProductQty = Math.max(...topSellingProductsData.map(p => p.quantitySold), 1);
  const maxOutstanding = Math.max(...outstandingReceivablesData.map(o => o.outstandingAmount), 1);
  const maxBranchSales = Math.max(...branchSalesData.map(b => b.totalSales), 1);
  const maxSlowStock = Math.max(...slowMovingProductsData.map(s => s.currentStock), 1);
  const maxReturnQty = Math.max(...topReturnedProductsData.map(r => r.quantityReturned), 1);
  
  const maxSalesVal = Math.max(...salesTrendData.map(p => p.amount), 1);
  const maxOrderCount = Math.max(...monthlyOrderCountData.map(o => o.count), 1);
  const maxCustomerAcq = Math.max(...customerGrowthData.map(g => g.count), 1);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate math helpers
  const getTrendCoordinates = () => {
    return salesTrendData.map((p, idx) => {
      const x = paddingLeft + (idx / (salesTrendData.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - (p.amount / maxSalesVal) * chartHeight;
      return { x, y, label: p.label, value: formatCurrency(p.amount) };
    });
  };
  const trendCoordinates = getTrendCoordinates();

  let trendPathD = '';
  let trendAreaD = '';
  if (trendCoordinates.length > 0) {
    trendPathD = `M ${trendCoordinates[0].x} ${trendCoordinates[0].y} ` + 
      trendCoordinates.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
    trendAreaD = `${trendPathD} L ${trendCoordinates[trendCoordinates.length - 1].x} ${paddingTop + chartHeight} L ${trendCoordinates[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Acquisition Coordinates
  const getAcqCoordinates = () => {
    return customerGrowthData.map((g, idx) => {
      const x = paddingLeft + (idx / (customerGrowthData.length - 1 || 1)) * chartWidth;
      const y = paddingTop + (chartHeight - 40) - (g.count / maxCustomerAcq) * (chartHeight - 40);
      return { x, y, label: g.label, count: g.count };
    });
  };
  const acqCoordinates = getAcqCoordinates();

  let acqPathD = '';
  let acqAreaD = '';
  if (acqCoordinates.length > 0) {
    acqPathD = `M ${acqCoordinates[0].x} ${acqCoordinates[0].y} ` + 
      acqCoordinates.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
    acqAreaD = `${acqPathD} L ${acqCoordinates[acqCoordinates.length - 1].x} ${paddingTop + chartHeight - 40} L ${acqCoordinates[0].x} ${paddingTop + chartHeight - 40} Z`;
  }

  return (
    <section className="space-y-6 mb-8 mt-2 print:space-y-4">
      {/* Dynamic styles to handle print views cleanly */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            grid-column: span 3 / span 3 !important;
          }
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Global Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4 no-print">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-indigo-650" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Global Filter Dashboard Controls
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePdfPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Printer size={12} /> Save PDF
            </button>
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <Download size={12} /> Export Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          
          {/* Date range filter selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Range</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="cur_fy">Current Financial Year</option>
              <option value="prev_fy">Previous Financial Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Customer filter selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Customers</option>
              <optgroup label="Customer Groups">
                <option value="group:Exporters">Exporters Group</option>
                <option value="group:Retailers">Retailers Group</option>
                <option value="group:Wholesalers & Distributors">Wholesalers & Distributors Group</option>
              </optgroup>
              <optgroup label="Individual Customer">
                {data.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Branch filter selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Branches</option>
              {availableBranches.map(b => (
                <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
              ))}
            </select>
          </div>

        </div>

        {/* Custom date range picker (conditionally rendered) */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main visual header for printing */}
      <div className="flex items-center gap-2 border-l-4 border-l-indigo-650 pl-3">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
          SuperAdmin Advanced Performance Analytics
        </h2>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase no-print">
          Exclusive Access
        </span>
      </div>

      {/* Grid of Analytics widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Monthly Sales Trend */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 print-card print-full-width space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Revenue Trend</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Approved Sales & Invoiced Value</h3>
          </div>

          <div className="relative w-full h-64 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid Lines & Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingTop + chartHeight - ratio * chartHeight;
                const value = ratio * maxSalesVal;
                return (
                  <g key={idx} className="opacity-40">
                    <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-bold" >
                      {value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${(value / 1000).toFixed(0)}k`}
                    </text>
                  </g>
                );
              })}

              {/* X Axis labels */}
              {salesTrendData.map((p, idx) => {
                const step = salesTrendData.length > 31 ? (salesTrendData.length > 95 ? 2 : 15) : 5;
                if (idx % step !== 0 && idx !== salesTrendData.length - 1) return null;
                const x = paddingLeft + (idx / (salesTrendData.length - 1 || 1)) * chartWidth;
                return (
                  <text key={idx} x={x} y={svgHeight - paddingBottom + 18} textAnchor="middle" className="text-[8px] fill-slate-500 font-bold opacity-80" >
                    {p.label}
                  </text>
                );
              })}

              {/* Chart Lines and Areas */}
              {trendAreaD && <path d={trendAreaD} fill="url(#salesTrendGradient)" />}
              {trendPathD && <path d={trendPathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Interaction Circles */}
              {trendCoordinates.map((c, idx) => {
                const isHovered = hoveredPoint && hoveredPoint.label === c.label;
                const showDot = salesTrendData.length <= 31 || idx % 2 === 0;
                if (!showDot && !isHovered) return null;

                return (
                  <circle
                    key={idx}
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? 6 : 3}
                    fill={isHovered ? '#4f46e5' : '#ffffff'}
                    stroke="#4f46e5"
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => {
                      setHoveredPoint({ x: c.x, y: c.y, label: c.label, value: c.value });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip Layer */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 text-white rounded-xl px-3 py-1.5 text-[10px] font-black shadow-lg pointer-events-none z-10 space-y-0.5 border border-slate-750"
                style={{
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / svgHeight) * 100 - 15}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="text-slate-400 text-[8px] font-bold uppercase">{hoveredPoint.label}</div>
                <div className="text-indigo-300 font-extrabold">{hoveredPoint.value}</div>
              </div>
            )}
          </div>
        </div>

        {/* Widget 3: Order Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card flex flex-col space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Mix</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Order Status Distribution</h3>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {orderStatusDonut}
          </div>
        </div>

      </div>

      {/* Row 2: Top Customer, Products & Outstanding Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 2: Top Customers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Contribution</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Top Customers</h3>
            </div>
            <Users size={16} className="text-indigo-500" />
          </div>

          <div className="space-y-4 pt-1">
            {topCustomersData.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No customer data.</p>
            ) : (
              topCustomersData.map((cust, idx) => {
                const widthPercent = (cust.totalSales / maxCustomerSales) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">{idx + 1}. {cust.companyName}</span>
                      <span className="text-slate-900 font-black">{formatCurrency(cust.totalSales)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 4: Top Selling Products */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Sales</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Top Selling Products</h3>
            </div>
            <Package size={16} className="text-violet-500" />
          </div>

          <div className="space-y-4 pt-1">
            {topSellingProductsData.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No sales records.</p>
            ) : (
              topSellingProductsData.map((p, idx) => {
                const widthPercent = (p.quantitySold / maxProductQty) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">{idx + 1}. {p.productName}</span>
                      <span className="text-slate-900 font-black">{p.quantitySold} units</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 5: Outstanding Receivables */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credit Balances</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Outstanding Receivables</h3>
            </div>
            <DollarSign size={16} className="text-rose-500" />
          </div>

          <div className="space-y-4 pt-1">
            {outstandingReceivablesData.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No outstanding balances.</p>
            ) : (
              outstandingReceivablesData.map((o, idx) => {
                const widthPercent = (o.outstandingAmount / maxOutstanding) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">{idx + 1}. {o.companyName}</span>
                      <span className="text-rose-600 font-black">{formatCurrency(o.outstandingAmount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Returns, Branch Sales & Customer Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 6: Returns Analysis */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card flex flex-col space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quality / Claim Analysis</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Returns Analysis</h3>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {returnsAnalysisDonut}
          </div>
        </div>

        {/* Widget 7: Branch-wise Sales */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4 flex flex-col">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch Aggregates</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Branch-wise Sales</h3>
            </div>
            <Building2 size={16} className="text-amber-500" />
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3.5 pt-1">
            {branchSalesData.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No branch sales data.</p>
            ) : (
              branchSalesData.slice(0, 5).map((b, idx) => {
                const widthPercent = (b.totalSales / maxBranchSales) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[180px]">{b.branchName}</span>
                      <span className="text-slate-900 font-black">{formatCurrency(b.totalSales)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 9: Customer Growth / Customer Acquisition Trend */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4 flex flex-col">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acquisition</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Customer Acquisition Trend</h3>
          </div>

          <div className="flex-1 relative w-full h-44 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight - 40}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines */}
              {[0, 0.5, 1].map((ratio, idx) => {
                const y = paddingTop + (chartHeight - 40) - ratio * (chartHeight - 40);
                return (
                  <line key={idx} x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeDasharray="4 4" className="opacity-40" />
                );
              })}

              {/* X Axis Month Labels */}
              {acqCoordinates.map((c, idx) => {
                const step = acqCoordinates.length > 31 ? 15 : 3;
                if (idx % step !== 0 && idx !== acqCoordinates.length - 1) return null;
                return (
                  <text key={idx} x={c.x} y={svgHeight - 65} textAnchor="middle" className="text-[8px] fill-slate-500 font-bold opacity-80" >
                    {c.label}
                  </text>
                );
              })}

              {/* Area path */}
              {acqAreaD && <path d={acqAreaD.replace(/170/g, '130')} fill="url(#growthGradient)" />}
              {acqPathD && <path d={acqPathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Point Circles */}
              {acqCoordinates.map((c, idx) => (
                <circle key={idx} cx={c.x} cy={c.y} r={3.5} fill="#ffffff" stroke="#10b981" strokeWidth={1.5} className="hover:r-5 cursor-pointer" >
                  <title>{`${c.label}: +${c.count} Customers`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute top-2 right-3 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              <TrendingUp size={10} /> New Registrations
            </div>
          </div>
        </div>

      </div>

      {/* Row 4: Dispatch Performance Lead Times */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Time Analysis</span>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Dispatch & Delivery Performance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 relative">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between items-center text-center relative hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl mb-3"><ShoppingCart size={18} /></div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Order → Approval</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {dispatchPerformanceData.orderToApproval} <span className="text-xs font-semibold text-slate-500">Days</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Average time from sales order creation to admin review approval.</p>
          </div>

          <div className="hidden md:flex absolute top-1/2 left-[31%] -translate-y-1/2 z-10 bg-indigo-50 text-indigo-600 rounded-full p-1 border border-indigo-100 no-print">
            <ChevronRight size={14} className="animate-pulse" />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between items-center text-center relative hover:shadow-md transition-shadow">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl mb-3"><Truck size={18} /></div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Approval → Dispatch</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {dispatchPerformanceData.approvalToDispatch} <span className="text-xs font-semibold text-slate-500">Days</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Average warehouse lead time from approval to courier tracking creation.</p>
          </div>

          <div className="hidden md:flex absolute top-1/2 left-[64%] -translate-y-1/2 z-10 bg-indigo-50 text-indigo-600 rounded-full p-1 border border-indigo-100 no-print">
            <ChevronRight size={14} className="animate-pulse" />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between items-center text-center relative hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-3"><Calendar size={18} /></div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dispatch → Delivery</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {dispatchPerformanceData.dispatchToDelivery} <span className="text-xs font-semibold text-slate-500">Days</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Average courier shipping duration from warehouse gate to customer branch receipt.</p>
          </div>
        </div>
      </div>

      {/* ===========================================================================
          NEW ADDITIONAL WIDGETS SECTION
          =========================================================================== */}
      
      <div className="flex items-center gap-2 border-l-4 border-l-violet-600 pl-3">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
          Inventory health & Outstanding Order Pipeline
        </h2>
        <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-black uppercase no-print">
          New Metrics
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 10: Top Slow Moving Products */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dead Stock Risk</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Slow Moving Products</h3>
            </div>
            <TrendingDown size={16} className="text-slate-500" />
          </div>

          <div className="space-y-4 pt-1">
            {slowMovingProductsData.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium space-y-1">
                <Info size={16} className="mx-auto text-slate-300" />
                <p>No slow moving products.</p>
                <p className="text-[10px] text-slate-450">All stocked products have recorded sales.</p>
              </div>
            ) : (
              slowMovingProductsData.map((p, idx) => {
                const widthPercent = (p.currentStock / maxSlowStock) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">{idx + 1}. {p.productName}</span>
                      <span className="text-slate-800 font-extrabold">{p.currentStock} in stock <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1 py-0.2 rounded-md">(0 sold)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 11: Top Returned Products */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quality Claims</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Top Returned Products</h3>
            </div>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>

          <div className="space-y-4 pt-1">
            {topReturnedProductsData.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No returned items recorded.</p>
            ) : (
              topReturnedProductsData.map((p, idx) => {
                const widthPercent = (p.quantityReturned / maxReturnQty) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[170px]">{idx + 1}. {p.productName}</span>
                      <span className="text-slate-900 font-black">{p.quantityReturned} units</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 12: Outstanding Orders Aging */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print-card flex flex-col space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Pipeline Aging</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Outstanding Orders Aging</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3 pt-1">
            {Object.entries(outstandingOrdersAgingData).map(([bracket, data]) => {
              let badgeColor = 'bg-slate-100 text-slate-700';
              if (bracket === '0-30') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
              else if (bracket === '31-60') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-100';
              else if (bracket === '61-90') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-100';
              else badgeColor = 'bg-red-50 text-red-700 border border-red-150';

              return (
                <div key={bracket} className="flex justify-between items-center text-xs py-2 border-b border-slate-55 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${badgeColor}`}>
                      {bracket === '90+' ? '90+ Days' : `${bracket} Days`}
                    </span>
                    <span className="font-extrabold text-slate-800">{data.count} Pending Orders</span>
                  </div>
                  <span className="font-black text-slate-900">{formatCurrency(data.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 13: Monthly Order Count (Separate from value) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-3 print-card space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Velocity</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Monthly Order Count</h3>
          </div>

          <div className="relative w-full h-48 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight - 60}`} className="w-full h-full overflow-visible">
              {/* Horizontal gridlines */}
              {[0, 0.5, 1].map((ratio, idx) => {
                const y = paddingTop + (chartHeight - 60) - ratio * (chartHeight - 60);
                return (
                  <line key={idx} x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeDasharray="4 4" className="opacity-40" />
                );
              })}

              {/* X Axis Labels */}
              {monthlyOrderCountData.map((p, idx) => {
                const step = monthlyOrderCountData.length > 31 ? 15 : 2;
                if (idx % step !== 0 && idx !== monthlyOrderCountData.length - 1) return null;
                const x = paddingLeft + (idx / (monthlyOrderCountData.length - 1 || 1)) * chartWidth;
                return (
                  <text key={idx} x={x} y={svgHeight - 85} textAnchor="middle" className="text-[8px] fill-slate-500 font-bold opacity-80" >
                    {p.label}
                  </text>
                );
              })}

              {/* Draw bars representing order count */}
              {monthlyOrderCountData.map((p, idx) => {
                const x = paddingLeft + (idx / (monthlyOrderCountData.length - 1 || 1)) * chartWidth;
                const barHeight = (p.count / maxOrderCount) * (chartHeight - 60);
                const barWidth = Math.max(1, chartWidth / (monthlyOrderCountData.length * 2.2));
                const y = paddingTop + (chartHeight - 60) - barHeight;

                return (
                  <g key={idx}>
                    <rect
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="#4f46e5"
                      rx={Math.max(1, barWidth / 4)}
                      className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <title>{`${p.label}: ${p.count} Orders`}</title>
                    </rect>
                    {/* Tiny count text on top of bar if not too crowded */}
                    {monthlyOrderCountData.length <= 12 && p.count > 0 && (
                      <text x={x} y={y - 4} textAnchor="middle" className="text-[8px] font-black fill-slate-700">
                        {p.count}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

      </div>

    </section>
  );
}
