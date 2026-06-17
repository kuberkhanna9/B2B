import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'b2b_mock_db.json');

// Types mirroring the database tables
export interface MockDbState {
  profiles: any[];
  products: any[];
  productColors: any[];
  productSizes: any[];
  productVariants: any[];
  stockRequests: any[];
  stockTransactions: any[];
  priceHistory: any[];
  auditLogs: any[];
  customers: any[];
  customerUsers: any[];
  customerPricing: any[];
  salesOrders: any[];
  salesOrderItems: any[];
  dispatches: any[];
  dispatchItems: any[];
  invoices: any[];
  paymentReferences: any[];
  customerLedger: any[];
  notifications: any[];
  customerBranches: any[];
  orderSources: any[];
  customOrderItems: any[];
  returnRequests: any[];
  returnRequestItems: any[];
  returnAttachments: any[];
  returnResolutions: any[];
}

// Fixed system admin accounts (session fallback)
const FIXED_PROFILES = [
  { id: 'b1100000-0000-0000-0000-000000000001', fullName: 'Super Admin', role: 'SUPERADMIN', active: true, createdAt: new Date().toISOString() },
  { id: 'b1100000-0000-0000-0000-000000000002', fullName: 'Accounts Department', role: 'ACCOUNTS', active: true, createdAt: new Date().toISOString() },
  { id: 'b1100000-0000-0000-0000-000000000003', fullName: 'Inventory Department', role: 'INVENTORY', active: true, createdAt: new Date().toISOString() },
  { id: 'b1100000-0000-0000-0000-000000000004', fullName: 'Retail Department', role: 'RETAIL', active: true, createdAt: new Date().toISOString() }
];

