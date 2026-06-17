import { db as rawDb } from '@/db';
const db = rawDb as NonNullable<typeof rawDb>;
import * as schema from '@/db/schema';
import { eq, and, or, desc, inArray, sum, sql } from 'drizzle-orm';
import { 
  Customer, 
  CustomerUser, 
  CustomerPricing,
  SalesOrder, 
  SalesOrderItem, 
  Dispatch, 
  DispatchItem, 
  Invoice, 
  PaymentReference, 
  CustomerLedgerEntry, 
  Notification, 
  ComputedStock, 
  compileStockForVariant,
  Product,
  ProductVariant,
  StockTransaction,
  CustomerBranch
} from './types';

// =============================================================================
// AUDIT LOGGING UTILITY
// =============================================================================
async function db_logB2BAuditDetailed(
  userId: string | null,
  action: string,
  module: string,
  description: string,
  oldValue?: string | null,
  newValue?: string | null
) {
  try {
    await db.insert(schema.auditLogs).values({
      userId: userId && !userId.startsWith('cust-') && userId.length === 36 ? userId : null,
      action,
      module,
      description,
      oldValue: oldValue || null,
      newValue: newValue || null,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Audit logging detailed failed:', err);
  }
}

async function db_logB2BAudit(userId: string | null, action: string, module: string, description: string) {
  await db_logB2BAuditDetailed(userId, action, module, description, null, null);
}

// =============================================================================
// CUSTOMER MANAGEMENT (SUPERADMIN ONLY)
// =============================================================================
async function db_getCustomers(): Promise<Customer[]> {
  const res = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
  return res.map(c => ({
    id: c.id,
    companyName: c.companyName,
    phone: c.phone || undefined,
    email: c.email || undefined,
    billingAddress: c.billingAddress || undefined,
    shippingAddress: c.shippingAddress || undefined,
    active: c.active,
    createdAt: c.createdAt.toISOString()
  }));
}

async function db_createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'active'>): Promise<Customer> {
  const res = await db.insert(schema.customers).values({
    companyName: data.companyName,
    phone: data.phone || null,
    email: data.email || null,
    billingAddress: data.billingAddress || null,
    shippingAddress: data.shippingAddress || null
  }).returning();

  const c = res[0];
  await logB2BAudit(null, 'CUSTOMER_CREATE', 'B2B_CUSTOMERS', `Registered wholesale customer company "${c.companyName}"`);
  
  return {
    id: c.id,
    companyName: c.companyName,
    phone: c.phone || undefined,
    email: c.email || undefined,
    billingAddress: c.billingAddress || undefined,
    shippingAddress: c.shippingAddress || undefined,
    active: c.active,
    createdAt: c.createdAt.toISOString()
  };
}

async function db_updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<boolean> {
  await db.update(schema.customers).set({
    companyName: data.companyName,
    phone: data.phone || null,
    email: data.email || null,
    billingAddress: data.billingAddress || null,
    shippingAddress: data.shippingAddress || null,
    active: data.active
  }).where(eq(schema.customers.id, id));
  
  await logB2BAudit(null, 'CUSTOMER_UPDATE', 'B2B_CUSTOMERS', `Updated details for customer ID ${id}`);
  return true;
}

// =============================================================================
// CUSTOMER USER CREDENTIALS (SUPERADMIN ONLY)
// =============================================================================
async function db_getCustomerUsers(customerId?: string): Promise<CustomerUser[]> {
  const res = customerId
    ? await db.select().from(schema.customerUsers).where(eq(schema.customerUsers.customerId, customerId))
    : await db.select().from(schema.customerUsers);
  return res.map(u => ({
    id: u.id,
    customerId: u.customerId,
    username: u.username,
    fullName: u.fullName,
    email: u.email || undefined,
    active: u.active,
    createdAt: u.createdAt.toISOString()
  }));
}

async function db_createCustomerUser(
  customerId: string, 
  username: string, 
  passwordHash: string, 
  fullName: string, 
  email: string
): Promise<CustomerUser> {
  const res = await db.insert(schema.customerUsers).values({
    customerId,
    username,
    passwordHash,
    fullName,
    email: email.toLowerCase()
  }).returning();

  const u = res[0];
  await logB2BAudit(null, 'CUSTOMER_USER_CREATE', 'B2B_USERS', `Created portal login for "${u.fullName}" (${u.username})`);
  
  return {
    id: u.id,
    customerId: u.customerId,
    username: u.username,
    fullName: u.fullName,
    email: u.email || undefined,
    active: u.active,
    createdAt: u.createdAt.toISOString()
  };
}

// =============================================================================
// CUSTOMER SPECIFIC PRICING (SUPERADMIN ONLY)
// =============================================================================
async function db_getCustomerPricing(customerId: string): Promise<CustomerPricing[]> {
  const res = await db.select().from(schema.customerPricing).where(eq(schema.customerPricing.customerId, customerId));
  return res.map(p => ({
    id: p.id,
    customerId: p.customerId,
    variantId: p.variantId,
    customPrice: Number(p.customPrice),
    createdAt: p.createdAt.toISOString()
  }));
}

async function db_setCustomerPricing(customerId: string, variantId: string, customPrice: number): Promise<boolean> {
  // Check if exists
  const exists = await db.select()
    .from(schema.customerPricing)
    .where(and(eq(schema.customerPricing.customerId, customerId), eq(schema.customerPricing.variantId, variantId)))
    .limit(1);

  if (exists.length > 0) {
    await db.update(schema.customerPricing)
      .set({ customPrice: String(customPrice) })
      .where(eq(schema.customerPricing.id, exists[0].id));
  } else {
    await db.insert(schema.customerPricing).values({
      customerId,
      variantId,
      customPrice: String(customPrice)
    });
  }

  await logB2BAudit(null, 'CUSTOMER_PRICE_SET', 'B2B_PRICING', `Set custom pricing for customer ID ${customerId}, variant ID ${variantId} = ₹${customPrice}`);
  return true;
}

async function db_deleteCustomerPricing(id: string): Promise<boolean> {
  await db.delete(schema.customerPricing).where(eq(schema.customerPricing.id, id));
  return true;
}

// =============================================================================
// PRODUCT CATALOG & STOCK COMPILATION
// =============================================================================

export interface CatalogProduct {
  productId: string;
  productName: string;
  category: string;
  description?: string;
  active: boolean;
  variants: {
    variantId: string;
    sku: string;
    barcode: string;
    colorName: string;
    sizeName: string;
    physicalStock: number;
    reservedStock: number;
    availableStock: number;
    standardWholesalePrice: number;
    customerPrice: number; // custom price override or wholesalePrice
    mrp: number;
    rackLocation?: string;
  }[];
}

async function db_getB2BCatalog(customerId?: string): Promise<CatalogProduct[]> {
  // 1. Fetch physical stock transactions to compile current physical stock
  const txRes = await db.select().from(schema.stockTransactions);
  const transactions: StockTransaction[] = txRes.map(t => ({
    id: t.id,
    requestId: t.requestId,
    variantId: t.variantId,
    transactionType: t.transactionType as any,
    quantity: t.quantity,
    referenceNumber: t.referenceNumber || undefined,
    invoiceNumber: t.invoiceNumber || undefined,
    remarks: t.remarks || undefined,
    createdBy: t.createdBy,
    createdAt: t.createdAt.toISOString()
  }));

  // 2. Fetch reserved quantities from sales orders
  // Reserved stock are items in APPROVED or PARTIALLY_FULFILLED sales orders that have not yet been dispatched.
  // Formula: Reserved = sum(approvedQuantity - dispatchedQuantity)
  const reservedMap: Record<string, number> = {};
  const activeOrders = await db.select({
    variantId: schema.salesOrderItems.variantId,
    approvedQty: schema.salesOrderItems.approvedQuantity,
    dispatchedQty: schema.salesOrderItems.dispatchedQuantity
  })
  .from(schema.salesOrderItems)
  .innerJoin(schema.salesOrders, eq(schema.salesOrderItems.orderId, schema.salesOrders.id))
  .where(inArray(schema.salesOrders.status, ['APPROVED', 'PARTIALLY_FULFILLED']));

  for (const item of activeOrders) {
    const reservedAmt = Math.max(0, item.approvedQty - item.dispatchedQty);
    reservedMap[item.variantId] = (reservedMap[item.variantId] || 0) + reservedAmt;
  }

  // 3. Fetch customer specific pricing overrides
  const pricingMap: Record<string, number> = {};
  if (customerId) {
    const customPricing = await db.select()
      .from(schema.customerPricing)
      .where(eq(schema.customerPricing.customerId, customerId));
    for (const p of customPricing) {
      pricingMap[p.variantId] = Number(p.customPrice);
    }
  }

  // 4. Load products, colors, sizes, variants
  const productsList = await db.select().from(schema.products).where(eq(schema.products.active, true));
  const colorsList = await db.select().from(schema.productColors);
  const sizesList = await db.select().from(schema.productSizes);
  const variantsList = await db.select().from(schema.productVariants).where(eq(schema.productVariants.active, true));

  const catalog: CatalogProduct[] = [];

  for (const p of productsList) {
    const productVariantsFiltered = variantsList.filter(v => v.productId === p.id);
    if (productVariantsFiltered.length === 0) continue;

    const variantsData = productVariantsFiltered.map(v => {
      const colorObj = colorsList.find(c => c.id === v.colorId);
      const sizeObj = sizesList.find(s => s.id === v.sizeId);
      
      const stock = compileStockForVariant(v.id, transactions);
      const physical = stock.readyStock;
      const reserved = reservedMap[v.id] || 0;
      const available = Math.max(0, physical - reserved);

      const mrp = Number(v.mrp);
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
        mrp,
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
}

// =============================================================================
// SYSTEM NOTIFICATIONS
// =============================================================================
async function db_createB2BNotification(customerId: string, message: string, type: string) {
  try {
    await db.insert(schema.notifications).values({
      customerId,
      message,
      type,
      read: false,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

async function db_getNotifications(customerId: string): Promise<Notification[]> {
  const res = await db.select()
    .from(schema.notifications)
    .where(eq(schema.notifications.customerId, customerId))
    .orderBy(desc(schema.notifications.createdAt));

  return res.map(n => ({
    id: n.id,
    customerId: n.customerId,
    message: n.message,
    read: n.read,
    type: n.type,
    createdAt: n.createdAt.toISOString()
  }));
}

async function db_markNotificationsAsRead(customerId: string): Promise<boolean> {
  await db.update(schema.notifications)
    .set({ read: true })
    .where(eq(schema.notifications.customerId, customerId));
  return true;
}

// =============================================================================
// SALES ORDERING SYSTEM
// =============================================================================
async function db_getSalesOrders(customerId?: string): Promise<SalesOrder[]> {
  let q = db.select({
    id: schema.salesOrders.id,
    orderNumber: schema.salesOrders.orderNumber,
    customerId: schema.salesOrders.customerId,
    createdBy: schema.salesOrders.createdBy,
    status: schema.salesOrders.status,
    totalAmount: schema.salesOrders.totalAmount,
    remarks: schema.salesOrders.remarks,
    approvedBy: schema.salesOrders.approvedBy,
    approvedAt: schema.salesOrders.approvedAt,
    createdAt: schema.salesOrders.createdAt,
    companyName: schema.customers.companyName
  })
  .from(schema.salesOrders)
  .innerJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
  .orderBy(desc(schema.salesOrders.createdAt));

  if (customerId) {
    q = db.select({
      id: schema.salesOrders.id,
      orderNumber: schema.salesOrders.orderNumber,
      customerId: schema.salesOrders.customerId,
      createdBy: schema.salesOrders.createdBy,
      status: schema.salesOrders.status,
      totalAmount: schema.salesOrders.totalAmount,
      remarks: schema.salesOrders.remarks,
      approvedBy: schema.salesOrders.approvedBy,
      approvedAt: schema.salesOrders.approvedAt,
      createdAt: schema.salesOrders.createdAt,
      companyName: schema.customers.companyName
    })
    .from(schema.salesOrders)
    .innerJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
    .where(eq(schema.salesOrders.customerId, customerId))
    .orderBy(desc(schema.salesOrders.createdAt)) as any;
  }

  const res = await q;
  return res.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    createdBy: o.createdBy,
    status: o.status as any,
    totalAmount: Number(o.totalAmount),
    remarks: o.remarks || undefined,
    approvedBy: o.approvedBy || undefined,
    approvedAt: o.approvedAt?.toISOString() || undefined,
    createdAt: o.createdAt.toISOString(),
    companyName: o.companyName
  }));
}

async function db_getSalesOrderDetails(orderId: string): Promise<{ order: SalesOrder; items: SalesOrderItem[] } | null> {
  const oRes = await db.select({
    id: schema.salesOrders.id,
    orderNumber: schema.salesOrders.orderNumber,
    customerId: schema.salesOrders.customerId,
    createdBy: schema.salesOrders.createdBy,
    status: schema.salesOrders.status,
    totalAmount: schema.salesOrders.totalAmount,
    remarks: schema.salesOrders.remarks,
    approvedBy: schema.salesOrders.approvedBy,
    approvedAt: schema.salesOrders.approvedAt,
    createdAt: schema.salesOrders.createdAt,
    companyName: schema.customers.companyName
  })
  .from(schema.salesOrders)
  .innerJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
  .where(eq(schema.salesOrders.id, orderId))
  .limit(1);

  if (oRes.length === 0) return null;
  const o = oRes[0];

  const itemsRes = await db.select({
    id: schema.salesOrderItems.id,
    orderId: schema.salesOrderItems.orderId,
    variantId: schema.salesOrderItems.variantId,
    orderedQuantity: schema.salesOrderItems.orderedQuantity,
    approvedQuantity: schema.salesOrderItems.approvedQuantity,
    dispatchedQuantity: schema.salesOrderItems.dispatchedQuantity,
    pricePerUnit: schema.salesOrderItems.pricePerUnit,
    totalPrice: schema.salesOrderItems.totalPrice,
    createdAt: schema.salesOrderItems.createdAt,
    sku: schema.productVariants.sku,
    productName: schema.products.productName,
    colorName: schema.productColors.colorName,
    sizeName: schema.productSizes.sizeName,
    mrp: schema.productVariants.mrp
  })
  .from(schema.salesOrderItems)
  .innerJoin(schema.productVariants, eq(schema.salesOrderItems.variantId, schema.productVariants.id))
  .innerJoin(schema.products, eq(schema.productVariants.productId, schema.products.id))
  .innerJoin(schema.productColors, eq(schema.productVariants.colorId, schema.productColors.id))
  .innerJoin(schema.productSizes, eq(schema.productVariants.sizeId, schema.productSizes.id))
  .where(eq(schema.salesOrderItems.orderId, orderId));

  const order: SalesOrder = {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    createdBy: o.createdBy,
    status: o.status as any,
    totalAmount: Number(o.totalAmount),
    remarks: o.remarks || undefined,
    approvedBy: o.approvedBy || undefined,
    approvedAt: o.approvedAt?.toISOString() || undefined,
    createdAt: o.createdAt.toISOString(),
    companyName: o.companyName
  };

  const catalog = await getB2BCatalog(o.customerId);
  const stockMap: Record<string, number> = {};
  for (const p of catalog) {
    for (const v of p.variants) {
      stockMap[v.variantId] = v.availableStock;
    }
  }

  const items: SalesOrderItem[] = itemsRes.map(i => ({
    id: i.id,
    orderId: i.orderId,
    variantId: i.variantId,
    orderedQuantity: i.orderedQuantity,
    approvedQuantity: i.approvedQuantity,
    dispatchedQuantity: i.dispatchedQuantity,
    pricePerUnit: Number(i.pricePerUnit),
    totalPrice: Number(i.totalPrice),
    createdAt: i.createdAt.toISOString(),
    sku: i.sku,
    productName: i.productName,
    colorName: i.colorName,
    sizeName: i.sizeName,
    mrp: Number(i.mrp),
    availableStock: stockMap[i.variantId] || 0
  }));

  return { order, items };
}

async function db_createSalesOrder(
  customerId: string, 
  branchId: string,
  createdByUserId: string, 
  items: { variantId: string; quantity: number }[],
  remarks?: string
): Promise<{ success: boolean; error?: string; order?: SalesOrder }> {
  if (items.length === 0) return { success: false, error: 'Cannot create an empty order.' };

  // 1. Generate Order Number: SO-000001
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(schema.salesOrders);
  const count = Number(countRes[0]?.count || 0) + 1;
  const orderNumber = `SO-${String(count).padStart(6, '0')}`;

  // 2. Fetch catalog prices for pricing accuracy
  const catalog = await db_getB2BCatalog(customerId);
  const variantsMap: Record<string, { price: number; available: number; sku: string }> = {};
  for (const p of catalog) {
    for (const v of p.variants) {
      variantsMap[v.variantId] = { price: v.customerPrice, available: v.availableStock, sku: v.sku };
    }
  }

  // 3. Verify stock availability and compute prices
  let totalAmount = 0;
  const orderItemsValues: any[] = [];

  for (const item of items) {
    const lookup = variantsMap[item.variantId];
    if (!lookup) {
      return { success: false, error: `SKU variant ID ${item.variantId} not active or found.` };
    }

    if (lookup.available < item.quantity) {
      return { success: false, error: `Insufficient stock for SKU ${lookup.sku}! Available: ${lookup.available}, Requested: ${item.quantity}.` };
    }

    const price = lookup.price;
    const itemTotal = price * item.quantity;
    totalAmount += itemTotal;

    orderItemsValues.push({
      variantId: item.variantId,
      orderedQuantity: item.quantity,
      approvedQuantity: 0, // Pending approval
      dispatchedQuantity: 0,
      pricePerUnit: String(price),
      totalPrice: String(itemTotal)
    });
  }

  // 4. Create sales_orders record
  try {
    const oRes = await db.insert(schema.salesOrders).values({
      orderNumber,
      customerId,
      branchId,
      createdBy: createdByUserId,
      status: 'PENDING_APPROVAL',
      totalAmount: String(totalAmount),
      remarks: remarks || null
    }).returning();

    const orderObj = oRes[0];

    // Insert sales_order_items
    for (const val of orderItemsValues) {
      await db.insert(schema.salesOrderItems).values({
        orderId: orderObj.id,
        variantId: val.variantId,
        orderedQuantity: val.orderedQuantity,
        approvedQuantity: val.approvedQuantity,
        dispatchedQuantity: val.dispatchedQuantity,
        pricePerUnit: val.pricePerUnit,
        totalPrice: val.totalPrice
      });
    }

    await logB2BAudit(null, 'ORDER_CREATE', 'B2B_ORDERS', `Created order "${orderNumber}" for total ₹${totalAmount}`);
    
    // Notify customer
    await createB2BNotification(customerId, `Your order ${orderNumber} has been successfully submitted and is pending review.`, 'ORDER_SUBMITTED');

    return {
      success: true,
      order: {
        id: orderObj.id,
        orderNumber: orderObj.orderNumber,
        customerId: orderObj.customerId,
        branchId: orderObj.branchId || undefined,
        sourceId: orderObj.sourceId || undefined,
        createdBy: orderObj.createdBy,
        status: orderObj.status as any,
        totalAmount: Number(orderObj.totalAmount),
        remarks: orderObj.remarks || undefined,
        createdAt: orderObj.createdAt.toISOString()
      }
    };
  } catch (err: any) {
    console.error('Order creation error:', err);
    return { success: false, error: err.message || 'Database execution aborted.' };
  }
}

// =============================================================================
// ORDER APPROVAL WORKFLOW (SUPERADMIN ONLY)
// =============================================================================
async function db_approveSalesOrder(
  orderId: string, 
  adminProfileId: string,
  adjustments: { itemId: string; approvedQty: number; replacedVariantId?: string; reject?: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  // Fetch details
  const details = await getSalesOrderDetails(orderId);
  if (!details) return { success: false, error: 'Sales order not found.' };

  if (details.order.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'Only pending orders can be approved.' };
  }

  // 1. Compile Live Catalog for stock availability checks
  const catalog = await db_getB2BCatalog(details.order.customerId);
  const stockMap: Record<string, number> = {};
  for (const p of catalog) {
    for (const v of p.variants) {
      stockMap[v.variantId] = v.availableStock;
    }
  }

  let hasApproved = false;
  let hasRejected = false;
  let hasPartial = false;
  let adjustedTotal = 0;

  try {
    // 2. Adjust item quantities and check stock constraints
    for (const item of details.items) {
      const adj = adjustments.find(a => a.itemId === item.id);
      const approvedQty = adj !== undefined ? adj.approvedQty : item.orderedQuantity;
      const reject = adj?.reject || false;
      const replacedVariantId = adj?.replacedVariantId;

      const oldVal = JSON.stringify(item);
      let nextVariantId = item.variantId;
      let nextPrice = item.pricePerUnit;

      if (replacedVariantId) {
        nextVariantId = replacedVariantId;
        // Fetch new price
        const variant = await db.select().from(schema.productVariants).where(eq(schema.productVariants.id, replacedVariantId)).limit(1);
        if (variant.length > 0) {
          // Check if there is a custom pricing override for this customer
          const custom = await db.select().from(schema.customerPricing).where(and(eq(schema.customerPricing.customerId, details.order.customerId), eq(schema.customerPricing.variantId, replacedVariantId))).limit(1);
          nextPrice = custom.length > 0 ? Number(custom[0].customPrice) : Number(variant[0].wholesalePrice);
        }
      }

      if (reject || approvedQty <= 0) {
        hasRejected = true;
        
        await db.update(schema.salesOrderItems).set({
          approvedQuantity: 0,
          totalPrice: '0.00'
        }).where(eq(schema.salesOrderItems.id, item.id));

        const updated = { ...item, approvedQuantity: 0, totalPrice: 0 };
        await db_logB2BAuditDetailed(adminProfileId, 'SKU_REJECT', 'B2B_ORDERS', `Rejected SKU item ${item.id} in order ${details.order.orderNumber}`, oldVal, JSON.stringify(updated));
      } else {
        if (approvedQty > item.orderedQuantity && !replacedVariantId) {
          return { success: false, error: `Approved quantity cannot exceed ordered quantity for SKU ${item.sku}.` };
        }

        const avail = stockMap[nextVariantId] || 0;
        if (avail < approvedQty) {
          return { success: false, error: `Insufficient available stock to approve ${approvedQty} units of variant ID ${nextVariantId}! Available: ${avail}` };
        }

        const itemTotal = approvedQty * nextPrice;
        adjustedTotal += itemTotal;
        hasApproved = true;

        if (approvedQty < item.orderedQuantity || replacedVariantId) {
          hasPartial = true;
        }

        await db.update(schema.salesOrderItems).set({
          variantId: nextVariantId,
          pricePerUnit: String(nextPrice),
          approvedQuantity: approvedQty,
          totalPrice: String(itemTotal)
        }).where(eq(schema.salesOrderItems.id, item.id));

        const updated = { ...item, variantId: nextVariantId, pricePerUnit: nextPrice, approvedQuantity: approvedQty, totalPrice: itemTotal };
        await db_logB2BAuditDetailed(adminProfileId, 'SKU_APPROVE', 'B2B_ORDERS', `Approved SKU item ${item.id} qty=${approvedQty} in order ${details.order.orderNumber}`, oldVal, JSON.stringify(updated));
      }
    }

    let finalStatus: 'APPROVED' | 'PARTIALLY_APPROVED' | 'CANCELLED' = 'APPROVED';
    if (hasApproved) {
      finalStatus = hasPartial || hasRejected ? 'PARTIALLY_APPROVED' : 'APPROVED';
    } else {
      finalStatus = 'CANCELLED';
    }

    // 4. Update sales_orders status and amount
    await db.update(schema.salesOrders).set({
      status: finalStatus,
      totalAmount: String(adjustedTotal),
      approvedBy: adminProfileId,
      approvedAt: new Date()
    }).where(eq(schema.salesOrders.id, orderId));

    await db_logB2BAuditDetailed(adminProfileId, 'ORDER_APPROVE', 'B2B_ORDERS', `Approved B2B order "${details.order.orderNumber}" (Adjusted Total: ₹${adjustedTotal})`, JSON.stringify(details.order), JSON.stringify({ ...details.order, status: finalStatus, totalAmount: adjustedTotal }));
    
    // Notify customer
    await createB2BNotification(details.order.customerId, `Your order ${details.order.orderNumber} status updated to ${finalStatus} for ₹${adjustedTotal}.`, 'ORDER_APPROVED');

    return { success: true };
  } catch (err: any) {
    console.error('Order approval DB error:', err);
    return { success: false, error: err.message || 'Failed to execute order approval.' };
  }
}

async function db_rejectSalesOrder(orderId: string, adminProfileId: string): Promise<{ success: boolean; error?: string }> {
  const details = await getSalesOrderDetails(orderId);
  if (!details) return { success: false, error: 'Order not found.' };

  if (details.order.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'Only pending orders can be rejected.' };
  }

  await db.update(schema.salesOrders)
    .set({ status: 'CANCELLED' })
    .where(eq(schema.salesOrders.id, orderId));

  await logB2BAudit(adminProfileId, 'ORDER_REJECT', 'B2B_ORDERS', `Rejected B2B order "${details.order.orderNumber}"`);
  
  // Notify customer
  await createB2BNotification(details.order.customerId, `Your order ${details.order.orderNumber} has been rejected/cancelled.`, 'ORDER_REJECTED');

  return { success: true };
}

// =============================================================================
// DISPATCH MANAGEMENT (INVENTORY DEPT)
// =============================================================================
async function db_getDispatches(customerId?: string): Promise<Dispatch[]> {
  let q = db.select({
    id: schema.dispatches.id,
    orderId: schema.dispatches.orderId,
    dispatchNumber: schema.dispatches.dispatchNumber,
    courier: schema.dispatches.courier,
    trackingNumber: schema.dispatches.trackingNumber,
    dispatchDate: schema.dispatches.dispatchDate,
    remarks: schema.dispatches.remarks,
    createdBy: schema.dispatches.createdBy,
    createdAt: schema.dispatches.createdAt,
    orderNumber: schema.salesOrders.orderNumber
  })
  .from(schema.dispatches)
  .innerJoin(schema.salesOrders, eq(schema.dispatches.orderId, schema.salesOrders.id))
  .orderBy(desc(schema.dispatches.createdAt));

  if (customerId) {
    q = db.select({
      id: schema.dispatches.id,
      orderId: schema.dispatches.orderId,
      dispatchNumber: schema.dispatches.dispatchNumber,
      courier: schema.dispatches.courier,
      trackingNumber: schema.dispatches.trackingNumber,
      dispatchDate: schema.dispatches.dispatchDate,
      remarks: schema.dispatches.remarks,
      createdBy: schema.dispatches.createdBy,
      createdAt: schema.dispatches.createdAt,
      orderNumber: schema.salesOrders.orderNumber
    })
    .from(schema.dispatches)
    .innerJoin(schema.salesOrders, eq(schema.dispatches.orderId, schema.salesOrders.id))
    .where(eq(schema.salesOrders.customerId, customerId))
    .orderBy(desc(schema.dispatches.createdAt)) as any;
  }

  const res = await q;
  return res.map(d => ({
    id: d.id,
    orderId: d.orderId,
    dispatchNumber: d.dispatchNumber,
    courier: d.courier,
    trackingNumber: d.trackingNumber,
    dispatchDate: d.dispatchDate.toISOString(),
    remarks: d.remarks || undefined,
    createdBy: d.createdBy,
    createdAt: d.createdAt.toISOString(),
    orderNumber: d.orderNumber
  }));
}

async function db_createDispatch(
  orderId: string,
  courier: string,
  trackingNumber: string,
  remarks: string,
  items: { itemId: string; quantity: number }[], // sales_order_items IDs and dispatch quantites
  inventoryProfileId: string
): Promise<{ success: boolean; error?: string }> {
  if (items.length === 0) return { success: false, error: 'Cannot create an empty dispatch.' };

  const details = await getSalesOrderDetails(orderId);
  if (!details) return { success: false, error: 'Sales order not found.' };

  if (details.order.status !== 'APPROVED' && details.order.status !== 'PARTIALLY_FULFILLED') {
    return { success: false, error: 'Dispatches can only be created against APPROVED or PARTIALLY_FULFILLED orders.' };
  }

  // Calculate physical stock to prevent negative physical stock posting
  const allTx = await db.select().from(schema.stockTransactions);
  const physicalMap: Record<string, number> = {};
  
  // Initialize with current physical stock
  for (const item of details.items) {
    const vStock = compileStockForVariant(item.variantId, allTx.map(t => ({
      id: t.id,
      requestId: t.requestId,
      variantId: t.variantId,
      transactionType: t.transactionType as any,
      quantity: t.quantity,
      referenceNumber: t.referenceNumber || undefined,
      invoiceNumber: t.invoiceNumber || undefined,
      remarks: t.remarks || undefined,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString()
    })));
    physicalMap[item.variantId] = vStock.readyStock;
  }

  // Check validation limits
  for (const item of items) {
    const oItem = details.items.find((i: any) => i.id === item.itemId);
    if (!oItem) return { success: false, error: 'Order item ID not found.' };

    const remainingToDispatch = oItem.approvedQuantity - oItem.dispatchedQuantity;
    if (item.quantity > remainingToDispatch) {
      return { success: false, error: `Cannot dispatch ${item.quantity} units! Remaining approved quantity to ship for SKU ${oItem.sku} is only ${remainingToDispatch}.` };
    }

    const availPhysical = physicalMap[oItem.variantId] || 0;
    if (availPhysical < item.quantity) {
      return { success: false, error: `Insufficient physical warehouse stock to dispatch SKU ${oItem.sku}! Physical Ready Stock: ${availPhysical}, Request: ${item.quantity}.` };
    }
  }

  // Generate Dispatch Number DN-000001
  const dCount = await db.select({ count: sql<number>`count(*)` }).from(schema.dispatches);
  const count = Number(dCount[0]?.count || 0) + 1;
  const dispatchNumber = `DN-${String(count).padStart(6, '0')}`;

  try {
    // 1. Create dispatches record
    const dRes = await db.insert(schema.dispatches).values({
      orderId,
      dispatchNumber,
      courier,
      trackingNumber,
      dispatchDate: new Date(),
      remarks: remarks || null,
      createdBy: inventoryProfileId
    }).returning();

    const dispatchObj = dRes[0];

    // 2. Insert dispatch items, update sales_order_items dispatched quantity, post physical SALE stock transactions
    for (const item of items) {
      const oItem = details.items.find((i: any) => i.id === item.itemId)!;
      
      // A. Create dispatch_items record
      await db.insert(schema.dispatchItems).values({
        dispatchId: dispatchObj.id,
        variantId: oItem.variantId,
        quantity: item.quantity
      });

      // B. Update dispatchedQuantity on sales_order_items
      const nextDispatched = oItem.dispatchedQuantity + item.quantity;
      await db.update(schema.salesOrderItems)
        .set({ dispatchedQuantity: nextDispatched })
        .where(eq(schema.salesOrderItems.id, item.itemId));

      // C. Post physical ledger SALE stock transactions
      // To satisfy immutable triggers and consistency:
      // First create a mock stock_request
      const reqRes = await db.insert(schema.stockRequests).values({
        variantId: oItem.variantId,
        requestType: 'SALE',
        quantity: item.quantity,
        referenceNumber: dispatchNumber,
        remarks: `B2B Order Dispatch: ${details.order.orderNumber}`,
        createdBy: inventoryProfileId,
        status: 'APPROVED',
        reviewedBy: inventoryProfileId,
        reviewedAt: new Date()
      }).returning();

      const reqObj = reqRes[0];

      // Insert transaction
      await db.insert(schema.stockTransactions).values({
        requestId: reqObj.id,
        variantId: oItem.variantId,
        transactionType: 'SALE',
        quantity: item.quantity,
        referenceNumber: dispatchNumber,
        remarks: `B2B Order Dispatch: ${details.order.orderNumber}`,
        createdBy: inventoryProfileId
      });
    }

    // 3. Update Sales Order Status dynamically
    const reDetails = await getSalesOrderDetails(orderId);
    let allDispatched = true;
    let anyDispatched = false;

    if (reDetails) {
      for (const it of reDetails.items) {
        if (it.dispatchedQuantity < it.approvedQuantity) {
          allDispatched = false;
        }
        if (it.dispatchedQuantity > 0) {
          anyDispatched = true;
        }
      }
    }

    const nextStatus = allDispatched ? 'DISPATCHED' : (anyDispatched ? 'PARTIALLY_FULFILLED' : 'APPROVED');
    await db.update(schema.salesOrders)
      .set({ status: nextStatus })
      .where(eq(schema.salesOrders.id, orderId));

    await logB2BAudit(inventoryProfileId, 'DISPATCH_CREATE', 'B2B_DISPATCHES', `Created dispatch "${dispatchNumber}" for order "${details.order.orderNumber}"`);
    
    // Notify customer
    await createB2BNotification(details.order.customerId, `Dispatch ${dispatchNumber} has been created for your order ${details.order.orderNumber}. Tracking No: ${trackingNumber} via ${courier}.`, 'DISPATCH_CREATED');

    return { success: true };
  } catch (err: any) {
    console.error('Dispatch creation error:', err);
    return { success: false, error: err.message || 'Database execution failed.' };
  }
}

// =============================================================================
// INVOICES & LEDGER MANAGEMENT (ACCOUNTS / ADMIN)
// =============================================================================
async function db_getInvoices(customerId?: string): Promise<Invoice[]> {
  let q = db.select({
    id: schema.invoices.id,
    orderId: schema.invoices.orderId,
    invoiceNumber: schema.invoices.invoiceNumber,
    invoiceDate: schema.invoices.invoiceDate,
    amount: schema.invoices.amount,
    dueDate: schema.invoices.dueDate,
    status: schema.invoices.status,
    invoicePdfUrl: schema.invoices.invoicePdfUrl,
    createdBy: schema.invoices.createdBy,
    createdAt: schema.invoices.createdAt,
    orderNumber: schema.salesOrders.orderNumber,
    companyName: schema.customers.companyName
  })
  .from(schema.invoices)
  .innerJoin(schema.salesOrders, eq(schema.invoices.orderId, schema.salesOrders.id))
  .innerJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
  .orderBy(desc(schema.invoices.createdAt));

  if (customerId) {
    q = db.select({
      id: schema.invoices.id,
      orderId: schema.invoices.orderId,
      invoiceNumber: schema.invoices.invoiceNumber,
      invoiceDate: schema.invoices.invoiceDate,
      amount: schema.invoices.amount,
      dueDate: schema.invoices.dueDate,
      status: schema.invoices.status,
      invoicePdfUrl: schema.invoices.invoicePdfUrl,
      createdBy: schema.invoices.createdBy,
      createdAt: schema.invoices.createdAt,
      orderNumber: schema.salesOrders.orderNumber,
      companyName: schema.customers.companyName
    })
    .from(schema.invoices)
    .innerJoin(schema.salesOrders, eq(schema.invoices.orderId, schema.salesOrders.id))
    .innerJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
    .where(eq(schema.salesOrders.customerId, customerId))
    .orderBy(desc(schema.invoices.createdAt)) as any;
  }

  const res = await q;
  return res.map(inv => ({
    id: inv.id,
    orderId: inv.orderId,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate.toISOString(),
    amount: Number(inv.amount),
    dueDate: inv.dueDate.toISOString(),
    status: inv.status as any,
    invoicePdfUrl: inv.invoicePdfUrl || undefined,
    createdBy: inv.createdBy,
    createdAt: inv.createdAt.toISOString(),
    orderNumber: inv.orderNumber,
    companyName: inv.companyName
  }));
}

async function db_createInvoice(
  orderId: string,
  invoiceNumber: string,
  amount: number,
  dueDate: Date,
  invoicePdfUrl: string,
  accountsProfileId: string
): Promise<{ success: boolean; error?: string }> {
  // Check invoice number uniqueness
  const ex = await db.select().from(schema.invoices).where(eq(schema.invoices.invoiceNumber, invoiceNumber)).limit(1);
  if (ex.length > 0) return { success: false, error: 'Invoice number already exists.' };

  const details = await getSalesOrderDetails(orderId);
  if (!details) return { success: false, error: 'Order not found.' };

  try {
    // 1. Insert invoice record
    const res = await db.insert(schema.invoices).values({
      orderId,
      invoiceNumber,
      invoiceDate: new Date(),
      amount: String(amount),
      dueDate,
      status: 'UNPAID',
      invoicePdfUrl: invoicePdfUrl || null,
      createdBy: accountsProfileId
    }).returning();

    const invoiceObj = res[0];

    // 2. Post DEBIT entry to the customer ledger
    // Debit ledger entry represents an outstanding amount due from the customer.
    // Fetch last running balance to increment
    const ledgerList = await db.select().from(schema.customerLedger)
      .where(eq(schema.customerLedger.customerId, details.order.customerId))
      .orderBy(desc(schema.customerLedger.createdAt))
      .limit(1);

    const prevBal = ledgerList.length > 0 ? Number(ledgerList[0].runningBalance) : 0;
    const runningBalance = prevBal + amount;

    await db.insert(schema.customerLedger).values({
      customerId: details.order.customerId,
      date: new Date(),
      referenceType: 'INVOICE',
      referenceId: invoiceObj.id,
      debitAmount: String(amount),
      creditAmount: '0.00',
      runningBalance: String(runningBalance),
      description: `Invoice ${invoiceNumber} issued for order ${details.order.orderNumber}`
    });

    await logB2BAudit(accountsProfileId, 'INVOICE_CREATE', 'B2B_INVOICES', `Created invoice "${invoiceNumber}" for order "${details.order.orderNumber}" (₹${amount})`);
    
    // Notify customer
    await createB2BNotification(details.order.customerId, `Invoice ${invoiceNumber} for ₹${amount} has been uploaded. Due date: ${dueDate.toLocaleDateString()}.`, 'INVOICE_UPLOADED');

    return { success: true };
  } catch (err: any) {
    console.error('Invoice creation error:', err);
    return { success: false, error: err.message || 'Invoice failed to insert.' };
  }
}

// =============================================================================
// PAYMENT REFERENCE SYSTEM (EXTERNAL UTR VERIFICATION)
// =============================================================================
async function db_getPaymentReferences(customerId?: string): Promise<PaymentReference[]> {
  let q = db.select({
    id: schema.paymentReferences.id,
    customerId: schema.paymentReferences.customerId,
    invoiceId: schema.paymentReferences.invoiceId,
    paymentDate: schema.paymentReferences.paymentDate,
    amount: schema.paymentReferences.amount,
    paymentMode: schema.paymentReferences.paymentMode,
    referenceNumber: schema.paymentReferences.referenceNumber,
    utrNumber: schema.paymentReferences.utrNumber,
    notes: schema.paymentReferences.notes,
    attachmentUrl: schema.paymentReferences.attachmentUrl,
    status: schema.paymentReferences.status,
    verifiedBy: schema.paymentReferences.verifiedBy,
    verifiedAt: schema.paymentReferences.verifiedAt,
    rejectionReason: schema.paymentReferences.rejectionReason,
    createdAt: schema.paymentReferences.createdAt,
    companyName: schema.customers.companyName,
    invoiceNumber: schema.invoices.invoiceNumber
  })
  .from(schema.paymentReferences)
  .innerJoin(schema.customers, eq(schema.paymentReferences.customerId, schema.customers.id))
  .leftJoin(schema.invoices, eq(schema.paymentReferences.invoiceId, schema.invoices.id))
  .orderBy(desc(schema.paymentReferences.createdAt));

  if (customerId) {
    q = db.select({
      id: schema.paymentReferences.id,
      customerId: schema.paymentReferences.customerId,
      invoiceId: schema.paymentReferences.invoiceId,
      paymentDate: schema.paymentReferences.paymentDate,
      amount: schema.paymentReferences.amount,
      paymentMode: schema.paymentReferences.paymentMode,
      referenceNumber: schema.paymentReferences.referenceNumber,
      utrNumber: schema.paymentReferences.utrNumber,
      notes: schema.paymentReferences.notes,
      attachmentUrl: schema.paymentReferences.attachmentUrl,
      status: schema.paymentReferences.status,
      verifiedBy: schema.paymentReferences.verifiedBy,
      verifiedAt: schema.paymentReferences.verifiedAt,
      rejectionReason: schema.paymentReferences.rejectionReason,
      createdAt: schema.paymentReferences.createdAt,
      companyName: schema.customers.companyName,
      invoiceNumber: schema.invoices.invoiceNumber
    })
    .from(schema.paymentReferences)
    .innerJoin(schema.customers, eq(schema.paymentReferences.customerId, schema.customers.id))
    .leftJoin(schema.invoices, eq(schema.paymentReferences.invoiceId, schema.invoices.id))
    .where(eq(schema.paymentReferences.customerId, customerId))
    .orderBy(desc(schema.paymentReferences.createdAt)) as any;
  }

  const res = await q;
  return res.map(p => ({
    id: p.id,
    customerId: p.customerId,
    invoiceId: p.invoiceId || undefined,
    paymentDate: p.paymentDate.toISOString(),
    amount: Number(p.amount),
    paymentMode: p.paymentMode as any,
    referenceNumber: p.referenceNumber || undefined,
    utrNumber: p.utrNumber,
    notes: p.notes || undefined,
    attachmentUrl: p.attachmentUrl || undefined,
    status: p.status as any,
    verifiedBy: p.verifiedBy || undefined,
    verifiedAt: p.verifiedAt?.toISOString() || undefined,
    rejectionReason: p.rejectionReason || undefined,
    createdAt: p.createdAt.toISOString(),
    companyName: p.companyName,
    invoiceNumber: p.invoiceNumber || undefined
  }));
}

async function db_submitPaymentReference(
  customerId: string,
  invoiceId: string | undefined,
  paymentDate: Date,
  amount: number,
  paymentMode: 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH',
  referenceNumber: string,
  utrNumber: string,
  notes: string,
  attachmentUrl: string
): Promise<{ success: boolean; error?: string }> {
  // Check UTR number uniqueness
  const ex = await db.select().from(schema.paymentReferences).where(eq(schema.paymentReferences.utrNumber, utrNumber)).limit(1);
  if (ex.length > 0) return { success: false, error: 'A payment reference with this UTR number already exists.' };

  try {
    await db.insert(schema.paymentReferences).values({
      customerId,
      invoiceId: invoiceId || null,
      paymentDate,
      amount: String(amount),
      paymentMode,
      referenceNumber: referenceNumber || null,
      utrNumber,
      notes: notes || null,
      attachmentUrl: attachmentUrl || null,
      status: 'SUBMITTED'
    });

    await logB2BAudit(null, 'PAYMENT_SUBMIT', 'B2B_PAYMENTS', `Customer submitted payment reference UTR: ${utrNumber} for amount ₹${amount}`);
    return { success: true };
  } catch (err: any) {
    console.error('Payment reference submit error:', err);
    return { success: false, error: err.message || 'Failed to submit payment reference.' };
  }
}

async function db_verifyPaymentReference(
  paymentRefId: string,
  accountsProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const pRes = await db.select().from(schema.paymentReferences).where(eq(schema.paymentReferences.id, paymentRefId)).limit(1);
  if (pRes.length === 0) return { success: false, error: 'Payment reference not found.' };
  const payRef = pRes[0];

  if (payRef.status !== 'SUBMITTED') return { success: false, error: 'Only pending payment references can be verified.' };

  try {
    // 1. Verify payment reference record
    await db.update(schema.paymentReferences).set({
      status: 'VERIFIED',
      verifiedBy: accountsProfileId,
      verifiedAt: new Date()
    }).where(eq(schema.paymentReferences.id, paymentRefId));

    const amount = Number(payRef.amount);

    // 2. Post CREDIT entry to ledger
    // A credit ledger entry reduces outstanding customer ledger running balance.
    const ledgerList = await db.select().from(schema.customerLedger)
      .where(eq(schema.customerLedger.customerId, payRef.customerId))
      .orderBy(desc(schema.customerLedger.createdAt))
      .limit(1);

    const prevBal = ledgerList.length > 0 ? Number(ledgerList[0].runningBalance) : 0;
    const runningBalance = prevBal - amount;

    await db.insert(schema.customerLedger).values({
      customerId: payRef.customerId,
      date: new Date(),
      referenceType: 'PAYMENT',
      referenceId: payRef.id,
      debitAmount: '0.00',
      creditAmount: String(amount),
      runningBalance: String(runningBalance),
      description: `Payment reference UTR ${payRef.utrNumber} verified (${payRef.paymentMode})`
    });

    // 3. Mark invoice as PAID or PARTIALLY_PAID if linked
    if (payRef.invoiceId) {
      const invRes = await db.select().from(schema.invoices).where(eq(schema.invoices.id, payRef.invoiceId)).limit(1);
      if (invRes.length > 0) {
        const invoice = invRes[0];
        const invAmount = Number(invoice.amount);

        // Fetch all verified payments for this invoice
        const verifiedPayments = await db.select({ total: sum(schema.paymentReferences.amount) })
          .from(schema.paymentReferences)
          .where(and(
            eq(schema.paymentReferences.invoiceId, payRef.invoiceId),
            eq(schema.paymentReferences.status, 'VERIFIED')
          ));
        
        const totalPaid = Number(verifiedPayments[0]?.total || 0);
        let nextStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'PARTIALLY_PAID';
        if (totalPaid >= invAmount) {
          nextStatus = 'PAID';
        }

        await db.update(schema.invoices)
          .set({ status: nextStatus })
          .where(eq(schema.invoices.id, payRef.invoiceId));
      }
    }

    await logB2BAudit(accountsProfileId, 'PAYMENT_VERIFY', 'B2B_PAYMENTS', `Verified payment reference UTR: ${payRef.utrNumber} (Amount: ₹${amount})`);
    
    // Notify customer
    await createB2BNotification(payRef.customerId, `Your payment of ₹${amount} (UTR: ${payRef.utrNumber}) has been VERIFIED.`, 'PAYMENT_VERIFIED');

    return { success: true };
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return { success: false, error: err.message || 'Payment verification failed.' };
  }
}

async function db_rejectPaymentReference(
  paymentRefId: string,
  rejectionReason: string,
  accountsProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const pRes = await db.select().from(schema.paymentReferences).where(eq(schema.paymentReferences.id, paymentRefId)).limit(1);
  if (pRes.length === 0) return { success: false, error: 'Payment reference not found.' };
  const payRef = pRes[0];

  if (payRef.status !== 'SUBMITTED') return { success: false, error: 'Only pending payment references can be rejected.' };

  await db.update(schema.paymentReferences).set({
    status: 'REJECTED',
    rejectionReason,
    verifiedBy: accountsProfileId,
    verifiedAt: new Date()
  }).where(eq(schema.paymentReferences.id, paymentRefId));

  await logB2BAudit(accountsProfileId, 'PAYMENT_REJECT', 'B2B_PAYMENTS', `Rejected payment reference UTR: ${payRef.utrNumber}. Reason: ${rejectionReason}`);
  
  // Notify customer
  await createB2BNotification(payRef.customerId, `Your payment of ₹${payRef.amount} (UTR: ${payRef.utrNumber}) was rejected: ${rejectionReason}`, 'PAYMENT_REJECTED');

  return { success: true };
}

// =============================================================================
// CUSTOMER LEDGER COMPILED VIEW
// =============================================================================
async function db_getCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
  const res = await db.select()
    .from(schema.customerLedger)
    .where(eq(schema.customerLedger.customerId, customerId))
    .orderBy(desc(schema.customerLedger.date));

  return res.map(l => ({
    id: l.id,
    customerId: l.customerId,
    date: l.date.toISOString(),
    referenceType: l.referenceType as any,
    referenceId: l.referenceId,
    debitAmount: Number(l.debitAmount),
    creditAmount: Number(l.creditAmount),
    runningBalance: Number(l.runningBalance),
    description: l.description,
    createdAt: l.createdAt.toISOString()
  }));
}

// =============================================================================
// ADMIN B2B DASHBOARD KPI STATS & GRAPHS
// =============================================================================
async function db_getB2BAdminStats() {
  const customersList = await db.select().from(schema.customers);
  const totalCustomers = customersList.length;

  const orders = await db.select().from(schema.salesOrders);
  const totalOrders = orders.length;

  const pendingApprovals = orders.filter(o => o.status === 'PENDING_APPROVAL').length;

  // Outstanding Receivables = sum of running balances of active ledgers
  // To do this accurately, fetch the latest ledger entry for each customer
  let outstandingReceivables = 0;
  for (const c of customersList) {
    const lastLedger = await db.select()
      .from(schema.customerLedger)
      .where(eq(schema.customerLedger.customerId, c.id))
      .orderBy(desc(schema.customerLedger.createdAt))
      .limit(1);
    if (lastLedger.length > 0) {
      outstandingReceivables += Number(lastLedger[0].runningBalance);
    }
  }

  // Top Customers (by order total value)
  const customerTotals: Record<string, number> = {};
  for (const o of orders) {
    if (o.status !== 'CANCELLED') {
      customerTotals[o.customerId] = (customerTotals[o.customerId] || 0) + Number(o.totalAmount);
    }
  }

  const topCustomers = Object.entries(customerTotals)
    .map(([id, amt]) => {
      const custObj = customersList.find(c => c.id === id);
      return {
        companyName: custObj ? custObj.companyName : 'Unknown',
        amount: amt
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Top Products (by approved order items quantity)
  const productQuantities: Record<string, number> = {};
  const approvedItems = await db.select({
    variantId: schema.salesOrderItems.variantId,
    qty: schema.salesOrderItems.approvedQuantity
  })
  .from(schema.salesOrderItems)
  .innerJoin(schema.salesOrders, eq(schema.salesOrderItems.orderId, schema.salesOrders.id))
  .where(eq(schema.salesOrders.status, 'APPROVED'));

  const variantsList = await db.select().from(schema.productVariants);
  const productsList = await db.select().from(schema.products);

  for (const item of approvedItems) {
    const variant = variantsList.find(v => v.id === item.variantId);
    if (variant) {
      const prod = productsList.find(p => p.id === variant.productId);
      if (prod) {
        productQuantities[prod.productName] = (productQuantities[prod.productName] || 0) + item.qty;
      }
    }
  }

  const topProducts = Object.entries(productQuantities)
    .map(([name, qty]) => ({ name, quantity: qty }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Recent Orders
  const recentOrders = await getSalesOrders();

  // Recent Payments
  const recentPayments = await getPaymentReferences();

  return {
    totalCustomers,
    totalOrders,
    pendingApprovals,
    outstandingReceivables,
    topCustomers,
    topProducts,
    recentOrders: recentOrders.slice(0, 5),
    recentPayments: recentPayments.slice(0, 5)
  };
}

// =============================================================================
// CUSTOMER BRANCH MANAGEMENT (SUPERADMIN/ADMIN/B2B CUSTOMER)
// =============================================================================
async function db_getCustomerBranches(customerId?: string): Promise<CustomerBranch[]> {
  let q = db.select().from(schema.customerBranches);
  if (customerId) {
    q = db.select().from(schema.customerBranches).where(eq(schema.customerBranches.customerId, customerId)) as any;
  }
  const res = await q;
  return res.map(b => ({
    id: b.id,
    customerId: b.customerId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    contactPerson: b.contactPerson || undefined,
    phone: b.phone || undefined,
    email: b.email || undefined,
    gst: b.gst || undefined,
    billingAddress: b.billingAddress || undefined,
    shippingAddress: b.shippingAddress || undefined,
    status: b.status,
    createdAt: b.createdAt.toISOString()
  }));
}

async function db_createCustomerBranch(customerId: string, branchData: any): Promise<CustomerBranch> {
  const res = await db.insert(schema.customerBranches).values({
    customerId,
    branchName: branchData.branchName,
    branchCode: branchData.branchCode,
    contactPerson: branchData.contactPerson || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
    gst: branchData.gst || null,
    billingAddress: branchData.billingAddress || null,
    shippingAddress: branchData.shippingAddress || null,
    status: 'ACTIVE'
  }).returning();
  
  const b = res[0];
  await db_logB2BAuditDetailed(null, 'BRANCH_ADD', 'CUSTOMER_BRANCHES', `Added branch "${b.branchName}" for customer ${customerId}`, null, JSON.stringify(b));
  return {
    id: b.id,
    customerId: b.customerId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    contactPerson: b.contactPerson || undefined,
    phone: b.phone || undefined,
    email: b.email || undefined,
    gst: b.gst || undefined,
    billingAddress: b.billingAddress || undefined,
    shippingAddress: b.shippingAddress || undefined,
    status: b.status,
    createdAt: b.createdAt.toISOString()
  };
}

async function db_updateCustomerBranch(branchId: string, branchData: any): Promise<boolean> {
  const old = await db.select().from(schema.customerBranches).where(eq(schema.customerBranches.id, branchId)).limit(1);
  if (old.length === 0) return false;
  const oldVal = JSON.stringify(old[0]);

  const res = await db.update(schema.customerBranches).set({
    branchName: branchData.branchName,
    branchCode: branchData.branchCode,
    contactPerson: branchData.contactPerson || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
    gst: branchData.gst || null,
    billingAddress: branchData.billingAddress || null,
    shippingAddress: branchData.shippingAddress || null,
    status: branchData.status
  }).where(eq(schema.customerBranches.id, branchId)).returning();

  await db_logB2BAuditDetailed(null, 'BRANCH_EDIT', 'CUSTOMER_BRANCHES', `Edited branch ID ${branchId}`, oldVal, JSON.stringify(res[0]));
  return true;
}

// =============================================================================
// CREATE SALES ORDER ON BEHALF
// =============================================================================
async function db_createSalesOrderOnBehalf(
  customerId: string,
  branchId: string,
  sourceId: string,
  createdBy: string,
  items: { variantId: string; quantity: number }[],
  customItems: { itemName: string; description?: string; quantity: number; wsp: number; mrp: number; gstPercent: number; hsnCode?: string; remarks?: string; imageUrl?: string }[],
  remarks?: string
): Promise<{ success: boolean; error?: string; order?: SalesOrder }> {
  if (items.length === 0 && customItems.length === 0) {
    return { success: false, error: 'Cannot create an empty order.' };
  }

  const countRes = await db.select({ count: sql<number>`count(*)` }).from(schema.salesOrders);
  const count = Number(countRes[0]?.count || 0) + 1;
  const orderNumber = `SO-${String(count).padStart(6, '0')}`;

  const catalog = await db_getB2BCatalog(customerId);
  const variantsMap: Record<string, { price: number; available: number; sku: string }> = {};
  for (const p of catalog) {
    for (const v of p.variants) {
      variantsMap[v.variantId] = { price: v.customerPrice, available: v.availableStock, sku: v.sku };
    }
  }

  let totalAmount = 0;
  const orderItemsValues: any[] = [];
  const customItemsValues: any[] = [];

  for (const item of items) {
    const lookup = variantsMap[item.variantId];
    if (!lookup) {
      return { success: false, error: `SKU variant ID ${item.variantId} not active or found.` };
    }

    if (lookup.available < item.quantity) {
      return { success: false, error: `Insufficient stock for SKU ${lookup.sku}! Available: ${lookup.available}, Requested: ${item.quantity}.` };
    }

    const price = lookup.price;
    const itemTotal = price * item.quantity;
    totalAmount += itemTotal;

    orderItemsValues.push({
      variantId: item.variantId,
      orderedQuantity: item.quantity,
      approvedQuantity: 0,
      dispatchedQuantity: 0,
      pricePerUnit: String(price),
      totalPrice: String(itemTotal)
    });
  }

  for (const cItem of customItems) {
    const itemTotal = Number(cItem.wsp) * cItem.quantity;
    totalAmount += itemTotal;

    customItemsValues.push({
      itemName: cItem.itemName,
      description: cItem.description || null,
      quantity: cItem.quantity,
      wsp: String(cItem.wsp),
      mrp: String(cItem.mrp),
      gstPercent: String(cItem.gstPercent || 0),
      hsnCode: cItem.hsnCode || null,
      remarks: cItem.remarks || null,
      imageUrl: cItem.imageUrl || null
    });
  }

  try {
    const oRes = await db.insert(schema.salesOrders).values({
      orderNumber,
      customerId,
      branchId,
      sourceId,
      createdBy,
      status: 'PENDING_APPROVAL',
      totalAmount: String(totalAmount),
      remarks: remarks || null
    }).returning();

    const orderObj = oRes[0];

    for (const val of orderItemsValues) {
      await db.insert(schema.salesOrderItems).values({
        orderId: orderObj.id,
        variantId: val.variantId,
        orderedQuantity: val.orderedQuantity,
        approvedQuantity: val.approvedQuantity,
        dispatchedQuantity: val.dispatchedQuantity,
        pricePerUnit: val.pricePerUnit,
        totalPrice: val.totalPrice
      });
    }

    for (const val of customItemsValues) {
      await db.insert(schema.customOrderItems).values({
        orderId: orderObj.id,
        itemName: val.itemName,
        description: val.description,
        quantity: val.quantity,
        wsp: val.wsp,
        mrp: val.mrp,
        gstPercent: val.gstPercent,
        hsnCode: val.hsnCode,
        remarks: val.remarks,
        imageUrl: val.imageUrl
      });
    }

    await db_logB2BAuditDetailed(createdBy, 'ORDER_CREATE', 'B2B_ORDERS', `Created on-behalf order "${orderNumber}" for total ₹${totalAmount}`, null, JSON.stringify(orderObj));
    await db_createB2BNotification(customerId, `An order ${orderNumber} has been created on your behalf and is pending review.`, 'ORDER_SUBMITTED');

    return {
      success: true,
      order: {
        id: orderObj.id,
        orderNumber: orderObj.orderNumber,
        customerId: orderObj.customerId,
        branchId: orderObj.branchId || undefined,
        sourceId: orderObj.sourceId || undefined,
        createdBy: orderObj.createdBy,
        status: orderObj.status as any,
        totalAmount: Number(orderObj.totalAmount),
        remarks: orderObj.remarks || undefined,
        createdAt: orderObj.createdAt.toISOString()
      }
    };
  } catch (err: any) {
    console.error('On-behalf order creation error:', err);
    return { success: false, error: err.message || 'Database execution aborted.' };
  }
}

// =============================================================================
// CONVERT CUSTOM ITEM TO SKU
// =============================================================================
async function db_convertCustomItemToSKU(
  customItemId: string,
  variantData: { sku: string; category: string; colorName: string; sizeName: string; costPrice: number },
  adminUserId: string
): Promise<{ success: boolean; error?: string; variantId?: string }> {
  const customItems = await db.select().from(schema.customOrderItems).where(eq(schema.customOrderItems.id, customItemId)).limit(1);
  if (customItems.length === 0) return { success: false, error: 'Custom item not found.' };
  const customItem = customItems[0];
  const oldVal = JSON.stringify(customItem);

  try {
    const pRes = await db.insert(schema.products).values({
      productName: customItem.itemName,
      category: variantData.category || 'Custom Orders',
      description: customItem.description || null,
      brand: 'LJK Custom',
      season: 'All Season',
      active: true
    }).returning();
    const prod = pRes[0];

    const cRes = await db.insert(schema.productColors).values({
      productId: prod.id,
      colorName: variantData.colorName || 'Custom'
    }).returning();
    const col = cRes[0];

    const sRes = await db.insert(schema.productSizes).values({
      productId: prod.id,
      sizeName: variantData.sizeName || 'One Size'
    }).returning();
    const sz = sRes[0];

    const vRes = await db.insert(schema.productVariants).values({
      productId: prod.id,
      sku: variantData.sku,
      colorId: col.id,
      sizeId: sz.id,
      costPrice: String(variantData.costPrice || Number(customItem.wsp) * 0.5),
      wholesalePrice: String(customItem.wsp),
      mrp: String(customItem.mrp),
      rackLocation: 'Custom Rack',
      active: true
    }).returning();
    const variant = vRes[0];

    await db.update(schema.customOrderItems).set({
      convertedVariantId: variant.id
    }).where(eq(schema.customOrderItems.id, customItemId));

    await db_logB2BAuditDetailed(adminUserId, 'CUSTOM_ITEM_CONVERT', 'B2B_PRODUCTS', `Converted custom item "${customItem.itemName}" to inventory SKU: ${variant.sku}`, oldVal, JSON.stringify(variant));

    return { success: true, variantId: variant.id };
  } catch (err: any) {
    console.error('Custom item conversion failed:', err);
    return { success: false, error: err.message || 'Failed to convert custom item to SKU.' };
  }
}

// =============================================================================
// RETURNS / REVERSE LOGISTICS
// =============================================================================
async function db_getReturnRequests(customerId?: string): Promise<any[]> {
  let q = db.select({
    id: schema.returnRequests.id,
    returnNumber: schema.returnRequests.returnNumber,
    customerId: schema.returnRequests.customerId,
    branchId: schema.returnRequests.branchId,
    orderId: schema.returnRequests.orderId,
    invoiceNumber: schema.returnRequests.invoiceNumber,
    status: schema.returnRequests.status,
    reason: schema.returnRequests.reason,
    remarks: schema.returnRequests.remarks,
    createdByType: schema.returnRequests.createdByType,
    createdBy: schema.returnRequests.createdBy,
    createdAt: schema.returnRequests.createdAt,
    companyName: schema.customers.companyName,
    branchName: schema.customerBranches.branchName
  })
  .from(schema.returnRequests)
  .innerJoin(schema.customers, eq(schema.returnRequests.customerId, schema.customers.id))
  .leftJoin(schema.customerBranches, eq(schema.returnRequests.branchId, schema.customerBranches.id))
  .orderBy(desc(schema.returnRequests.createdAt));

  if (customerId) {
    q = db.select({
      id: schema.returnRequests.id,
      returnNumber: schema.returnRequests.returnNumber,
      customerId: schema.returnRequests.customerId,
      branchId: schema.returnRequests.branchId,
      orderId: schema.returnRequests.orderId,
      invoiceNumber: schema.returnRequests.invoiceNumber,
      status: schema.returnRequests.status,
      reason: schema.returnRequests.reason,
      remarks: schema.returnRequests.remarks,
      createdByType: schema.returnRequests.createdByType,
      createdBy: schema.returnRequests.createdBy,
      createdAt: schema.returnRequests.createdAt,
      companyName: schema.customers.companyName,
      branchName: schema.customerBranches.branchName
    })
    .from(schema.returnRequests)
    .innerJoin(schema.customers, eq(schema.returnRequests.customerId, schema.customers.id))
    .leftJoin(schema.customerBranches, eq(schema.returnRequests.branchId, schema.customerBranches.id))
    .where(eq(schema.returnRequests.customerId, customerId))
    .orderBy(desc(schema.returnRequests.createdAt)) as any;
  }

  const res = await q;
  const returnsList: any[] = [];

  for (const r of res) {
    const items = await db.select({
      id: schema.returnRequestItems.id,
      returnRequestId: schema.returnRequestItems.returnRequestId,
      variantId: schema.returnRequestItems.variantId,
      customItemName: schema.returnRequestItems.customItemName,
      quantity: schema.returnRequestItems.quantity,
      sku: schema.productVariants.sku,
      productName: schema.products.productName
    })
    .from(schema.returnRequestItems)
    .leftJoin(schema.productVariants, eq(schema.returnRequestItems.variantId, schema.productVariants.id))
    .leftJoin(schema.products, eq(schema.productVariants.productId, schema.products.id))
    .where(eq(schema.returnRequestItems.returnRequestId, r.id));

    const attachments = await db.select().from(schema.returnAttachments).where(eq(schema.returnAttachments.returnRequestId, r.id));
    const resolutions = await db.select().from(schema.returnResolutions).where(eq(schema.returnResolutions.returnRequestId, r.id)).limit(1);

    const orderObj = r.orderId ? await db.select().from(schema.salesOrders).where(eq(schema.salesOrders.id, r.orderId)).limit(1) : [];
    const orderNumber = orderObj.length > 0 ? orderObj[0].orderNumber : null;

    returnsList.push({
      id: r.id,
      returnNumber: r.returnNumber,
      customerId: r.customerId,
      branchId: r.branchId || undefined,
      orderId: r.orderId || undefined,
      invoiceNumber: r.invoiceNumber || undefined,
      status: r.status,
      reason: r.reason,
      remarks: r.remarks || undefined,
      createdByType: r.createdByType as any,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      companyName: r.companyName,
      branchName: r.branchName || 'Main Office',
      orderNumber,
      items: items.map(i => ({
        id: i.id,
        returnRequestId: i.returnRequestId,
        variantId: i.variantId || undefined,
        customItemName: i.customItemName || undefined,
        quantity: i.quantity,
        sku: i.sku || undefined,
        productName: i.productName || i.customItemName || undefined
      })),
      attachments: attachments.map(a => a.fileUrl),
      resolution: resolutions.length > 0 ? {
        id: resolutions[0].id,
        returnRequestId: resolutions[0].returnRequestId,
        resolutionType: resolutions[0].resolutionType,
        remarks: resolutions[0].remarks || undefined,
        resolvedBy: resolutions[0].resolvedBy,
        resolvedAt: resolutions[0].resolvedAt.toISOString()
      } : null
    });
  }

  return returnsList;
}

async function db_createReturnRequest(data: {
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
}): Promise<{ success: boolean; returnRequest: any }> {
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(schema.returnRequests);
  const count = Number(countRes[0]?.count || 0) + 1;
  const returnNumber = `RET-${String(count).padStart(6, '0')}`;

  const res = await db.insert(schema.returnRequests).values({
    returnNumber,
    customerId: data.customerId,
    branchId: data.branchId || null,
    orderId: data.orderId || null,
    invoiceNumber: data.invoiceNumber || null,
    status: 'PENDING',
    reason: data.reason,
    remarks: data.remarks || null,
    createdByType: data.createdByType,
    createdBy: data.createdBy
  }).returning();

  const r = res[0];

  for (const item of data.items) {
    await db.insert(schema.returnRequestItems).values({
      returnRequestId: r.id,
      variantId: item.variantId || null,
      customItemName: item.customItemName || null,
      quantity: item.quantity
    });
  }

  if (data.photos) {
    for (const photo of data.photos) {
      await db.insert(schema.returnAttachments).values({
        returnRequestId: r.id,
        fileUrl: photo
      });
    }
  }

  await db_logB2BAuditDetailed(data.createdBy, 'RETURN_CREATE', 'B2B_RETURNS', `Created return request ${returnNumber}`, null, JSON.stringify(r));

  return {
    success: true,
    returnRequest: {
      ...r,
      createdAt: r.createdAt.toISOString()
    }
  };
}

async function db_resolveReturnRequest(
  returnRequestId: string,
  resolutionType: 'Replace' | 'Credit Note' | 'Refund' | 'Repair' | 'Reject Claim',
  remarks: string,
  receivedStatus: 'READY_STOCK' | 'REPAIRABLE' | 'SCRAP' | null,
  adminProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const oldRes = await db.select().from(schema.returnRequests).where(eq(schema.returnRequests.id, returnRequestId)).limit(1);
  if (oldRes.length === 0) return { success: false, error: 'Return request not found.' };
  const request = oldRes[0];
  const oldVal = JSON.stringify(request);

  let newStatus: 'REJECTED' | 'RECEIVED' | 'APPROVED' | 'CLOSED' = 'APPROVED';
  if (resolutionType === 'Reject Claim') {
    newStatus = 'REJECTED';
  } else {
    newStatus = receivedStatus ? 'RECEIVED' : 'APPROVED';
  }

  try {
    await db.update(schema.returnRequests).set({
      status: newStatus
    }).where(eq(schema.returnRequests.id, returnRequestId));

    await db.insert(schema.returnResolutions).values({
      returnRequestId,
      resolutionType,
      remarks: remarks || null,
      resolvedBy: adminProfileId
    });

    const items = await db.select().from(schema.returnRequestItems).where(eq(schema.returnRequestItems.returnRequestId, returnRequestId));

    if (receivedStatus && resolutionType !== 'Reject Claim') {
      for (const item of items) {
        if (item.variantId) {
          let transactionType: 'STOCK_IN' | 'DAMAGE_REPAIRABLE' | 'DAMAGE_NON_REPAIRABLE' = 'STOCK_IN';
          if (receivedStatus === 'REPAIRABLE') {
            transactionType = 'DAMAGE_REPAIRABLE';
          } else if (receivedStatus === 'SCRAP') {
            transactionType = 'DAMAGE_NON_REPAIRABLE';
          }

          // Create stock request first
          const reqRes = await db.insert(schema.stockRequests).values({
            variantId: item.variantId,
            requestType: transactionType,
            quantity: item.quantity,
            referenceNumber: request.returnNumber,
            remarks: `Return request Resolution: ${resolutionType}`,
            createdBy: adminProfileId,
            status: 'APPROVED',
            reviewedBy: adminProfileId,
            reviewedAt: new Date()
          }).returning();

          const reqObj = reqRes[0];

          // Post stock transaction
          await db.insert(schema.stockTransactions).values({
            requestId: reqObj.id,
            variantId: item.variantId,
            transactionType,
            quantity: item.quantity,
            referenceNumber: request.returnNumber,
            invoiceNumber: request.invoiceNumber || null,
            remarks: `Returned items received as ${receivedStatus}. Resolution: ${resolutionType}`,
            createdBy: adminProfileId
          });
        }
      }
    }

    if (resolutionType === 'Credit Note') {
      let creditAmount = 0;
      for (const item of items) {
        if (item.variantId) {
          const variants = await db.select().from(schema.productVariants).where(eq(schema.productVariants.id, item.variantId)).limit(1);
          if (variants.length > 0) {
            creditAmount += Number(variants[0].wholesalePrice) * item.quantity;
          }
        }
      }

      if (creditAmount > 0) {
        const ledger = await db.select()
          .from(schema.customerLedger)
          .where(eq(schema.customerLedger.customerId, request.customerId))
          .orderBy(desc(schema.customerLedger.createdAt))
          .limit(1);

        const lastBal = ledger.length > 0 ? Number(ledger[0].runningBalance) : 0;
        const runningBalance = lastBal - creditAmount;

        await db.insert(schema.customerLedger).values({
          customerId: request.customerId,
          date: new Date(),
          referenceType: 'PAYMENT',
          referenceId: returnRequestId,
          debitAmount: '0.00',
          creditAmount: String(creditAmount),
          runningBalance: String(runningBalance),
          description: `Credit Note issued for Return Request ${request.returnNumber}`
        });
      }
    }

    if (newStatus !== 'REJECTED') {
      await db.update(schema.returnRequests).set({
        status: 'CLOSED'
      }).where(eq(schema.returnRequests.id, returnRequestId));
    }

    await db_logB2BAuditDetailed(adminProfileId, 'RETURN_RESOLVE', 'B2B_RETURNS', `Resolved return request ${request.returnNumber} as ${resolutionType}`, oldVal, JSON.stringify(request));

    return { success: true };
  } catch (err: any) {
    console.error('Failed to resolve return request:', err);
    return { success: false, error: err.message || 'Database transaction error.' };
  }
}

// =============================================================================
// REPORTING BY BRANCH
// =============================================================================
async function db_getB2BBranchReporting(): Promise<any> {
  const customersList = await db.select().from(schema.customers);
  const customerReporting: any[] = [];

  for (const cust of customersList) {
    const ledger = await db.select()
      .from(schema.customerLedger)
      .where(eq(schema.customerLedger.customerId, cust.id))
      .orderBy(desc(schema.customerLedger.createdAt))
      .limit(1);

    const outstanding = ledger.length > 0 ? Number(ledger[0].runningBalance) : 0;

    const orders = await db.select()
      .from(schema.salesOrders)
      .where(and(eq(schema.salesOrders.customerId, cust.id), sql`${schema.salesOrders.status} != 'CANCELLED'`));

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    customerReporting.push({
      customerId: cust.id,
      companyName: cust.companyName,
      revenue,
      outstanding,
      orderCount: orders.length
    });
  }

  const branchesList = await db.select().from(schema.customerBranches);
  const branchReporting: any[] = [];

  for (const branch of branchesList) {
    const cust = customersList.find(c => c.id === branch.customerId);
    const orders = await db.select()
      .from(schema.salesOrders)
      .where(and(eq(schema.salesOrders.branchId, branch.id), sql`${schema.salesOrders.status} != 'CANCELLED'`));

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    let outstanding = 0;
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const invoicesList = await db.select()
        .from(schema.invoices)
        .where(and(inArray(schema.invoices.orderId, orderIds), sql`${schema.invoices.status} != 'PAID'`));
      
      outstanding = invoicesList.reduce((sum, inv) => sum + Number(inv.amount), 0);
    }

    branchReporting.push({
      branchId: branch.id,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      companyName: cust ? cust.companyName : 'Unknown',
      revenue,
      orderCount: orders.length,
      outstanding
    });
  }

  return {
    customerReporting,
    branchReporting
  };
}

// =============================================================================
// OFFLINE MOCK WRAPPERS
// =============================================================================

export async function logB2BAudit(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.logB2BAudit as any)(...args);
  }
  return (db_logB2BAudit as any)(...args);
}

export async function getCustomers(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getCustomers as any)(...args);
  }
  return (db_getCustomers as any)(...args);
}

export async function createCustomer(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createCustomer as any)(...args);
  }
  return (db_createCustomer as any)(...args);
}

export async function updateCustomer(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.updateCustomer as any)(...args);
  }
  return (db_updateCustomer as any)(...args);
}

