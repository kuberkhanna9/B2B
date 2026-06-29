import { pgTable, uuid, varchar, boolean, timestamp, integer, numeric, pgEnum, text, pgView } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


// Define Enums
export const roleEnum = pgEnum('user_role', ['SUPERADMIN', 'ACCOUNTS', 'INVENTORY', 'RETAIL', 'B2B_CUSTOMER']);
export const requestTypeEnum = pgEnum('request_type', [
  'STOCK_IN',
  'SALE',
  'DAMAGE_REPAIRABLE',
  'DAMAGE_NON_REPAIRABLE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT'
]);
export const requestStatusEnum = pgEnum('request_status', ['PENDING', 'APPROVED', 'REJECTED']);

// B2B Custom Enums
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_APPROVAL',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'PARTIALLY_FULFILLED',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED'
]);
export const paymentModeEnum = pgEnum('payment_mode', [
  'BANK_TRANSFER',
  'UPI',
  'CHEQUE',
  'CASH'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'SUBMITTED',
  'VERIFIED',
  'REJECTED'
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE'
]);
export const ledgerReferenceTypeEnum = pgEnum('ledger_reference_type', [
  'INVOICE',
  'PAYMENT'
]);

export const returnStatusEnum = pgEnum('return_status', [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'CLOSED'
]);

export const returnTypeEnum = pgEnum('return_type', [
  'DEFECTIVE',
  'SOR_RETURN',
  'WRONG_ITEM',
  'EXCESS_QUANTITY',
  'CUSTOMER_REJECTION',
  'TRANSIT_DAMAGE',
  'SIZE_ISSUE',
  'OTHER',
  'COLOUR_ISSUE',
  'SHORT_QUANTITY',
  'CUSTOMER_CANCELLATION'
]);

// 1. PROFILES Table
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // maps to auth.users.id
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: roleEnum('role').default('RETAIL').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. PRODUCTS Table
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  description: varchar('description', { length: 1000 }),
  brand: varchar('brand', { length: 100 }),
  season: varchar('season', { length: 50 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. PRODUCT_COLORS Table
export const productColors = pgTable('product_colors', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  colorName: varchar('color_name', { length: 100 }).notNull(),
});

// 4. PRODUCT_SIZES Table
export const productSizes = pgTable('product_sizes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  sizeName: varchar('size_name', { length: 50 }).notNull(),
});