// Seed initial state if file doesn't exist
function getInitialState(): MockDbState {
  const now = new Date();
  
  const formatDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(now.getDate() - daysAgo);
    return d.toISOString();
  };

  const date5DaysAgo = formatDate(5);
  const date4DaysAgo = formatDate(4);
  const date3DaysAgo = formatDate(3);
  const date2DaysAgo = formatDate(2);
  const date1DayAgo = formatDate(1);
  const dateToday = now.toISOString();
  
  // Seed Products
  const products = [
    { id: 'prod-1', productName: 'Poncho Beige', category: 'Ponchos', description: 'Classic beige wool poncho with fringes.', brand: 'LJK Garments', season: 'Autumn/Winter 2026', active: true, createdAt: date5DaysAgo },
    { id: 'prod-2', productName: 'Cashmere Sweater', category: 'Sweaters', description: 'Premium 100% cashmere crewneck sweater.', brand: 'LJK Gold', season: 'Winter 2026', active: true, createdAt: date5DaysAgo },
    { id: 'prod-3', productName: 'Silk Scarf', category: 'Scarves', description: 'Smooth, hand-rolled pure silk scarf with prints.', brand: 'LJK Silk', season: 'All Season', active: true, createdAt: date5DaysAgo }
  ];

  // Seed Colors
  const productColors = [
    { id: 'col-1', productId: 'prod-1', colorName: 'Beige' },
    { id: 'col-2', productId: 'prod-2', colorName: 'Charcoal' },
    { id: 'col-3', productId: 'prod-3', colorName: 'Emerald Blue' }
  ];

  // Seed Sizes
  const productSizes = [
    { id: 'siz-1', productId: 'prod-1', sizeName: 'One Size' },
    { id: 'siz-2', productId: 'prod-2', sizeName: 'M' },
    { id: 'siz-3', productId: 'prod-2', sizeName: 'L' },
    { id: 'siz-4', productId: 'prod-3', sizeName: 'Standard' }
  ];

  // Seed Variants
  const productVariants = [
    { id: 'var-1', productId: 'prod-1', sku: 'LJK-PON-BEI-OS', colorId: 'col-1', sizeId: 'siz-1', costPrice: '450.00', wholesalePrice: '900.00', mrp: '1800.00', rackLocation: 'Rack A-12', active: true, createdAt: date5DaysAgo },
    { id: 'var-2', productId: 'prod-2', sku: 'LJK-SWE-CHA-M', colorId: 'col-2', sizeId: 'siz-2', costPrice: '750.00', wholesalePrice: '1500.00', mrp: '3000.00', rackLocation: 'Rack B-03', active: true, createdAt: date5DaysAgo },
    { id: 'var-3', productId: 'prod-2', sku: 'LJK-SWE-CHA-L', colorId: 'col-2', sizeId: 'siz-3', costPrice: '770.00', wholesalePrice: '1550.00', mrp: '3100.00', rackLocation: 'Rack B-04', active: true, createdAt: date5DaysAgo },
    { id: 'var-4', productId: 'prod-3', sku: 'LJK-SCA-EME-ST', colorId: 'col-3', sizeId: 'siz-4', costPrice: '300.00', wholesalePrice: '600.00', mrp: '1200.00', rackLocation: 'Rack C-09', active: true, createdAt: date5DaysAgo }
  ];

  // Seed Stock Transactions (Warehouse opening stock + adjustments)
  const stockTransactions = [
    { id: 'txn-1', requestId: 'req-seed', variantId: 'var-1', transactionType: 'STOCK_IN', quantity: 200, referenceNumber: 'INITIAL_STOCK', remarks: 'Warehouse opening stock', createdBy: FIXED_PROFILES[0].id, createdAt: date5DaysAgo },
    { id: 'txn-2', requestId: 'req-seed', variantId: 'var-2', transactionType: 'STOCK_IN', quantity: 150, referenceNumber: 'INITIAL_STOCK', remarks: 'Warehouse opening stock', createdBy: FIXED_PROFILES[0].id, createdAt: date5DaysAgo },
    { id: 'txn-3', requestId: 'req-seed', variantId: 'var-3', transactionType: 'STOCK_IN', quantity: 120, referenceNumber: 'INITIAL_STOCK', remarks: 'Warehouse opening stock', createdBy: FIXED_PROFILES[0].id, createdAt: date5DaysAgo },
    { id: 'txn-4', requestId: 'req-seed', variantId: 'var-4', transactionType: 'STOCK_IN', quantity: 250, referenceNumber: 'INITIAL_STOCK', remarks: 'Warehouse opening stock', createdBy: FIXED_PROFILES[0].id, createdAt: date5DaysAgo }
  ];

  // Seed Customers
  const customers = [
    { id: 'cust-1', companyName: 'ABC Exports', phone: '+91 98765 43210', email: 'abc_exports@lallji.com', billingAddress: '12, Industrial Area, Sector 5, Ludhiana, PB', shippingAddress: 'CF-140, Phase 7, Mohali, PB', active: true, createdAt: date5DaysAgo },
    { id: 'cust-2', companyName: 'XYZ Retail', phone: '+91 99999 88888', email: 'xyz_retail@lallji.com', billingAddress: 'Main Market, Mall Road, Shimla, HP', shippingAddress: 'Main Market, Mall Road, Shimla, HP', active: true, createdAt: date5DaysAgo }
  ];

  // Seed Customer Users
  const customerUsers = [
    { id: 'cu-1', customerId: 'cust-1', username: 'abc_exports', passwordHash: '5a9cde994326197176a6b57d0799981b2fb98822cc640c4a45a33cd4a80696fe', fullName: 'Anil Khanna (ABC)', email: 'abc_exports@lallji.com', active: true, createdAt: date5DaysAgo },
    { id: 'cu-2', customerId: 'cust-2', username: 'xyz_retail', passwordHash: 'cae8bf2805ef9cc7475f49ee2e707d885a5dfb088e1dc4a6828551ab9388df6c', fullName: 'Yash Sharma (XYZ)', email: 'xyz_retail@lallji.com', active: true, createdAt: date5DaysAgo }
  ];

  // Seed Pricing Overrides
  const customerPricing = [
    { id: 'cp-1', customerId: 'cust-1', variantId: 'var-1', customPrice: '850.00', createdAt: date5DaysAgo },
    { id: 'cp-2', customerId: 'cust-2', variantId: 'var-1', customPrice: '920.00', createdAt: date5DaysAgo }
  ];

  // ===========================================================================
  // RICH TRANSACTION MOCK DATA
  // ===========================================================================

  // 1. Sales Orders
  const salesOrders = [
    { id: 'so-1', orderNumber: 'SO-000001', customerId: 'cust-1', branchId: 'br-1', sourceId: 'CUSTOMER_PORTAL', createdBy: 'cu-1', status: 'DELIVERED', totalAmount: '127500.00', remarks: 'Please pack in double-ply boxes.', approvedBy: FIXED_PROFILES[0].id, approvedAt: date4DaysAgo, createdAt: date5DaysAgo },
    { id: 'so-2', orderNumber: 'SO-000002', customerId: 'cust-1', branchId: 'br-2', sourceId: 'CUSTOMER_PORTAL', createdBy: 'cu-1', status: 'PARTIALLY_FULFILLED', totalAmount: '51000.00', remarks: 'Ship via BlueDart.', approvedBy: FIXED_PROFILES[0].id, approvedAt: date3DaysAgo, createdAt: date3DaysAgo },
    { id: 'so-3', orderNumber: 'SO-000003', customerId: 'cust-2', branchId: 'br-4', sourceId: 'CUSTOMER_PORTAL', createdBy: 'cu-2', status: 'PENDING_APPROVAL', totalAmount: '18500.00', remarks: 'Need invoice hardcopy.', approvedBy: null, approvedAt: null, createdAt: dateToday },
    { id: 'so-4', orderNumber: 'SO-000004', customerId: 'cust-1', branchId: 'br-1', sourceId: 'CUSTOMER_PORTAL', createdBy: 'cu-1', status: 'APPROVED', totalAmount: '60000.00', remarks: 'Urgent shipment required.', approvedBy: FIXED_PROFILES[0].id, approvedAt: date1DayAgo, createdAt: date1DayAgo }
  ];

  // 2. Sales Order Items
  const salesOrderItems = [
    // SO-000001: 150 units of Poncho Beige (var-1) @ custom price 850
    { id: 'soi-1', orderId: 'so-1', variantId: 'var-1', orderedQuantity: 150, approvedQuantity: 150, dispatchedQuantity: 150, pricePerUnit: '850.00', totalPrice: '127500.00', createdAt: date5DaysAgo },
    
    // SO-000002: 30 units of Sweater M (var-2) @ 1500 + 10 units of Scarf (var-4) @ 600
    { id: 'soi-2', orderId: 'so-2', variantId: 'var-2', orderedQuantity: 30, approvedQuantity: 30, dispatchedQuantity: 30, pricePerUnit: '1500.00', totalPrice: '45000.00', createdAt: date3DaysAgo },
    { id: 'soi-3', orderId: 'so-2', variantId: 'var-4', orderedQuantity: 10, approvedQuantity: 10, dispatchedQuantity: 10, pricePerUnit: '600.00', totalPrice: '6000.00', createdAt: date3DaysAgo },

    // SO-000003: 10 units of Sweater L (var-3) @ 1550 + 5 units of Scarf (var-4) @ 600
    { id: 'soi-4', orderId: 'so-3', variantId: 'var-3', orderedQuantity: 10, approvedQuantity: 0, dispatchedQuantity: 0, pricePerUnit: '1550.00', totalPrice: '15500.00', createdAt: dateToday },
    { id: 'soi-5', orderId: 'so-3', variantId: 'var-4', orderedQuantity: 5, approvedQuantity: 0, dispatchedQuantity: 0, pricePerUnit: '600.00', totalPrice: '3000.00', createdAt: dateToday },

    // SO-000004: 40 units of Sweater M (var-2) @ 1500
    { id: 'soi-6', orderId: 'so-4', variantId: 'var-2', orderedQuantity: 40, approvedQuantity: 40, dispatchedQuantity: 0, pricePerUnit: '1500.00', totalPrice: '60000.00', createdAt: date1DayAgo }
  ];

  // 3. Dispatches
  const dispatches = [
    { id: 'disp-1', orderId: 'so-1', dispatchNumber: 'DIS-000001', courier: 'Blue Dart', trackingNumber: 'BD998877665IN', dispatchDate: date4DaysAgo, remarks: 'Delivered safely.', createdBy: FIXED_PROFILES[2].id, createdAt: date4DaysAgo },
    { id: 'disp-2', orderId: 'so-2', dispatchNumber: 'DIS-000002', courier: 'Delhivery Courier', trackingNumber: 'DL112233445IN', dispatchDate: date2DaysAgo, remarks: 'Partial dispatch of ready items.', createdBy: FIXED_PROFILES[2].id, createdAt: date2DaysAgo }
  ];

  // 4. Dispatch Items
  const dispatchItems = [
    { id: 'di-1', dispatchId: 'disp-1', variantId: 'var-1', quantity: 150, createdAt: date4DaysAgo },
    { id: 'di-2', dispatchId: 'disp-2', variantId: 'var-2', quantity: 30, createdAt: date2DaysAgo },
    { id: 'di-3', dispatchId: 'disp-2', variantId: 'var-4', quantity: 10, createdAt: date2DaysAgo }
  ];

  // 5. Invoices
  const invoices = [
    { id: 'inv-1', orderId: 'so-1', invoiceNumber: 'INV-2026-0001', invoiceDate: date4DaysAgo, amount: '127500.00', dueDate: formatDate(-25), status: 'PAID', invoicePdfUrl: '/uploads/invoice_so_000001.pdf', createdBy: FIXED_PROFILES[1].id, createdAt: date4DaysAgo },
    { id: 'inv-2', orderId: 'so-2', invoiceNumber: 'INV-2026-0002', invoiceDate: date2DaysAgo, amount: '51000.00', dueDate: formatDate(-28), status: 'PARTIALLY_PAID', invoicePdfUrl: '/uploads/invoice_so_000002.pdf', createdBy: FIXED_PROFILES[1].id, createdAt: date2DaysAgo }
  ];

  // 6. External Payment References
  const paymentReferences = [
    { id: 'pay-1', customerId: 'cust-1', invoiceId: 'inv-1', paymentDate: date3DaysAgo, amount: '127500.00', paymentMode: 'BANK_TRANSFER', referenceNumber: 'TXN-HDFC-999', utrNumber: 'HDFCR5202606130001', notes: 'Cleared full invoice INV-2026-0001', attachmentUrl: '/uploads/receipt_utr_hdfc.jpg', status: 'VERIFIED', verifiedBy: FIXED_PROFILES[1].id, verifiedAt: date3DaysAgo, rejectionReason: null, createdAt: date3DaysAgo },
    { id: 'pay-2', customerId: 'cust-1', invoiceId: 'inv-2', paymentDate: date1DayAgo, amount: '30000.00', paymentMode: 'UPI', referenceNumber: 'TXN-GPay-UPI', utrNumber: 'UPI998877665544', notes: 'Partial payment invoice INV-2026-0002', attachmentUrl: '/uploads/screenshot_gpay.jpg', status: 'VERIFIED', verifiedBy: FIXED_PROFILES[1].id, verifiedAt: date1DayAgo, rejectionReason: null, createdAt: date1DayAgo },
    { id: 'pay-3', customerId: 'cust-2', invoiceId: null, paymentDate: dateToday, amount: '5000.00', paymentMode: 'CASH', referenceNumber: 'CASH-DEP-987', utrNumber: 'CSH999888777000', notes: 'Advance for pending orders', attachmentUrl: null, status: 'SUBMITTED', verifiedBy: null, verifiedAt: null, rejectionReason: null, createdAt: dateToday }
  ];

  // 7. Customer Ledger running cards
  const customerLedger = [
    // ABC Exports (cust-1)
    { id: 'led-1', customerId: 'cust-1', date: date4DaysAgo, referenceType: 'INVOICE', referenceId: 'inv-1', debitAmount: '127500.00', creditAmount: '0.00', runningBalance: '127500.00', description: 'Billed Invoice INV-2026-0001 for Order SO-000001', createdAt: date4DaysAgo },
    { id: 'led-2', customerId: 'cust-1', date: date3DaysAgo, referenceType: 'PAYMENT', referenceId: 'pay-1', debitAmount: '0.00', creditAmount: '127500.00', runningBalance: '0.00', description: 'Payment reference UTR HDFCR5202606130001 verified (BANK_TRANSFER)', createdAt: date3DaysAgo },
    { id: 'led-3', customerId: 'cust-1', date: date2DaysAgo, referenceType: 'INVOICE', referenceId: 'inv-2', debitAmount: '51000.00', creditAmount: '0.00', runningBalance: '51000.00', description: 'Billed Invoice INV-2026-0002 for Order SO-000002', createdAt: date2DaysAgo },
    { id: 'led-4', customerId: 'cust-1', date: date1DayAgo, referenceType: 'PAYMENT', referenceId: 'pay-2', debitAmount: '0.00', creditAmount: '30000.00', runningBalance: '21000.00', description: 'Payment reference UTR UPI998877665544 verified (UPI)', createdAt: date1DayAgo }
  ];

  // 8. Notifications
  const notifications = [
    { id: 'not-1', customerId: 'cust-1', message: 'Your order SO-000001 has been successfully submitted and is awaiting approval.', read: true, type: 'ORDER_SUBMITTED', createdAt: date5DaysAgo },
    { id: 'not-2', customerId: 'cust-1', message: 'Your sales order SO-000001 has been approved! Stock has been reserved.', read: true, type: 'ORDER_APPROVED', createdAt: date4DaysAgo },
    { id: 'not-3', customerId: 'cust-1', message: 'Shipment created: DIS-000001 via Blue Dart for order SO-000001. Tracking No: BD998877665IN', read: true, type: 'DISPATCH_CREATED', createdAt: date4DaysAgo },
    { id: 'not-4', customerId: 'cust-1', message: 'Invoice INV-2026-0001 has been uploaded for order SO-000001. Amount: ₹127,500.', read: true, type: 'INVOICE_UPLOADED', createdAt: date4DaysAgo },
    { id: 'not-5', customerId: 'cust-1', message: 'Your payment reference for ₹127,500 has been verified and credited.', read: true, type: 'PAYMENT_VERIFIED', createdAt: date3DaysAgo },
    { id: 'not-6', customerId: 'cust-1', message: 'Your sales order SO-000002 has been approved! Stock has been reserved.', read: true, type: 'ORDER_APPROVED', createdAt: date3DaysAgo },
    { id: 'not-7', customerId: 'cust-1', message: 'Shipment created: DIS-000002 via Delhivery Courier for order SO-000002. Tracking No: DL112233445IN', read: false, type: 'DISPATCH_CREATED', createdAt: date2DaysAgo },
    { id: 'not-8', customerId: 'cust-1', message: 'Invoice INV-2026-0002 has been uploaded for order SO-000002. Amount: ₹51,000.', read: false, type: 'INVOICE_UPLOADED', createdAt: date2DaysAgo },
    { id: 'not-9', customerId: 'cust-1', message: 'Your payment reference for ₹30,000 has been verified and credited.', read: false, type: 'PAYMENT_VERIFIED', createdAt: date1DayAgo }
  ];

  // Adjust stock levels on pre-seeded variants by incorporating dispatch SALE transactions!
  // var-1 had 200 units. DIS-000001 shipped 150 units -> transaction type SALE is recorded.
  // var-2 had 150 units. DIS-000002 shipped 30 units -> transaction type SALE is recorded.
  // var-4 had 250 units. DIS-000002 shipped 10 units -> transaction type SALE is recorded.
  stockTransactions.push(
    { id: 'txn-disp-1', requestId: 'req-dispatch-disp-1', variantId: 'var-1', transactionType: 'SALE', quantity: 150, referenceNumber: 'DIS-000001', remarks: 'B2B Shipment DIS-000001 for SO-000001', createdBy: FIXED_PROFILES[2].id, createdAt: date4DaysAgo },
    { id: 'txn-disp-2', requestId: 'req-dispatch-disp-2', variantId: 'var-2', transactionType: 'SALE', quantity: 30, referenceNumber: 'DIS-000002', remarks: 'B2B Shipment DIS-000002 for SO-000002', createdBy: FIXED_PROFILES[2].id, createdAt: date2DaysAgo },
    { id: 'txn-disp-3', requestId: 'req-dispatch-disp-2', variantId: 'var-4', transactionType: 'SALE', quantity: 10, referenceNumber: 'DIS-000002', remarks: 'B2B Shipment DIS-000002 for SO-000002', createdBy: FIXED_PROFILES[2].id, createdAt: date2DaysAgo }
  );

  // 9. Audit Logs
  const auditLogs = [
    { id: 'aud-1', userId: FIXED_PROFILES[0].id, action: 'ORDER_APPROVE', module: 'B2B_ORDERS', description: 'Approved sales order SO-000001 with reserved quantities.', createdAt: date4DaysAgo },
    { id: 'aud-2', userId: FIXED_PROFILES[2].id, action: 'DISPATCH_CREATE', module: 'B2B_DISPATCHES', description: 'Dispatched shipment DIS-000001 for sales order SO-000001', createdAt: date4DaysAgo },
    { id: 'aud-3', userId: FIXED_PROFILES[1].id, action: 'INVOICE_CREATE', module: 'B2B_INVOICES', description: 'Uploaded invoice INV-2026-0001 for sales order SO-000001', createdAt: date4DaysAgo },
    { id: 'aud-4', userId: FIXED_PROFILES[1].id, action: 'PAYMENT_VERIFY', module: 'B2B_PAYMENTS', description: 'Verified payment reference UTR: HDFCR5202606130001 (Amount: ₹127500.00)', createdAt: date3DaysAgo },
    { id: 'aud-5', userId: FIXED_PROFILES[0].id, action: 'ORDER_APPROVE', module: 'B2B_ORDERS', description: 'Approved sales order SO-000002 with reserved quantities.', createdAt: date3DaysAgo },
    { id: 'aud-6', userId: FIXED_PROFILES[2].id, action: 'DISPATCH_CREATE', module: 'B2B_DISPATCHES', description: 'Dispatched shipment DIS-000002 for sales order SO-000002', createdAt: date2DaysAgo },
    { id: 'aud-7', userId: FIXED_PROFILES[1].id, action: 'INVOICE_CREATE', module: 'B2B_INVOICES', description: 'Uploaded invoice INV-2026-0002 for sales order SO-000002', createdAt: date2DaysAgo },
    { id: 'aud-8', userId: FIXED_PROFILES[1].id, action: 'PAYMENT_VERIFY', module: 'B2B_PAYMENTS', description: 'Verified payment reference UTR: UPI998877665544 (Amount: ₹30000.00)', createdAt: date1DayAgo },
    { id: 'aud-9', userId: FIXED_PROFILES[0].id, action: 'ORDER_APPROVE', module: 'B2B_ORDERS', description: 'Approved sales order SO-000004 with reserved quantities.', createdAt: date1DayAgo }
  ];

  const orderSources = [
    { id: 'CUSTOMER_PORTAL', sourceName: 'Customer Portal' },
    { id: 'ADMIN_CREATED', sourceName: 'Admin Created' },
    { id: 'WHATSAPP', sourceName: 'WhatsApp' },
    { id: 'PHONE', sourceName: 'Phone Call' },
    { id: 'EMAIL', sourceName: 'Email' }
  ];

  const customerBranches = [
    { id: 'br-1', customerId: 'cust-1', branchName: 'Ludhiana Head Office', branchCode: 'LDH-01', contactPerson: 'Anil Khanna', phone: '+91 98765 43210', email: 'abc_exports@lallji.com', gst: '03AAAAA1111A1Z1', billingAddress: '12, Industrial Area, Sector 5, Ludhiana, PB', shippingAddress: '12, Industrial Area, Sector 5, Ludhiana, PB', status: 'ACTIVE', createdAt: date5DaysAgo },
    { id: 'br-2', customerId: 'cust-1', branchName: 'Delhi Depot', branchCode: 'DEL-02', contactPerson: 'Sanjay Gupta', phone: '+91 99999 11111', email: 'delhi@abc.com', gst: '07AAAAA1111A1Z2', billingAddress: '12, Industrial Area, Sector 5, Ludhiana, PB', shippingAddress: 'Warehouse B-4, Okhla Phase 3, New Delhi', status: 'ACTIVE', createdAt: date5DaysAgo },
    { id: 'br-3', customerId: 'cust-1', branchName: 'Jaipur Showroom', branchCode: 'JPR-03', contactPerson: 'Rajesh Sharma', phone: '+91 98888 22222', email: 'jaipur@abc.com', gst: '08AAAAA1111A1Z3', billingAddress: '12, Industrial Area, Sector 5, Ludhiana, PB', shippingAddress: 'Showroom 14, MI Road, Jaipur, RJ', status: 'ACTIVE', createdAt: date5DaysAgo },
    { id: 'br-4', customerId: 'cust-2', branchName: 'Shimla Mall Road', branchCode: 'SML-01', contactPerson: 'Yash Sharma', phone: '+91 99999 88888', email: 'xyz_retail@lallji.com', gst: '02AAAAA1111A1Z4', billingAddress: 'Main Market, Mall Road, Shimla, HP', shippingAddress: 'Main Market, Mall Road, Shimla, HP', status: 'ACTIVE', createdAt: date5DaysAgo }
  ];

  return {
    profiles: [...FIXED_PROFILES],
    products,
    productColors,
    productSizes,
    productVariants,
    stockRequests: [],
    stockTransactions,
    priceHistory: [],
    auditLogs,
    customers,
    customerUsers,
    customerPricing,
    salesOrders,
    salesOrderItems,
    dispatches,
    dispatchItems,
    invoices,
    paymentReferences,
    customerLedger,
    notifications,
    customerBranches,
    orderSources,
    customOrderItems: [],
    returnRequests: [],
    returnRequestItems: [],
    returnAttachments: [],
    returnResolutions: []
  };
}