export async function getCustomerUsers(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getCustomerUsers as any)(...args);
  }
  return (db_getCustomerUsers as any)(...args);
}

export async function createCustomerUser(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createCustomerUser as any)(...args);
  }
  return (db_createCustomerUser as any)(...args);
}

export async function getCustomerPricing(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getCustomerPricing as any)(...args);
  }
  return (db_getCustomerPricing as any)(...args);
}

export async function setCustomerPricing(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.setCustomerPricing as any)(...args);
  }
  return (db_setCustomerPricing as any)(...args);
}

export async function deleteCustomerPricing(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.deleteCustomerPricing as any)(...args);
  }
  return (db_deleteCustomerPricing as any)(...args);
}

export async function getB2BCatalog(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getB2BCatalog as any)(...args);
  }
  return (db_getB2BCatalog as any)(...args);
}

export async function createB2BNotification(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createB2BNotification as any)(...args);
  }
  return (db_createB2BNotification as any)(...args);
}

export async function getNotifications(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getNotifications as any)(...args);
  }
  return (db_getNotifications as any)(...args);
}

export async function markNotificationsAsRead(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.markNotificationsAsRead as any)(...args);
  }
  return (db_markNotificationsAsRead as any)(...args);
}

export async function getSalesOrders(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getSalesOrders as any)(...args);
  }
  return (db_getSalesOrders as any)(...args);
}

