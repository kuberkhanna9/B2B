export interface Profile {
  id: string;
  fullName: string;
  role: 'SUPERADMIN' | 'ACCOUNTS' | 'INVENTORY' | 'RETAIL' | 'B2B_CUSTOMER';
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  productName: string;
  category: string;
  subcategory?: string;
  description?: string;
  brand?: string;
  season?: string;
  active: boolean;
  createdAt: string;
}

export interface ProductColor {
  id: string;
  productId: string;
  colorName: string;
}

export interface ProductSize {
  id: string;
  productId: string;
  sizeName: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  colorId: string;
  sizeId: string;
  costPrice: number;
  wholesalePrice: number;
  mrp: number;
  rackLocation?: string;
  active: boolean;
  createdAt: string;
}

export interface StockRequest {
  id: string;
  variantId: string;
  requestType: 'STOCK_IN' | 'SALE' | 'DAMAGE_REPAIRABLE' | 'DAMAGE_NON_REPAIRABLE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  referenceNumber?: string;
  invoiceNumber?: string;
  remarks?: string;
  createdBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  requestId: string;
  variantId: string;
  transactionType: 'STOCK_IN' | 'SALE' | 'DAMAGE_REPAIRABLE' | 'DAMAGE_NON_REPAIRABLE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  referenceNumber?: string;
  invoiceNumber?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface PriceHistory {
  id: string;
  variantId: string;
  oldCostPrice: number;
  newCostPrice: number;
  oldWholesalePrice: number;
  newWholesalePrice: number;
  oldMrp: number;
  newMrp: number;
  changedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
}

// =============================================================================
// B2B CUSTOMER PORTAL INTERFACES
// =============================================================================

export interface Customer {
  id: string;
  companyName: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  active: boolean;
  createdAt: string;
}

export interface CustomerUser {
  id: string;
  customerId: string;
  username: string;
  fullName: string;
  email?: string;
  active: boolean;
  createdAt: string;
}

export interface CustomerPricing {
  id: string;
  customerId: string;
  variantId: string;
  customPrice: number;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  branchId?: string;
  sourceId?: string;
  createdBy: string; // customerUsers.id (or profiles.id)
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'PARTIALLY_FULFILLED' | 'PARTIALLY_DISPATCHED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  remarks?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  companyName?: string; // compiled join field
  creatorName?: string; // compiled join field
}

export interface SalesOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  orderedQuantity: number;
  approvedQuantity: number;
  dispatchedQuantity: number;
  pricePerUnit: number;
  totalPrice: number;
  createdAt: string;
  sku?: string;          // compiled join field
  productName?: string;  // compiled join field
  colorName?: string;    // compiled join field
  sizeName?: string;      // compiled join field
  mrp?: number;          // compiled join field
  availableStock?: number; // compiled join field for stock tracking
}

export interface Dispatch {
  id: string;
  orderId: string;
  dispatchNumber: string;
  courier: string;
  trackingNumber: string;
  dispatchDate: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  orderNumber?: string; // compiled join field
}

export interface DispatchItem {
  id: string;
  dispatchId: string;
  variantId: string;
  quantity: number;
  createdAt: string;
  sku?: string; // compiled join field
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  dueDate: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  invoicePdfUrl?: string;
  createdBy: string;
  createdAt: string;
  orderNumber?: string; // compiled join field
  companyName?: string; // compiled join field
}

export interface PaymentReference {
  id: string;
  customerId: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  paymentMode: 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH';
  referenceNumber?: string;
  utrNumber: string;
  notes?: string;
  attachmentUrl?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  companyName?: string;    // compiled join field
  invoiceNumber?: string;  // compiled join field
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  referenceType: 'INVOICE' | 'PAYMENT';
  referenceId: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  customerId: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// DYNAMIC STOCK COMPILATION UTILITY (Same logic as Inventory for consistency)
// -----------------------------------------------------------------------------
export interface ComputedStock {
  readyStock: number;
  repairableStock: number;
  scrapStock: number;
}

export function compileStockForVariant(variantId: string, transactions: StockTransaction[]): ComputedStock {
  let readyStock = 0;
  let repairableStock = 0;
  let scrapStock = 0;

  for (const t of transactions) {
    if (t.variantId !== variantId) continue;
    const qty = Number(t.quantity);
    
    switch (t.transactionType) {
      case 'STOCK_IN':
      case 'ADJUSTMENT_IN':
        readyStock += qty;
        break;
      case 'SALE':
      case 'ADJUSTMENT_OUT':
        readyStock -= qty;
        break;
      case 'DAMAGE_REPAIRABLE':
        readyStock -= qty;
        repairableStock += qty;
        break;
      case 'DAMAGE_NON_REPAIRABLE':
        readyStock -= qty;
        scrapStock += qty;
        break;
    }
  }

  return { readyStock, repairableStock, scrapStock };
}

export interface CustomerBranch {
  id: string;
  customerId: string;
  branchName: string;
  branchCode: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gst?: string;
  billingAddress?: string;
  shippingAddress?: string;
  status: string;
  createdAt: string;
}

export interface OrderSource {
  id: string;
  sourceName: string;
}

export interface CustomOrderItem {
  id: string;
  orderId: string;
  itemName: string;
  description?: string;
  quantity: number;
  wsp: number;
  mrp: number;
  gstPercent: number;
  hsnCode?: string;
  remarks?: string;
  imageUrl?: string;
  convertedVariantId?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  customerId: string;
  branchId?: string;
  orderId?: string;
  invoiceNumber?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'CLOSED';
  reason: 'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER';
  remarks?: string;
  createdByType: 'CUSTOMER' | 'ADMIN';
  createdBy: string;
  createdAt: string;
  companyName?: string;
  branchName?: string;
}

export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  variantId?: string;
  customItemName?: string;
  quantity: number;
  sku?: string;
  productName?: string;
}

export interface ReturnAttachment {
  id: string;
  returnRequestId: string;
  fileUrl: string;
  createdAt: string;
}

export interface ReturnResolution {
  id: string;
  returnRequestId: string;
  resolutionType: string;
  remarks?: string;
  resolvedBy: string;
  resolvedAt: string;
}