// 5. PRODUCT_VARIANTS Table (SKUs)
export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  colorId: uuid('color_id').references(() => productColors.id, { onDelete: 'restrict' }).notNull(),
  sizeId: uuid('size_id').references(() => productSizes.id, { onDelete: 'restrict' }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  wholesalePrice: numeric('wholesale_price', { precision: 12, scale: 2 }).notNull(),
  mrp: numeric('mrp', { precision: 12, scale: 2 }).notNull(),
  rackLocation: varchar('rack_location', { length: 50 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. STOCK_REQUESTS Table
export const stockRequests = pgTable('stock_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }).notNull(),
  requestType: requestTypeEnum('request_type').notNull(),
  quantity: integer('quantity').notNull(),
  referenceNumber: varchar('reference_number', { length: 100 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  remarks: varchar('remarks', { length: 500 }),
  createdBy: uuid('created_by').references(() => profiles.id).notNull(),
  status: requestStatusEnum('status').default('PENDING').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. STOCK_TRANSACTIONS Table
export const stockTransactions = pgTable('stock_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id').references(() => stockRequests.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }).notNull(),
  transactionType: requestTypeEnum('transaction_type').notNull(),
  quantity: integer('quantity').notNull(),
  referenceNumber: varchar('reference_number', { length: 100 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  remarks: varchar('remarks', { length: 500 }),
  createdBy: uuid('created_by').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. PRICE_HISTORY Table
export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  oldCostPrice: numeric('old_cost_price', { precision: 12, scale: 2 }).notNull(),
  newCostPrice: numeric('new_cost_price', { precision: 12, scale: 2 }).notNull(),
  oldWholesalePrice: numeric('old_wholesale_price', { precision: 12, scale: 2 }).notNull(),
  newWholesalePrice: numeric('new_wholesale_price', { precision: 12, scale: 2 }).notNull(),
  oldMrp: numeric('old_mrp', { precision: 12, scale: 2 }).notNull(),
  newMrp: numeric('new_mrp', { precision: 12, scale: 2 }).notNull(),
  changedBy: uuid('changed_by').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. AUDIT_LOGS Table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  username: varchar('username', { length: 100 }),
  role: varchar('role', { length: 100 }),
  entity: varchar('entity', { length: 100 }),
  action: varchar('action', { length: 255 }).notNull(),
  module: varchar('module', { length: 100 }).notNull(),
  description: varchar('description', { length: 1000 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// =============================================================================
// NEW B2B CUSTOMER PORTAL TABLES
// =============================================================================

// 10. CUSTOMERS Table
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  billingAddress: varchar('billing_address', { length: 1000 }),
  shippingAddress: varchar('shipping_address', { length: 1000 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. CUSTOMER_USERS Table
export const customerUsers = pgTable('customer_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. CUSTOMER_PRICING Table
export const customerPricing = pgTable('customer_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  customPrice: numeric('custom_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 21. CUSTOMER_BRANCHES Table
export const customerBranches = pgTable('customer_branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  branchName: varchar('branch_name', { length: 255 }).notNull(),
  branchCode: varchar('branch_code', { length: 50 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  gst: varchar('gst', { length: 50 }),
  billingAddress: varchar('billing_address', { length: 1000 }),
  shippingAddress: varchar('shipping_address', { length: 1000 }),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 22. ORDER_SOURCES Table
export const orderSources = pgTable('order_sources', {
  id: varchar('id', { length: 100 }).primaryKey(),
  sourceName: varchar('source_name', { length: 100 }).notNull(),
});

// 13. SALES_ORDERS Table
export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 100 }).unique().notNull(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }).notNull(),
  branchId: uuid('branch_id').references(() => customerBranches.id, { onDelete: 'restrict' }),
  sourceId: varchar('source_id', { length: 100 }).references(() => orderSources.id, { onDelete: 'restrict' }),
  createdBy: uuid('created_by').notNull(), // customerUsers.id (or profiles.id if manual admin)
  status: orderStatusEnum('status').default('PENDING_APPROVAL').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  remarks: varchar('remarks', { length: 500 }),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. SALES_ORDER_ITEMS Table
export const salesOrderItems = pgTable('sales_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }).notNull(),
  orderedQuantity: integer('ordered_quantity').notNull(),
  approvedQuantity: integer('approved_quantity').default(0).notNull(),
  dispatchedQuantity: integer('dispatched_quantity').default(0).notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. DISPATCHES Table
export const dispatches = pgTable('dispatches', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'restrict' }).notNull(),
  dispatchNumber: varchar('dispatch_number', { length: 100 }).unique().notNull(),
  courier: varchar('courier', { length: 255 }).notNull(),
  trackingNumber: varchar('tracking_number', { length: 255 }).notNull(),
  dispatchDate: timestamp('dispatch_date').notNull(),
  remarks: varchar('remarks', { length: 500 }),
  createdBy: uuid('created_by').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. DISPATCH_ITEMS Table
export const dispatchItems = pgTable('dispatch_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  dispatchId: uuid('dispatch_id').references(() => dispatches.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }).notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 17. INVOICES Table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'restrict' }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).unique().notNull(),
  invoiceDate: timestamp('invoice_date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: invoiceStatusEnum('status').default('UNPAID').notNull(),
  invoicePdfUrl: varchar('invoice_pdf_url', { length: 1000 }),
  createdBy: uuid('created_by').references(() => profiles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. PAYMENT_REFERENCES Table
export const paymentReferences = pgTable('payment_references', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'restrict' }),
  paymentDate: timestamp('payment_date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMode: paymentModeEnum('payment_mode').notNull(),
  referenceNumber: varchar('reference_number', { length: 100 }),
  utrNumber: varchar('utr_number', { length: 100 }).unique().notNull(),
  notes: varchar('notes', { length: 1000 }),
  attachmentUrl: varchar('attachment_url', { length: 1000 }),
  status: paymentStatusEnum('status').default('SUBMITTED').notNull(),
  verifiedBy: uuid('verified_by').references(() => profiles.id),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: varchar('rejection_reason', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 19. CUSTOMER_LEDGER Table
export const customerLedger = pgTable('customer_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }).notNull(),
  date: timestamp('date').notNull(),
  referenceType: ledgerReferenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id').notNull(),
  debitAmount: numeric('debit_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  creditAmount: numeric('credit_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  runningBalance: numeric('running_balance', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. NOTIFICATIONS Table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  message: varchar('message', { length: 1000 }).notNull(),
  read: boolean('read').default(false).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. CUSTOM_ORDER_ITEMS Table
export const customOrderItems = pgTable('custom_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'cascade' }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  quantity: integer('quantity').notNull(),
  wsp: numeric('wsp', { precision: 12, scale: 2 }).notNull(),
  mrp: numeric('mrp', { precision: 12, scale: 2 }).notNull(),
  gstPercent: numeric('gst_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
  hsnCode: varchar('hsn_code', { length: 50 }),
  remarks: varchar('remarks', { length: 500 }),
  imageUrl: varchar('image_url', { length: 1000 }),
  convertedVariantId: uuid('converted_variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. RETURN_REQUESTS Table
export const returnRequests = pgTable('return_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnNumber: varchar('return_number', { length: 100 }).unique().notNull(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }).notNull(),
  branchId: uuid('branch_id').references(() => customerBranches.id, { onDelete: 'restrict' }),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'set null' }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  status: returnStatusEnum('status').default('PENDING').notNull(),
  reason: returnTypeEnum('reason').notNull(),
  remarks: varchar('remarks', { length: 1000 }),
  createdByType: varchar('created_by_type', { length: 50 }).notNull(), // 'CUSTOMER' or 'ADMIN'
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. RETURN_REQUEST_ITEMS Table
export const returnRequestItems = pgTable('return_request_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnRequestId: uuid('return_request_id').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
  customItemName: varchar('custom_item_name', { length: 255 }),
  quantity: integer('quantity').notNull(),
});

// 26. RETURN_ATTACHMENTS Table
export const returnAttachments = pgTable('return_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnRequestId: uuid('return_request_id').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26b. RETURN_CLAIM_IMAGES Table
export const returnClaimImages = pgTable('return_claim_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnId: uuid('return_id').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: varchar('image_url', { length: 1000 }).notNull(),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// 26c. RETURN_CLAIM_ATTACHMENTS Table
export const returnClaimAttachments = pgTable('return_claim_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnId: uuid('return_id').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// 27. RETURN_RESOLUTIONS Table
export const returnResolutions = pgTable('return_resolutions', {
  id: uuid('id').defaultRandom().primaryKey(),
  returnRequestId: uuid('return_request_id').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  resolutionType: varchar('resolution_type', { length: 100 }).notNull(), // Replace, Credit Note, Refund, Repair, Reject Claim
  remarks: varchar('remarks', { length: 1000 }),
  resolvedBy: uuid('resolved_by').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
  resolvedAt: timestamp('resolved_at').defaultNow().notNull(),
});

// Relations setup for Drizzle
export const profilesRelations = relations(profiles, ({ many }) => ({
  requests: many(stockRequests),
  transactions: many(stockTransactions),
  auditLogs: many(auditLogs),
  approvedOrders: many(salesOrders),
  createdDispatches: many(dispatches),
  createdInvoices: many(invoices),
  verifiedPayments: many(paymentReferences),
}));

export const productsRelations = relations(products, ({ many }) => ({
  colors: many(productColors),
  sizes: many(productSizes),
  variants: many(productVariants),
}));

export const productColorsRelations = relations(productColors, ({ one, many }) => ({
  product: one(products, {
    fields: [productColors.productId],
    references: [products.id],
  }),
  variants: many(productVariants),
}));

export const productSizesRelations = relations(productSizes, ({ one, many }) => ({
  product: one(products, {
    fields: [productSizes.productId],
    references: [products.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  color: one(productColors, {
    fields: [productVariants.colorId],
    references: [productColors.id],
  }),
  size: one(productSizes, {
    fields: [productVariants.sizeId],
    references: [productSizes.id],
  }),
  requests: many(stockRequests),
  transactions: many(stockTransactions),
  priceHistories: many(priceHistory),
  customPricing: many(customerPricing),
  orderItems: many(salesOrderItems),
  dispatchItems: many(dispatchItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  users: many(customerUsers),
  pricing: many(customerPricing),
  orders: many(salesOrders),
  paymentReferences: many(paymentReferences),
  ledgerEntries: many(customerLedger),
  notifications: many(notifications),
  branches: many(customerBranches),
  returns: many(returnRequests),
  branchUsers: many(branchUsers),
}));


export const customerUsersRelations = relations(customerUsers, ({ one }) => ({
  customer: one(customers, {
    fields: [customerUsers.customerId],
    references: [customers.id],
  }),
}));

export const customerPricingRelations = relations(customerPricing, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPricing.customerId],
    references: [customers.id],
  }),
  variant: one(productVariants, {
    fields: [customerPricing.variantId],
    references: [productVariants.id],
  }),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  approvedByUser: one(profiles, {
    fields: [salesOrders.approvedBy],
    references: [profiles.id],
  }),
  branch: one(customerBranches, {
    fields: [salesOrders.branchId],
    references: [customerBranches.id],
  }),
  source: one(orderSources, {
    fields: [salesOrders.sourceId],
    references: [orderSources.id],
  }),
  items: many(salesOrderItems),
  dispatches: many(dispatches),
  invoices: many(invoices),
  customItems: many(customOrderItems),
  returns: many(returnRequests),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  order: one(salesOrders, {
    fields: [salesOrderItems.orderId],
    references: [salesOrders.id],
  }),
  variant: one(productVariants, {
    fields: [salesOrderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const dispatchesRelations = relations(dispatches, ({ one, many }) => ({
  order: one(salesOrders, {
    fields: [dispatches.orderId],
    references: [salesOrders.id],
  }),
  createdByUser: one(profiles, {
    fields: [dispatches.createdBy],
    references: [profiles.id],
  }),
  items: many(dispatchItems),
}));

export const dispatchItemsRelations = relations(dispatchItems, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [dispatchItems.dispatchId],
    references: [dispatches.id],
  }),
  variant: one(productVariants, {
    fields: [dispatchItems.variantId],
    references: [productVariants.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(salesOrders, {
    fields: [invoices.orderId],
    references: [salesOrders.id],
  }),
  createdByUser: one(profiles, {
    fields: [invoices.createdBy],
    references: [profiles.id],
  }),
  payments: many(paymentReferences),
}));

export const paymentReferencesRelations = relations(paymentReferences, ({ one }) => ({
  customer: one(customers, {
    fields: [paymentReferences.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [paymentReferences.invoiceId],
    references: [invoices.id],
  }),
  verifiedByUser: one(profiles, {
    fields: [paymentReferences.verifiedBy],
    references: [profiles.id],
  }),
}));

export const customerLedgerRelations = relations(customerLedger, ({ one }) => ({
  customer: one(customers, {
    fields: [customerLedger.customerId],
    references: [customers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  customer: one(customers, {
    fields: [notifications.customerId],
    references: [customers.id],
  }),
}));

export const customerBranchesRelations = relations(customerBranches, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerBranches.customerId],
    references: [customers.id],
  }),
  orders: many(salesOrders),
  returns: many(returnRequests),
  branchUsers: many(branchUsers),
}));


export const orderSourcesRelations = relations(orderSources, ({ many }) => ({
  orders: many(salesOrders),
}));

export const customOrderItemsRelations = relations(customOrderItems, ({ one }) => ({
  order: one(salesOrders, {
    fields: [customOrderItems.orderId],
    references: [salesOrders.id],
  }),
  convertedVariant: one(productVariants, {
    fields: [customOrderItems.convertedVariantId],
    references: [productVariants.id],
  }),
}));

export const returnRequestsRelations = relations(returnRequests, ({ one, many }) => ({
  customer: one(customers, {
    fields: [returnRequests.customerId],
    references: [customers.id],
  }),
  branch: one(customerBranches, {
    fields: [returnRequests.branchId],
    references: [customerBranches.id],
  }),
  order: one(salesOrders, {
    fields: [returnRequests.orderId],
    references: [salesOrders.id],
  }),
  items: many(returnRequestItems),
  attachments: many(returnAttachments),
  images: many(returnClaimImages),
  claimAttachments: many(returnClaimAttachments),
  resolutions: many(returnResolutions),
}));

export const returnRequestItemsRelations = relations(returnRequestItems, ({ one }) => ({
  returnRequest: one(returnRequests, {
    fields: [returnRequestItems.returnRequestId],
    references: [returnRequests.id],
  }),
  variant: one(productVariants, {
    fields: [returnRequestItems.variantId],
    references: [productVariants.id],
  }),
}));

export const returnAttachmentsRelations = relations(returnAttachments, ({ one }) => ({
  returnRequest: one(returnRequests, {
    fields: [returnAttachments.returnRequestId],
    references: [returnRequests.id],
  }),
}));

export const returnClaimImagesRelations = relations(returnClaimImages, ({ one }) => ({
  returnRequest: one(returnRequests, {
    fields: [returnClaimImages.returnId],
    references: [returnRequests.id],
  }),
}));

export const returnClaimAttachmentsRelations = relations(returnClaimAttachments, ({ one }) => ({
  returnRequest: one(returnRequests, {
    fields: [returnClaimAttachments.returnId],
    references: [returnRequests.id],
  }),
}));

export const returnResolutionsRelations = relations(returnResolutions, ({ one }) => ({
  returnRequest: one(returnRequests, {
    fields: [returnResolutions.returnRequestId],
    references: [returnRequests.id],
  }),
  resolvedByUser: one(profiles, {
    fields: [returnResolutions.resolvedBy],
    references: [profiles.id],
  }),
}));

// =============================================================================
// PRODUCTION-GRADE RBAC TABLES
// =============================================================================

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).unique().notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const branchUsers = pgTable('branch_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => customerBranches.id, { onDelete: 'cascade' }).notNull(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const branchUsersRelations = relations(branchUsers, ({ one }) => ({
  customer: one(customers, {
    fields: [branchUsers.customerId],
    references: [customers.id],
  }),
  branch: one(customerBranches, {
    fields: [branchUsers.branchId],
    references: [customerBranches.id],
  }),
}));

export const inventoryAvailability = pgTable('inventory_availability', {
  variantId: uuid('variant_id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull(),
  physicalStock: integer('physical_stock').notNull(),
  reservedStock: integer('reserved_stock').notNull(),
  availableStock: integer('available_stock').notNull(),
});