export async function getSalesOrderDetails(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getSalesOrderDetails as any)(...args);
  }
  return (db_getSalesOrderDetails as any)(...args);
}

export async function createSalesOrder(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createSalesOrder as any)(...args);
  }
  return (db_createSalesOrder as any)(...args);
}

export async function approveSalesOrder(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.approveSalesOrder as any)(...args);
  }
  return (db_approveSalesOrder as any)(...args);
}

export async function rejectSalesOrder(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.rejectSalesOrder as any)(...args);
  }
  return (db_rejectSalesOrder as any)(...args);
}

export async function getDispatches(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getDispatches as any)(...args);
  }
  return (db_getDispatches as any)(...args);
}

export async function createDispatch(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createDispatch as any)(...args);
  }
  return (db_createDispatch as any)(...args);
}

export async function getInvoices(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getInvoices as any)(...args);
  }
  return (db_getInvoices as any)(...args);
}

export async function createInvoice(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createInvoice as any)(...args);
  }
  return (db_createInvoice as any)(...args);
}

export async function getPaymentReferences(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getPaymentReferences as any)(...args);
  }
  return (db_getPaymentReferences as any)(...args);
}

export async function submitPaymentReference(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.submitPaymentReference as any)(...args);
  }
  return (db_submitPaymentReference as any)(...args);
}