export function readDb(): MockDbState {
  if (!fs.existsSync(DB_FILE)) {
    const state = getInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
    return state;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const defaults = getInitialState();
    return {
      ...defaults,
      ...parsed
    };
  } catch (err) {
    console.error('Error reading mock DB file, returning empty state:', err);
    return getInitialState();
  }
}

export function writeDb(state: MockDbState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write mock DB state:', err);
  }
}

// Generate standard UUID-like string
function uuid() {
  return 'mock-' + Math.random().toString(36).substring(2, 11);
}

// =============================================================================
// MOCK DATABASE ACCESS IMPLEMENTATION
// =============================================================================

export const jsonDb = {
  // Audit logs
  logB2BAuditDetailed: (userId: string | null, action: string, module: string, description: string, oldValue?: string | null, newValue?: string | null) => {
    const state = readDb();
    state.auditLogs.push({
      id: uuid(),
      userId: userId && !userId.startsWith('cust-') && userId.length === 36 ? userId : null,
      action,
      module,
      description,
      oldValue: oldValue || null,
      newValue: newValue || null,
      createdAt: new Date().toISOString()
    });
    writeDb(state);
    return true;
  },
  logB2BAudit: (userId: string | null, action: string, module: string, description: string) => {
    return jsonDb.logB2BAuditDetailed(userId, action, module, description, null, null);
  },

  // Customers
  getCustomers: () => {
    return readDb().customers;
  },
  createCustomer: (data: any) => {
    const state = readDb();
    const newCust = {
      id: uuid(),
      companyName: data.companyName,
      phone: data.phone || null,
      email: data.email || null,
      billingAddress: data.billingAddress || null,
      shippingAddress: data.shippingAddress || null,
      active: true,
      createdAt: new Date().toISOString()
    };
    state.customers.push(newCust);
    writeDb(state);
    return newCust;
  },
  updateCustomer: (id: string, data: any) => {
    const state = readDb();
    const idx = state.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.customers[idx] = {
        ...state.customers[idx],
        ...data,
        active: data.active !== undefined ? data.active : state.customers[idx].active
      };
      writeDb(state);
      return true;
    }
    return false;
  },

  // Customer Users
  getCustomerUsers: (customerId?: string) => {
    const users = readDb().customerUsers;
    return customerId ? users.filter(u => u.customerId === customerId) : users;
  },
  createCustomerUser: (customerId: string, username: string, passwordHash: string, fullName: string, email: string) => {
    const state = readDb();
    const newUser = {
      id: uuid(),
      customerId,
      username,
      passwordHash,
      fullName,
      email,
      active: true,
      createdAt: new Date().toISOString()
    };
    state.customerUsers.push(newUser);
    writeDb(state);
    return newUser;
  },

  // Customer Pricing
  getCustomerPricing: (customerId: string) => {
    return readDb().customerPricing.filter(p => p.customerId === customerId);
  },
  getAllPricingOverrides: () => {
    return readDb().customerPricing;
  },
  setCustomerPricing: (customerId: string, variantId: string, customPrice: number) => {
    const state = readDb();
    const idx = state.customerPricing.findIndex(p => p.customerId === customerId && p.variantId === variantId);
    if (idx !== -1) {
      state.customerPricing[idx].customPrice = String(customPrice);
    } else {
      state.customerPricing.push({
        id: uuid(),
        customerId,
        variantId,
        customPrice: String(customPrice),
        createdAt: new Date().toISOString()
      });
    }
    writeDb(state);
    return true;
  },
  deleteCustomerPricing: (id: string) => {
    const state = readDb();
    state.customerPricing = state.customerPricing.filter(p => p.id !== id);
    writeDb(state);
    return true;
  },

  // Products & Variants (Catalog)
  getProducts: () => readDb().products,
  getProductColors: () => readDb().productColors,
  getProductSizes: () => readDb().productSizes,
  getProductVariants: () => readDb().productVariants,
  getStockTransactions: () => readDb().stockTransactions,

  getB2BCatalog: (customerId?: string) => {
    const state = readDb();
    
    // 1. Compile physical stock for each variant
    const transactions = state.stockTransactions;
    const reservedMap: Record<string, number> = {};
    
    // 2. Reserved stock from APPROVED or PARTIALLY_FULFILLED orders
    const approvedOrders = state.salesOrders.filter(o => o.status === 'APPROVED' || o.status === 'PARTIALLY_FULFILLED');
    for (const o of approvedOrders) {
      const items = state.salesOrderItems.filter(item => item.orderId === o.id);
      for (const item of items) {
        const reservedAmt = Math.max(0, item.approvedQuantity - item.dispatchedQuantity);
        reservedMap[item.variantId] = (reservedMap[item.variantId] || 0) + reservedAmt;
      }
    }
    
    // 3. Customer specific pricing overrides
    const pricingMap: Record<string, number> = {};
    if (customerId) {
      const overrides = state.customerPricing.filter(p => p.customerId === customerId);
      for (const p of overrides) {
        pricingMap[p.variantId] = Number(p.customPrice);
      }
    }
    
    // 4. Build catalog
    const activeProducts = state.products.filter(p => p.active);
    const catalog: any[] = [];
    
    for (const p of activeProducts) {
      const pVariants = state.productVariants.filter(v => v.productId === p.id && v.active);
      if (pVariants.length === 0) continue;
      
      const variantsData = pVariants.map(v => {
        const colorObj = state.productColors.find(c => c.id === v.colorId);
        const sizeObj = state.productSizes.find(s => s.id === v.sizeId);
        
        // Compile stock
        let physical = 0;
        for (const t of transactions) {
          if (t.variantId === v.id) {
            const qty = Number(t.quantity);
            if (t.transactionType === 'STOCK_IN' || t.transactionType === 'ADJUSTMENT_IN') physical += qty;
            if (t.transactionType === 'SALE' || t.transactionType === 'ADJUSTMENT_OUT') physical -= qty;
            if (t.transactionType === 'DAMAGE_REPAIRABLE' || t.transactionType === 'DAMAGE_NON_REPAIRABLE') physical -= qty;
          }
        }
        
        const reserved = reservedMap[v.id] || 0;
        const available = Math.max(0, physical - reserved);
        
        const standardWholesale = Number(v.wholesalePrice);
        const customPrice = pricingMap[v.id] !== undefined ? pricingMap[v.id] : standardWholesale;
        
        return {
          variantId: v.id,
          sku: v.sku,
          barcode: v.sku,
          colorName: colorObj ? colorObj.colorName : 'Unknown',
          sizeName: sizeObj ? sizeObj.sizeName : 'Unknown',
          physicalStock: physical,
          reservedStock: reserved,
          availableStock: available,
          standardWholesalePrice: standardWholesale,
          customerPrice: customPrice,
          mrp: Number(v.mrp),
          rackLocation: v.rackLocation || undefined
        };
      });
      
      catalog.push({
        productId: p.id,
        productName: p.productName,
        category: p.category,
        description: p.description || undefined,
        active: p.active,
        variants: variantsData
      });
    }
    
    return catalog;
  },

  // Notifications
  createB2BNotification: (customerId: string, message: string, type: string) => {
    const state = readDb();
    state.notifications.push({
      id: uuid(),
      customerId,
      message,
      read: false,
      type,
      createdAt: new Date().toISOString()
    });
    writeDb(state);
    return true;
  },
  getNotifications: (customerId: string) => {
    const state = readDb();
    return state.notifications
      .filter(n => n.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  markNotificationsAsRead: (customerId: string) => {
    const state = readDb();
    state.notifications.forEach(n => {
      if (n.customerId === customerId) n.read = true;
    });
    writeDb(state);
    return true;
  },

  // Orders
  getSalesOrders: (customerId?: string) => {
    const state = readDb();
    let orders = state.salesOrders;
    if (customerId) {
      orders = orders.filter(o => o.customerId === customerId);
    }
    
    return orders.map(o => {
      const cust = state.customers.find(c => c.id === o.customerId);
      const creator = state.customerUsers.find(cu => cu.id === o.createdBy) || state.profiles.find(p => p.id === o.createdBy);
      return {
        ...o,
        companyName: cust ? cust.companyName : 'Unknown Client',
        creatorName: creator ? creator.fullName : 'System'
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getOrderDetails: (orderId: string) => {
    const state = readDb();
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order) return null;

    const cust = state.customers.find(c => c.id === order.customerId);
    const branch = state.customerBranches.find(b => b.id === order.branchId);
    const creator = state.customerUsers.find(cu => cu.id === order.createdBy) || state.profiles.find(p => p.id === order.createdBy);
    const items = state.salesOrderItems.filter(item => item.orderId === orderId).map(item => {
      const variant = state.productVariants.find(v => v.id === item.variantId);
      const prod = variant ? state.products.find(p => p.id === variant.productId) : null;
      const color = variant ? state.productColors.find(c => c.id === variant.colorId) : null;
      const size = variant ? state.productSizes.find(s => s.id === variant.sizeId) : null;
      
      const catalog = jsonDb.getB2BCatalog(order.customerId);
      let available = 0;
      for (const p of catalog) {
        const vInfo = p.variants.find((v: any) => v.variantId === item.variantId);
        if (vInfo) {
          available = vInfo.availableStock;
        }
      }

      return {
        ...item,
        sku: variant ? variant.sku : 'N/A',
        productName: prod ? prod.productName : 'Garment Product',
        colorName: color ? color.colorName : 'N/A',
        sizeName: size ? size.sizeName : 'N/A',
        mrp: variant ? Number(variant.mrp) : 0,
        availableStock: available
      };
    });

    const customItems = state.customOrderItems ? state.customOrderItems.filter(item => item.orderId === orderId) : [];

    return {
      order: {
        ...order,
        companyName: cust ? cust.companyName : 'Unknown Client',
        branchName: branch ? branch.branchName : 'Main Office',
        creatorName: creator ? creator.fullName : 'System'
      },
      items,
      customItems
    };
  },
  getSalesOrderDetails: (orderId: string) => {
    return jsonDb.getOrderDetails(orderId);
  },
  createSalesOrder: (customerId: string, branchId: string, createdBy: string, items: any[], remarks?: string) => {
    const state = readDb();
    const orderId = uuid();
    const now = new Date().toISOString();
    
    const nextNum = state.salesOrders.length + 1;
    const orderNumber = 'SO-' + String(nextNum).padStart(6, '0');

    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const itemPrice = Number(item.price);
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        id: uuid(),
        orderId,
        variantId: item.variantId,
        orderedQuantity: item.quantity,
        approvedQuantity: 0,
        dispatchedQuantity: 0,
        pricePerUnit: String(itemPrice),
        totalPrice: String(itemTotal),
        createdAt: now
      });
    }

    const newOrder = {
      id: orderId,
      orderNumber,
      customerId,
      branchId,
      sourceId: 'CUSTOMER_PORTAL',
      createdBy,
      status: 'PENDING_APPROVAL',
      totalAmount: String(totalAmount),
      remarks: remarks || null,
      approvedBy: null,
      approvedAt: null,
      createdAt: now
    };

    state.salesOrders.push(newOrder);
    state.salesOrderItems.push(...orderItems);
    
    state.notifications.push({
      id: uuid(),
      customerId,
      message: `Your order ${orderNumber} has been successfully submitted and is awaiting approval.`,
      read: false,
      type: 'ORDER_SUBMITTED',
      createdAt: now
    });

    writeDb(state);
    return {
      success: true,
      order: {
        ...newOrder,
        totalAmount: totalAmount
      }
    };
  },
  approveSalesOrder: (orderId: string, approvedBy: string, approvedItems: { itemId: string; approvedQty: number; replacedVariantId?: string; reject?: boolean }[]) => {
    const state = readDb();
    const oIdx = state.salesOrders.findIndex(o => o.id === orderId);
    if (oIdx === -1) return { success: false, error: 'Order not found.' };

    const now = new Date().toISOString();
    const order = state.salesOrders[oIdx];

    let hasApproved = false;
    let hasRejected = false;
    let hasPartial = false;
    let adjustedTotal = 0;

    for (const appItem of approvedItems) {
      const itemIdx = state.salesOrderItems.findIndex(item => item.id === appItem.itemId);
      if (itemIdx !== -1) {
        const item = state.salesOrderItems[itemIdx];
        const oldValStr = JSON.stringify(item);
        
        // Handle SKU replacement
        if (appItem.replacedVariantId) {
          item.variantId = appItem.replacedVariantId;
          const variant = state.productVariants.find(v => v.id === appItem.replacedVariantId);
          if (variant) {
            item.pricePerUnit = Number(variant.wholesalePrice);
          }
        }

        if (appItem.reject || appItem.approvedQty <= 0) {
          item.approvedQuantity = 0;
          item.totalPrice = '0.00';
          hasRejected = true;
          jsonDb.logB2BAuditDetailed(approvedBy, 'SKU_REJECT', 'B2B_ORDERS', `Rejected SKU item ${item.id} in order ${order.orderNumber}`, oldValStr, JSON.stringify(item));
        } else {
          item.approvedQuantity = appItem.approvedQty;
          item.totalPrice = String(Number(item.pricePerUnit) * appItem.approvedQty);
          adjustedTotal += Number(item.totalPrice);
          
          if (appItem.approvedQty < item.orderedQuantity) {
            hasPartial = true;
          }
          hasApproved = true;
          jsonDb.logB2BAuditDetailed(approvedBy, 'SKU_APPROVE', 'B2B_ORDERS', `Approved SKU item ${item.id} qty=${appItem.approvedQty} in order ${order.orderNumber}`, oldValStr, JSON.stringify(item));
        }
      }
    }
    
    order.totalAmount = String(adjustedTotal);
    order.approvedBy = approvedBy;
    order.approvedAt = now;

    if (hasApproved) {
      order.status = hasPartial || hasRejected ? 'PARTIALLY_APPROVED' : 'APPROVED';
    } else {
      order.status = 'CANCELLED';
    }

    state.notifications.push({
      id: uuid(),
      customerId: order.customerId,
      message: `Your sales order ${order.orderNumber} status updated to ${order.status} for ₹${adjustedTotal}.`,
      read: false,
      type: 'ORDER_APPROVED',
      createdAt: now
    });

    writeDb(state);
    return { success: true };
  },
  rejectSalesOrder: (orderId: string, userId: string) => {
    const state = readDb();
    const idx = state.salesOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      state.salesOrders[idx].status = 'CANCELLED';
      state.notifications.push({
        id: uuid(),
        customerId: state.salesOrders[idx].customerId,
        message: `Your order ${state.salesOrders[idx].orderNumber} was rejected by administrators.`,
        read: false,
        type: 'ORDER_REJECTED',
        createdAt: new Date().toISOString()
      });
      
      state.auditLogs.push({
        id: uuid(),
        userId,
        action: 'ORDER_REJECT',
        module: 'B2B_ORDERS',
        description: `Rejected/Cancelled sales order ${state.salesOrders[idx].orderNumber}`,
        createdAt: new Date().toISOString()
      });

      writeDb(state);
      return { success: true };
    }
    return { success: false, error: 'Order not found.' };
  },

  // Dispatches
  getDispatches: (customerId?: string) => {
    const state = readDb();
    let dispatches = state.dispatches;
    if (customerId) {
      dispatches = dispatches.filter(d => {
        const order = state.salesOrders.find(o => o.id === d.orderId);
        return order && order.customerId === customerId;
      });
    }

    return dispatches.map(d => {
      const order = state.salesOrders.find(o => o.id === d.orderId);
      return {
        ...d,
        orderNumber: order ? order.orderNumber : 'N/A'
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  createDispatch: (orderId: string, courier: string, trackingNumber: string, remarks: string, createdBy: string, items: { itemId: string; variantId: string; quantity: number }[]) => {
    const state = readDb();
    const now = new Date().toISOString();
    
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };

    const nextNum = state.dispatches.length + 1;
    const dispatchNumber = 'DIS-' + String(nextNum).padStart(6, '0');
    const dispatchId = uuid();

    const newDispatch = {
      id: dispatchId,
      orderId,
      dispatchNumber,
      courier,
      trackingNumber,
      dispatchDate: now,
      remarks: remarks || null,
      createdBy,
      createdAt: now
    };
    state.dispatches.push(newDispatch);

    const dispatchItemsList: any[] = [];
    
    for (const dItem of items) {
      const soItem = state.salesOrderItems.find(item => item.id === dItem.itemId);
      if (soItem) {
        soItem.dispatchedQuantity += dItem.quantity;
      }

      dispatchItemsList.push({
        id: uuid(),
        dispatchId,
        variantId: dItem.variantId,
        quantity: dItem.quantity,
        createdAt: now
      });

      state.stockTransactions.push({
        id: uuid(),
        requestId: 'req-dispatch-' + dispatchId,
        variantId: dItem.variantId,
        transactionType: 'SALE',
        quantity: dItem.quantity,
        referenceNumber: dispatchNumber,
        remarks: `B2B Shipment ${dispatchNumber} for ${order.orderNumber}`,
        createdBy,
        createdAt: now
      });
    }
    state.dispatchItems.push(...dispatchItemsList);

    const allItems = state.salesOrderItems.filter(item => item.orderId === orderId);
    const fullyShipped = allItems.every(item => item.dispatchedQuantity >= item.approvedQuantity);
    const partiallyShipped = allItems.some(item => item.dispatchedQuantity > 0);

    if (fullyShipped) {
      order.status = 'DISPATCHED';
    } else if (partiallyShipped) {
      order.status = 'PARTIALLY_FULFILLED';
    }

    state.notifications.push({
      id: uuid(),
      customerId: order.customerId,
      message: `Shipment created: ${dispatchNumber} via ${courier} for order ${order.orderNumber}. Tracking No: ${trackingNumber}`,
      read: false,
      type: 'DISPATCH_CREATED',
      createdAt: now
    });

    state.auditLogs.push({
      id: uuid(),
      userId: createdBy,
      action: 'DISPATCH_CREATE',
      module: 'B2B_DISPATCHES',
      description: `Dispatched shipment ${dispatchNumber} for sales order ${order.orderNumber}`,
      createdAt: now
    });

    writeDb(state);
    return { success: true };
  },

  // Invoices
  getInvoices: (customerId?: string) => {
    const state = readDb();
    let invoices = state.invoices;
    if (customerId) {
      invoices = invoices.filter(inv => {
        const order = state.salesOrders.find(o => o.id === inv.orderId);
        return order && order.customerId === customerId;
      });
    }

    return invoices.map(inv => {
      const order = state.salesOrders.find(o => o.id === inv.orderId);
      const cust = order ? state.customers.find(c => c.id === order.customerId) : null;
      return {
        ...inv,
        orderNumber: order ? order.orderNumber : 'N/A',
        companyName: cust ? cust.companyName : 'Unknown Client'
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  createInvoice: (orderId: string, invoiceNumber: string, invoiceDate: string, amount: number, dueDate: string, invoicePdfUrl: string, createdBy: string) => {
    const state = readDb();
    const now = new Date().toISOString();
    const order = state.salesOrders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };

    const invoiceId = uuid();
    const newInvoice = {
      id: invoiceId,
      orderId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate).toISOString(),
      amount: String(amount),
      dueDate: new Date(dueDate).toISOString(),
      status: 'UNPAID',
      invoicePdfUrl: invoicePdfUrl || null,
      createdBy,
      createdAt: now
    };
    state.invoices.push(newInvoice);

    const ledger = state.customerLedger.filter(l => l.customerId === order.customerId);
    const lastBal = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance) : 0;
    const runningBalance = lastBal + amount;

    state.customerLedger.push({
      id: uuid(),
      customerId: order.customerId,
      date: new Date(invoiceDate).toISOString(),
      referenceType: 'INVOICE',
      referenceId: invoiceId,
      debitAmount: String(amount),
      creditAmount: '0.00',
      runningBalance: String(runningBalance),
      description: `Billed Invoice ${invoiceNumber} for Order ${order.orderNumber}`,
      createdAt: now
    });

    state.notifications.push({
      id: uuid(),
      customerId: order.customerId,
      message: `Invoice ${invoiceNumber} has been uploaded for order ${order.orderNumber}. Amount: ₹${amount}.`,
      read: false,
      type: 'INVOICE_UPLOADED',
      createdAt: now
    });

    state.auditLogs.push({
      id: uuid(),
      userId: createdBy,
      action: 'INVOICE_CREATE',
      module: 'B2B_INVOICES',
      description: `Uploaded invoice ${invoiceNumber} for sales order ${order.orderNumber}`,
      createdAt: now
    });

    writeDb(state);
    return { success: true };
  },

  // Payments
  getPaymentReferences: (customerId?: string) => {
    const state = readDb();
    let payments = state.paymentReferences;
    if (customerId) {
      payments = payments.filter(p => p.customerId === customerId);
    }

    return payments.map(p => {
      const cust = state.customers.find(c => c.id === p.customerId);
      const inv = p.invoiceId ? state.invoices.find(i => i.id === p.invoiceId) : null;
      return {
        ...p,
        companyName: cust ? cust.companyName : 'Unknown Client',
        invoiceNumber: inv ? inv.invoiceNumber : 'Advance Payment'
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  submitPaymentReference: (customerId: string, invoiceId: string | undefined, paymentDate: Date, amount: number, paymentMode: 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH', referenceNumber: string, utrNumber: string, notes: string, attachmentUrl: string) => {
    const state = readDb();
    const now = new Date().toISOString();
    
    const ex = state.paymentReferences.find(p => p.utrNumber === utrNumber);
    if (ex) return { success: false, error: 'A payment reference with this UTR number already exists.' };

    const paymentId = uuid();
    const newPayment = {
      id: paymentId,
      customerId,
      invoiceId: invoiceId || null,
      paymentDate: new Date(paymentDate).toISOString(),
      amount: String(amount),
      paymentMode,
      referenceNumber: referenceNumber || null,
      utrNumber,
      notes: notes || null,
      attachmentUrl: attachmentUrl || null,
      status: 'SUBMITTED',
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: now
    };
    state.paymentReferences.push(newPayment);

    state.notifications.push({
      id: uuid(),
      customerId,
      message: `Payment proof of ₹${amount} (UTR: ${utrNumber}) has been submitted for review.`,
      read: false,
      type: 'PAYMENT_SUBMITTED',
      createdAt: now
    });

    writeDb(state);
    return { success: true };
  },
  verifyPaymentReference: (paymentRefId: string, accountsProfileId: string) => {
    const state = readDb();
    const pIdx = state.paymentReferences.findIndex(p => p.id === paymentRefId);
    if (pIdx === -1) return { success: false, error: 'Payment reference not found.' };

    const now = new Date().toISOString();
    const pay = state.paymentReferences[pIdx];
    
    if (pay.status !== 'SUBMITTED') {
      return { success: false, error: 'Only pending payment references can be verified.' };
    }

    pay.status = 'VERIFIED';
    pay.verifiedBy = accountsProfileId;
    pay.verifiedAt = now;

    // Book Ledger Credit entry
    const ledger = state.customerLedger.filter(l => l.customerId === pay.customerId);
    const lastBal = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance) : 0;
    const runningBalance = lastBal - Number(pay.amount);

    state.customerLedger.push({
      id: uuid(),
      customerId: pay.customerId,
      date: now,
      referenceType: 'PAYMENT',
      referenceId: paymentRefId,
      debitAmount: '0.00',
      creditAmount: pay.amount,
      runningBalance: String(runningBalance),
      description: `Payment reference UTR ${pay.utrNumber} verified (${pay.paymentMode})`,
      createdAt: now
    });

    // Update linked invoice status if there is one
    if (pay.invoiceId) {
      const invIdx = state.invoices.findIndex(i => i.id === pay.invoiceId);
      if (invIdx !== -1) {
        const inv = state.invoices[invIdx];
        inv.status = 'PAID';
      }
    }

    state.notifications.push({
      id: uuid(),
      customerId: pay.customerId,
      message: `Your payment reference for ₹${pay.amount} has been verified and credited.`,
      read: false,
      type: 'PAYMENT_VERIFIED',
      createdAt: now
    });

    state.auditLogs.push({
      id: uuid(),
      userId: accountsProfileId,
      action: 'PAYMENT_VERIFY',
      module: 'B2B_PAYMENTS',
      description: `Verified payment reference UTR: ${pay.utrNumber} (Amount: ₹${pay.amount})`,
      createdAt: now
    });

    writeDb(state);
    return { success: true };
  },
  rejectPaymentReference: (paymentRefId: string, rejectionReason: string, accountsProfileId: string) => {
    const state = readDb();
    const idx = state.paymentReferences.findIndex(p => p.id === paymentRefId);
    if (idx === -1) return { success: false, error: 'Payment reference not found.' };

    const pay = state.paymentReferences[idx];
    if (pay.status !== 'SUBMITTED') return { success: false, error: 'Only pending payment references can be rejected.' };

    pay.status = 'REJECTED';
    pay.rejectionReason = rejectionReason;
    pay.verifiedBy = accountsProfileId;
    pay.verifiedAt = new Date().toISOString();
    
    state.notifications.push({
      id: uuid(),
      customerId: pay.customerId,
      message: `Your payment of ₹${pay.amount} (UTR: ${pay.utrNumber}) was rejected: ${rejectionReason}`,
      read: false,
      type: 'PAYMENT_REJECTED',
      createdAt: new Date().toISOString()
    });

    state.auditLogs.push({
      id: uuid(),
      userId: accountsProfileId,
      action: 'PAYMENT_REJECT',
      module: 'B2B_PAYMENTS',
      description: `Rejected payment reference UTR: ${pay.utrNumber}. Reason: ${rejectionReason}`,
      createdAt: new Date().toISOString()
    });

    writeDb(state);
    return { success: true };
  },

  // Ledger
  getCustomerLedger: (customerId: string) => {
    const state = readDb();
    return state.customerLedger
      .filter(l => l.customerId === customerId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(l => ({
        id: l.id,
        customerId: l.customerId,
        date: l.date,
        referenceType: l.referenceType,
        referenceId: l.referenceId,
        debitAmount: Number(l.debitAmount),
        creditAmount: Number(l.creditAmount),
        runningBalance: Number(l.runningBalance),
        description: l.description,
        createdAt: l.createdAt
      }));
  },

  // Dashboard Stats
  getB2BAdminStats: () => {
    const state = readDb();
    
    const totalCustomers = state.customers.length;
    const totalOrders = state.salesOrders.length;
    const pendingApprovals = state.salesOrders.filter(o => o.status === 'PENDING_APPROVAL').length;
    
    let outstandingReceivables = 0;
    for (const c of state.customers) {
      const ledger = state.customerLedger.filter(l => l.customerId === c.id);
      if (ledger.length > 0) {
        outstandingReceivables += Number(ledger[ledger.length - 1].runningBalance);
      }
    }

    const customerTotals: Record<string, number> = {};
    for (const o of state.salesOrders) {
      if (o.status !== 'CANCELLED') {
        customerTotals[o.customerId] = (customerTotals[o.customerId] || 0) + Number(o.totalAmount);
      }
    }
    const topCustomers = Object.entries(customerTotals)
      .map(([id, amount]) => {
        const cust = state.customers.find(c => c.id === id);
        return {
          companyName: cust ? cust.companyName : 'Unknown Client',
          amount
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const productTotals: Record<string, number> = {};
    for (const item of state.salesOrderItems) {
      const variant = state.productVariants.find(v => v.id === item.variantId);
      const prod = variant ? state.products.find(p => p.id === variant.productId) : null;
      const order = state.salesOrders.find(o => o.id === item.orderId);
      if (prod && item.approvedQuantity > 0 && order && order.status === 'APPROVED') {
        productTotals[prod.productName] = (productTotals[prod.productName] || 0) + item.approvedQuantity;
      }
    }
    const topProducts = Object.entries(productTotals)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const recentOrders = state.salesOrders.map(o => {
      const cust = state.customers.find(c => c.id === o.customerId);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        companyName: cust ? cust.companyName : 'Unknown Client',
        totalAmount: Number(o.totalAmount),
        status: o.status,
        createdAt: o.createdAt
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

    const recentPayments = state.paymentReferences.map(p => {
      const cust = state.customers.find(c => c.id === p.customerId);
      return {
        id: p.id,
        utrNumber: p.utrNumber,
        companyName: cust ? cust.companyName : 'Unknown Client',
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        status: p.status
      };
    }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 5);

    return {
      totalCustomers,
      totalOrders,
      pendingApprovals,
      outstandingReceivables,
      topCustomers,
      topProducts,
      recentOrders,
      recentPayments
    };
  },

  getCustomerBranches: (customerId?: string) => {
    const state = readDb();
    if (customerId) {
      return state.customerBranches.filter(b => b.customerId === customerId);
    }
    return state.customerBranches;
  },
  createCustomerBranch: (customerId: string, branchData: any) => {
    const state = readDb();
    const newBranch = {
      id: uuid(),
      customerId,
      branchName: branchData.branchName,
      branchCode: branchData.branchCode,
      contactPerson: branchData.contactPerson || null,
      phone: branchData.phone || null,
      email: branchData.email || null,
      gst: branchData.gst || null,
      billingAddress: branchData.billingAddress || null,
      shippingAddress: branchData.shippingAddress || null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    state.customerBranches.push(newBranch);
    writeDb(state);
    
    jsonDb.logB2BAuditDetailed(null, 'BRANCH_ADD', 'CUSTOMER_BRANCHES', `Added branch "${newBranch.branchName}" for customer ${customerId}`, null, JSON.stringify(newBranch));
    return newBranch;
  },
  updateCustomerBranch: (branchId: string, branchData: any) => {
    const state = readDb();
    const idx = state.customerBranches.findIndex(b => b.id === branchId);
    if (idx !== -1) {
      const oldVal = JSON.stringify(state.customerBranches[idx]);
      state.customerBranches[idx] = {
        ...state.customerBranches[idx],
        ...branchData
      };
      writeDb(state);
      jsonDb.logB2BAuditDetailed(null, 'BRANCH_EDIT', 'CUSTOMER_BRANCHES', `Edited branch ID ${branchId}`, oldVal, JSON.stringify(state.customerBranches[idx]));
      return true;
    }
    return false;
  },

  // On-Behalf Order Creation
  createSalesOrderOnBehalf: (customerId: string, branchId: string, sourceId: string, createdBy: string, items: any[], customItems: any[], remarks?: string) => {
    const state = readDb();
    const orderId = uuid();
    const now = new Date().toISOString();
    
    const nextNum = state.salesOrders.length + 1;
    const orderNumber = 'SO-' + String(nextNum).padStart(6, '0');

    let totalAmount = 0;
    const orderItems: any[] = [];
    const customOrderItemsList: any[] = [];

    for (const item of items) {
      const itemPrice = Number(item.price);
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        id: uuid(),
        orderId,
        variantId: item.variantId,
        orderedQuantity: item.quantity,
        approvedQuantity: 0,
        dispatchedQuantity: 0,
        pricePerUnit: String(itemPrice),
        totalPrice: String(itemTotal),
        createdAt: now
      });
    }

    for (const cItem of customItems) {
      const itemPrice = Number(cItem.wsp);
      const itemTotal = itemPrice * Number(cItem.quantity);
      totalAmount += itemTotal;

      customOrderItemsList.push({
        id: uuid(),
        orderId,
        itemName: cItem.itemName,
        description: cItem.description || null,
        quantity: Number(cItem.quantity),
        wsp: String(cItem.wsp),
        mrp: String(cItem.mrp),
        gstPercent: String(cItem.gstPercent || 0),
        hsnCode: cItem.hsnCode || null,
        remarks: cItem.remarks || null,
        imageUrl: cItem.imageUrl || null,
        convertedVariantId: null,
        createdAt: now
      });
    }

    const newOrder = {
      id: orderId,
      orderNumber,
      customerId,
      branchId,
      sourceId,
      createdBy,
      status: 'PENDING_APPROVAL',
      totalAmount: String(totalAmount),
      remarks: remarks || null,
      approvedBy: null,
      approvedAt: null,
      createdAt: now
    };

    state.salesOrders.push(newOrder);
    state.salesOrderItems.push(...orderItems);
    if (customOrderItemsList.length > 0) {
      state.customOrderItems.push(...customOrderItemsList);
    }
    
    state.notifications.push({
      id: uuid(),
      customerId,
      message: `An order ${orderNumber} has been created on your behalf via ${sourceId} and is awaiting approval.`,
      read: false,
      type: 'ORDER_SUBMITTED',
      createdAt: now
    });

    writeDb(state);

    jsonDb.logB2BAuditDetailed(createdBy, 'ORDER_CREATE', 'B2B_ORDERS', `Created on-behalf order ${orderNumber} for total ₹${totalAmount}`, null, JSON.stringify(newOrder));
    
    return {
      success: true,
      order: {
        ...newOrder,
        totalAmount: totalAmount
      }
    };
  },

  // Custom Items Conversion
  convertCustomItemToSKU: (customItemId: string, variantData: any, adminUserId: string) => {
    const state = readDb();
    const customItemIdx = state.customOrderItems.findIndex(ci => ci.id === customItemId);
    if (customItemIdx === -1) return { success: false, error: 'Custom item not found.' };

    const customItem = state.customOrderItems[customItemIdx];
    const oldVal = JSON.stringify(customItem);

    // Create Product
    const productId = uuid();
    const newProduct = {
      id: productId,
      productName: customItem.itemName,
      category: variantData.category || 'Custom Orders',
      description: customItem.description || null,
      brand: 'LJK Custom',
      season: 'All Season',
      active: true,
      createdAt: new Date().toISOString()
    };
    state.products.push(newProduct);

    // Create Color
    const colorId = uuid();
    const newColor = {
      id: colorId,
      productId,
      colorName: variantData.colorName || 'Custom'
    };
    state.productColors.push(newColor);

    // Create Size
    const sizeId = uuid();
    const newSize = {
      id: sizeId,
      productId,
      sizeName: variantData.sizeName || 'One Size'
    };
    state.productSizes.push(newSize);

    // Create Variant
    const variantId = uuid();
    const newVariant = {
      id: variantId,
      productId,
      sku: variantData.sku || ('CUST-' + Math.random().toString(36).substring(2, 8).toUpperCase()),
      colorId,
      sizeId,
      costPrice: String(variantData.costPrice || Number(customItem.wsp) * 0.5),
      wholesalePrice: String(customItem.wsp),
      mrp: String(customItem.mrp),
      rackLocation: 'Custom Rack',
      active: true,
      createdAt: new Date().toISOString()
    };
    state.productVariants.push(newVariant);

    // Update Custom Item's convertedVariantId
    customItem.convertedVariantId = variantId;

    // Log Audit
    jsonDb.logB2BAuditDetailed(adminUserId, 'CUSTOM_ITEM_CONVERT', 'B2B_PRODUCTS', `Converted custom item "${customItem.itemName}" to inventory SKU: ${newVariant.sku}`, oldVal, JSON.stringify(customItem));

    writeDb(state);
    return { success: true, variantId };
  },

  // Returns / Reverse Logistics
  getReturnRequests: (customerId?: string) => {
    const state = readDb();
    let returns = state.returnRequests;
    if (customerId) {
      returns = returns.filter(r => r.customerId === customerId);
    }
    return returns.map(r => {
      const cust = state.customers.find(c => c.id === r.customerId);
      const branch = state.customerBranches.find(b => b.id === r.branchId);
      const order = r.orderId ? state.salesOrders.find(o => o.id === r.orderId) : null;
      const items = state.returnRequestItems.filter(ri => ri.returnRequestId === r.id).map(ri => {
        const variant = ri.variantId ? state.productVariants.find(v => v.id === ri.variantId) : null;
        const prod = variant ? state.products.find(p => p.id === variant.productId) : null;
        return {
          ...ri,
          sku: variant ? variant.sku : null,
          productName: prod ? prod.productName : ri.customItemName
        };
      });
      const attachments = state.returnAttachments.filter(ra => ra.returnRequestId === r.id).map(ra => ra.fileUrl);
      const resolutions = state.returnResolutions.filter(rr => rr.returnRequestId === r.id);

      return {
        ...r,
        companyName: cust ? cust.companyName : 'Unknown Client',
        branchName: branch ? branch.branchName : 'Main Office',
        orderNumber: order ? order.orderNumber : null,
        items,
        attachments,
        resolution: resolutions.length > 0 ? resolutions[0] : null
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  createReturnRequest: (data: {
    customerId: string;
    branchId?: string;
    orderId?: string;
    invoiceNumber?: string;
    reason: 'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER';
    remarks?: string;
    items: { variantId?: string; customItemName?: string; quantity: number }[];
    photos?: string[];
    createdBy: string;
    createdByType: 'CUSTOMER' | 'ADMIN';
  }) => {
    const state = readDb();
    const returnId = uuid();
    const now = new Date().toISOString();
    const nextNum = state.returnRequests.length + 1;
    const returnNumber = 'RET-' + String(nextNum).padStart(6, '0');

    const newRequest = {
      id: returnId,
      returnNumber,
      customerId: data.customerId,
      branchId: data.branchId || null,
      orderId: data.orderId || null,
      invoiceNumber: data.invoiceNumber || null,
      status: 'PENDING' as const,
      reason: data.reason,
      remarks: data.remarks || null,
      createdByType: data.createdByType,
      createdBy: data.createdBy,
      createdAt: now
    };

    state.returnRequests.push(newRequest);

    for (const item of data.items) {
      state.returnRequestItems.push({
        id: uuid(),
        returnRequestId: returnId,
        variantId: item.variantId || null,
        customItemName: item.customItemName || null,
        quantity: item.quantity
      });
    }

    if (data.photos) {
      for (const photo of data.photos) {
        state.returnAttachments.push({
          id: uuid(),
          returnRequestId: returnId,
          fileUrl: photo,
          createdAt: now
        });
      }
    }

    jsonDb.logB2BAuditDetailed(data.createdBy, 'RETURN_CREATE', 'B2B_RETURNS', `Created return request ${returnNumber}`, null, JSON.stringify(newRequest));

    writeDb(state);
    return { success: true, returnRequest: newRequest };
  },
  resolveReturnRequest: (
    returnRequestId: string,
    resolutionType: 'Replace' | 'Credit Note' | 'Refund' | 'Repair' | 'Reject Claim',
    remarks: string,
    receivedStatus: 'READY_STOCK' | 'REPAIRABLE' | 'SCRAP' | null,
    adminProfileId: string
  ) => {
    const state = readDb();
    const rIdx = state.returnRequests.findIndex(r => r.id === returnRequestId);
    if (rIdx === -1) return { success: false, error: 'Return request not found.' };

    const request = state.returnRequests[rIdx];
    const oldVal = JSON.stringify(request);
    const now = new Date().toISOString();

    if (resolutionType === 'Reject Claim') {
      request.status = 'REJECTED';
    } else {
      request.status = receivedStatus ? 'RECEIVED' : 'APPROVED';
    }

    state.returnResolutions.push({
      id: uuid(),
      returnRequestId,
      resolutionType,
      remarks: remarks || null,
      resolvedBy: adminProfileId,
      resolvedAt: now
    });

    if (receivedStatus && resolutionType !== 'Reject Claim') {
      const items = state.returnRequestItems.filter(ri => ri.returnRequestId === returnRequestId);
      for (const item of items) {
        if (item.variantId) {
          let transactionType: 'STOCK_IN' | 'DAMAGE_REPAIRABLE' | 'DAMAGE_NON_REPAIRABLE' = 'STOCK_IN';
          if (receivedStatus === 'REPAIRABLE') {
            transactionType = 'DAMAGE_REPAIRABLE';
          } else if (receivedStatus === 'SCRAP') {
            transactionType = 'DAMAGE_NON_REPAIRABLE';
          }

          state.stockTransactions.push({
            id: uuid(),
            requestId: 'req-return-' + returnRequestId,
            variantId: item.variantId,
            transactionType,
            quantity: item.quantity,
            referenceNumber: request.returnNumber,
            invoiceNumber: request.invoiceNumber || null,
            remarks: `Returned items received as ${receivedStatus}. Resolution: ${resolutionType}`,
            createdBy: adminProfileId,
            createdAt: now
          });
        }
      }
    }

    if (resolutionType === 'Credit Note') {
      const items = state.returnRequestItems.filter(ri => ri.returnRequestId === returnRequestId);
      let creditAmount = 0;
      for (const item of items) {
        if (item.variantId) {
          const variant = state.productVariants.find(v => v.id === item.variantId);
          if (variant) {
            creditAmount += Number(variant.wholesalePrice) * item.quantity;
          }
        }
      }

      if (creditAmount > 0) {
        const ledger = state.customerLedger.filter(l => l.customerId === request.customerId);
        const lastBal = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance) : 0;
        const runningBalance = lastBal - creditAmount;

        state.customerLedger.push({
          id: uuid(),
          customerId: request.customerId,
          date: now,
          referenceType: 'PAYMENT',
          referenceId: returnRequestId,
          debitAmount: '0.00',
          creditAmount: String(creditAmount),
          runningBalance: String(runningBalance),
          description: `Credit Note issued for Return Request ${request.returnNumber}`,
          createdAt: now
        });
      }
    }

    if (request.status !== 'REJECTED') {
      request.status = 'CLOSED';
    }

    jsonDb.logB2BAuditDetailed(adminProfileId, 'RETURN_RESOLVE', 'B2B_RETURNS', `Resolved return request ${request.returnNumber} as ${resolutionType}`, oldVal, JSON.stringify(request));

    writeDb(state);
    return { success: true };
  },

  // Reporting
  getB2BBranchReporting: () => {
    const state = readDb();
    
    const customerReporting: any[] = [];
    for (const cust of state.customers) {
      const ledger = state.customerLedger.filter(l => l.customerId === cust.id);
      const outstanding = ledger.length > 0 ? Number(ledger[ledger.length - 1].runningBalance) : 0;

      const custOrders = state.salesOrders.filter(o => o.customerId === cust.id && o.status !== 'CANCELLED');
      const revenue = custOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      customerReporting.push({
        customerId: cust.id,
        companyName: cust.companyName,
        revenue,
        outstanding,
        orderCount: custOrders.length
      });
    }

    const branchReporting: any[] = [];
    for (const branch of state.customerBranches) {
      const cust = state.customers.find(c => c.id === branch.customerId);
      const branchOrders = state.salesOrders.filter(o => o.branchId === branch.id && o.status !== 'CANCELLED');
      const revenue = branchOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      let outstanding = 0;
      const branchInvoices = state.invoices.filter(inv => {
        const order = state.salesOrders.find(o => o.id === inv.orderId);
        return order && order.branchId === branch.id && inv.status !== 'PAID';
      });
      outstanding = branchInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

      branchReporting.push({
        branchId: branch.id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        companyName: cust ? cust.companyName : 'Unknown',
        revenue,
        orderCount: branchOrders.length,
        outstanding
      });
    }

    return {
      customerReporting,
      branchReporting
    };
  }
};