export async function verifyPaymentReference(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.verifyPaymentReference as any)(...args);
  }
  return (db_verifyPaymentReference as any)(...args);
}

export async function rejectPaymentReference(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.rejectPaymentReference as any)(...args);
  }
  return (db_rejectPaymentReference as any)(...args);
}

export async function getCustomerLedger(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getCustomerLedger as any)(...args);
  }
  return (db_getCustomerLedger as any)(...args);
}

export async function getB2BAdminStats(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getB2BAdminStats as any)(...args);
  }
  return (db_getB2BAdminStats as any)(...args);
}

export async function getAllPricingOverrides(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getAllPricingOverrides as any)(...args);
  }
  const { customerPricing } = await import('@/db/schema');
  const res = await db.select().from(customerPricing);
  return res.map(p => ({
    id: p.id,
    customerId: p.customerId,
    variantId: p.variantId,
    customPrice: Number(p.customPrice),
    createdAt: p.createdAt.toISOString()
  }));
}

export async function getCustomerBranches(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getCustomerBranches as any)(...args);
  }
  return (db_getCustomerBranches as any)(...args);
}

export async function createCustomerBranch(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createCustomerBranch as any)(...args);
  }
  return (db_createCustomerBranch as any)(...args);
}

export async function updateCustomerBranch(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.updateCustomerBranch as any)(...args);
  }
  return (db_updateCustomerBranch as any)(...args);
}

export async function createSalesOrderOnBehalf(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createSalesOrderOnBehalf as any)(...args);
  }
  return (db_createSalesOrderOnBehalf as any)(...args);
}

export async function convertCustomItemToSKU(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.convertCustomItemToSKU as any)(...args);
  }
  return (db_convertCustomItemToSKU as any)(...args);
}

export async function getReturnRequests(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getReturnRequests as any)(...args);
  }
  return (db_getReturnRequests as any)(...args);
}

export async function createReturnRequest(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.createReturnRequest as any)(...args);
  }
  return (db_createReturnRequest as any)(...args);
}

export async function resolveReturnRequest(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.resolveReturnRequest as any)(...args);
  }
  return (db_resolveReturnRequest as any)(...args);
}

export async function getB2BBranchReporting(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.getB2BBranchReporting as any)(...args);
  }
  return (db_getB2BBranchReporting as any)(...args);
}

export async function logB2BAuditDetailed(...args: any[]) {
  if (!db) {
    const { jsonDb } = await import('./jsonDb');
    return (jsonDb.logB2BAuditDetailed as any)(...args);
  }
  return (db_logB2BAuditDetailed as any)(...args);
}

