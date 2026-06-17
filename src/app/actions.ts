'use server';

import { 
  authenticateUser, 
  clearSession, 
  getSession 
} from '@/utils/session';
import { 
  createCustomer, 
  createCustomerUser, 
  setCustomerPricing, 
  deleteCustomerPricing,
  createSalesOrder, 
  approveSalesOrder, 
  rejectSalesOrder,
  createDispatch,
  createInvoice,
  submitPaymentReference,
  verifyPaymentReference,
  rejectPaymentReference,
  markNotificationsAsRead,
  updateCustomer,
  getSalesOrderDetails,
  getCustomerBranches,
  createCustomerBranch,
  updateCustomerBranch,
  createSalesOrderOnBehalf,
  convertCustomItemToSKU,
  getReturnRequests,
  createReturnRequest,
  resolveReturnRequest,
  getB2BCatalog
} from '@/utils/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// =============================================================================
// LOGIN & LOGOUT ACTIONS
// =============================================================================
export async function loginAction(prevState: any, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const usernameOrEmail = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();

  if (!usernameOrEmail || !password) {
    return { success: false, error: 'Username or Email and password are required.' };
  }

  const session = await authenticateUser(usernameOrEmail, password);
  if (!session) {
    return { success: false, error: 'Invalid credentials. Please verify your inputs.' };
  }

  return { success: true, message: 'Authentication successful!' };
}

export async function logoutAction() {
  await clearSession();
  revalidatePath('/');
}

// =============================================================================
// ADMIN: CUSTOMER & PRICING ACTIONS (SUPERADMIN ONLY)
// =============================================================================
const CustomerSchema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional()
});

export async function createCustomerAction(prevState: any, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied! SuperAdmin authority is required.' };
  }

  const emailRaw = formData.get('email') as string || '';
  const rawData = {
    companyName: formData.get('companyName') as string || '',
    phone: formData.get('phone') as string || '',
    email: emailRaw ? emailRaw.trim().toLowerCase() : '',
    billingAddress: formData.get('billingAddress') as string || '',
    shippingAddress: formData.get('shippingAddress') as string || ''
  };

  const parsed = CustomerSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const newCust = await createCustomer(parsed.data);
    
    // Onboarding branch registry processing
    const branchesJson = formData.get('branchesJson') as string;
    if (branchesJson) {
      try {
        const branches = JSON.parse(branchesJson);
        if (Array.isArray(branches)) {
          for (const br of branches) {
            if (br.branchName && br.branchCode) {
              await createCustomerBranch(newCust.id, {
                branchName: br.branchName,
                branchCode: br.branchCode,
                contactPerson: br.contactPerson || null,
                phone: br.phone || null,
                email: br.email || null,
                gst: br.gst || null,
                billingAddress: br.billingAddress || parsed.data.billingAddress || null,
                shippingAddress: br.shippingAddress || parsed.data.shippingAddress || null
              });
            }
          }
        }
      } catch (errJson) {
        console.error('Failed to parse branchesJson in onboarding:', errJson);
      }
    }

    revalidatePath('/admin/b2b/customers');
    return { success: true, message: `Customer "${parsed.data.companyName}" successfully registered!` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Customer registration failed.' };
  }
}

export async function updateCustomerStatusAction(customerId: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied!' };
  }

  try {
    await updateCustomer(customerId, { active });
    revalidatePath('/admin/b2b/customers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCustomerUserAction(prevState: any, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied!' };
  }

  const customerId = formData.get('customerId') as string;
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();
  const fullName = (formData.get('fullName') as string || '').trim();
  const email = (formData.get('email') as string || '').trim().toLowerCase();

  if (!customerId || !username || !password || !fullName || !email) {
    return { success: false, error: 'All fields are required.' };
  }

  // Hash password
  const { hashPassword } = await import('@/utils/session');
  const passwordHash = hashPassword(password);

  try {
    await createCustomerUser(customerId, username, passwordHash, fullName, email);
    revalidatePath('/admin/b2b/customers');
    return { success: true, message: 'Portal login user successfully registered!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create user.' };
  }
}

export async function setCustomerPricingAction(customerId: string, variantId: string, customPrice: number): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied!' };
  }

  if (customPrice < 0) return { success: false, error: 'Price must be non-negative.' };

  try {
    await setCustomerPricing(customerId, variantId, customPrice);
    revalidatePath('/admin/b2b/customers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomerPricingAction(pricingId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied!' };
  }

  try {
    await deleteCustomerPricing(pricingId);
    revalidatePath('/admin/b2b/customers');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// CUSTOMER: CART & ORDER ACTIONS
// =============================================================================
export async function createOrderAction(branchId: string, items: { variantId: string; quantity: number }[], remarks?: string): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    return { success: false, error: 'Session expired or invalid. Please login as B2B Customer.' };
  }

  if (!branchId) {
    return { success: false, error: 'Branch selection is required.' };
  }

  try {
    const res = await createSalesOrder(user.customerId, branchId, user.id, items, remarks);
    if (!res.success) return { success: false, error: res.error };
    
    revalidatePath('/b2b/orders');
    revalidatePath('/b2b');
    return { success: true, message: `Order ${res.order?.orderNumber} created successfully!` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Order submission failed.' };
  }
}

// =============================================================================
// ADMIN: ORDER APPROVAL ACTIONS (SUPERADMIN ONLY)
// =============================================================================
export async function approveOrderAction(
  orderId: string, 
  adjustments: { itemId: string; approvedQty: number; replacedVariantId?: string; reject?: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied! SuperAdmin authority is required.' };
  }

  try {
    const res = await approveSalesOrder(orderId, user.id, adjustments);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/orders');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied!' };
  }

  try {
    const res = await rejectSalesOrder(orderId, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/orders');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// ADMIN: DISPATCH ACTIONS (INVENTORY ONLY)
// =============================================================================
export async function createDispatchAction(
  orderId: string, 
  courier: string, 
  trackingNumber: string, 
  remarks: string,
  items: { itemId: string; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'INVENTORY')) {
    return { success: false, error: 'Access denied! Inventory Dept authorization required.' };
  }

  try {
    const res = await createDispatch(orderId, courier, trackingNumber, remarks, items, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/dispatches');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// ADMIN: INVOICE ACTIONS (ACCOUNTS ONLY)
// =============================================================================
export async function createInvoiceAction(
  orderId: string,
  invoiceNumber: string,
  amount: number,
  dueDateStr: string,
  invoicePdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS')) {
    return { success: false, error: 'Access denied! Accounts Dept authorization required.' };
  }

  if (!invoiceNumber || amount <= 0 || !dueDateStr) {
    return { success: false, error: 'All fields must be provided correctly.' };
  }

  try {
    const res = await createInvoice(orderId, invoiceNumber, amount, new Date(dueDateStr), invoicePdfUrl, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/invoices');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// CUSTOMER: SUBMIT PAYMENT REFERENCE
// =============================================================================
export async function submitPaymentAction(
  invoiceId: string | undefined,
  paymentDateStr: string,
  amount: number,
  paymentMode: 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH',
  referenceNumber: string,
  utrNumber: string,
  notes: string,
  attachmentUrl: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    return { success: false, error: 'Session expired. Please login again.' };
  }

  if (amount <= 0 || !paymentDateStr || !utrNumber) {
    return { success: false, error: 'Amount, date, and UTR number are required.' };
  }

  try {
    const res = await submitPaymentReference(
      user.customerId,
      invoiceId,
      new Date(paymentDateStr),
      amount,
      paymentMode,
      referenceNumber,
      utrNumber,
      notes,
      attachmentUrl
    );
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/b2b/payments');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// ADMIN: VERIFY / REJECT PAYMENT
// =============================================================================
export async function verifyPaymentAction(paymentRefId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS')) {
    return { success: false, error: 'Access denied! Accounts Dept validation required.' };
  }

  try {
    const res = await verifyPaymentReference(paymentRefId, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/payments');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectPaymentAction(paymentRefId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS')) {
    return { success: false, error: 'Access denied!' };
  }

  if (!reason.trim()) return { success: false, error: 'Rejection reason is required.' };

  try {
    const res = await rejectPaymentReference(paymentRefId, reason, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/payments');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// NOTIFICATION DISMISS
// =============================================================================
export async function dismissNotificationsAction(): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'B2B_CUSTOMER' || !user.customerId) {
    return { success: false, error: 'Session expired.' };
  }

  try {
    await markNotificationsAsRead(user.customerId);
    revalidatePath('/b2b/notifications');
    revalidatePath('/b2b');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOrderDetailsAction(orderId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const user = await getSession();
  if (!user) return { success: false, error: 'Session expired.' };

  try {
    const details = await getSalesOrderDetails(orderId);
    if (!details) return { success: false, error: 'Order not found.' };

    // Strict validation: B2B customers cannot query other customers' orders
    if (user.role === 'B2B_CUSTOMER' && details.order.customerId !== user.customerId) {
      return { success: false, error: 'Permission Denied! This order does not belong to your account.' };
    }

    return { success: true, data: details };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retrieve details.' };
  }
}

// =============================================================================
// BRANCH MANAGEMENT ACTIONS
// =============================================================================
export async function createBranchAction(
  customerId: string,
  branchData: any
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user) {
    return { success: false, error: 'Session expired.' };
  }

  if (user.role === 'B2B_CUSTOMER' && user.customerId !== customerId) {
    return { success: false, error: 'Permission Denied.' };
  }

  try {
    await createCustomerBranch(customerId, branchData);
    revalidatePath('/admin/b2b/customers');
    revalidatePath('/b2b');
    return { success: true, message: 'Branch created successfully!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create branch.' };
  }
}

// =============================================================================
// ON-BEHALF ORDER CREATION
// =============================================================================
export async function createOrderOnBehalfAction(
  customerId: string,
  branchId: string,
  sourceId: string,
  items: { variantId: string; quantity: number }[],
  customItems: any[],
  remarks?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied! SuperAdmin authority is required.' };
  }

  try {
    const res = await createSalesOrderOnBehalf(customerId, branchId, sourceId, user.id, items, customItems, remarks);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/orders');
    return { success: true, message: `Order ${res.order?.orderNumber} created successfully on behalf of customer.` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create order on behalf.' };
  }
}

// =============================================================================
// CONVERT CUSTOM ITEM TO SKU
// =============================================================================
export async function convertCustomItemAction(
  customItemId: string,
  variantData: { sku: string; category: string; colorName: string; sizeName: string; costPrice: number }
): Promise<{ success: boolean; error?: string; variantId?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    return { success: false, error: 'Access denied! SuperAdmin authority is required.' };
  }

  try {
    const res = await convertCustomItemToSKU(customItemId, variantData, user.id);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/admin/b2b/orders');
    return { success: true, variantId: res.variantId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to convert custom item.' };
  }
}

// =============================================================================
// RETURNS WORKFLOW ACTIONS
// =============================================================================
export async function createReturnRequestAction(
  data: {
    customerId: string;
    branchId?: string;
    orderId?: string;
    invoiceNumber?: string;
    reason: 'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER';
    remarks?: string;
    items: { variantId?: string; customItemName?: string; quantity: number }[];
    photos?: string[];
  }
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user) {
    return { success: false, error: 'Session expired.' };
  }

  const createdByType = user.role === 'B2B_CUSTOMER' ? 'CUSTOMER' : 'ADMIN';

  if (user.role === 'B2B_CUSTOMER' && user.customerId !== data.customerId) {
    return { success: false, error: 'Permission Denied.' };
  }

  try {
    const res = await createReturnRequest({
      ...data,
      createdBy: user.id,
      createdByType
    });
    if (!res.success) return { success: false, error: 'Failed to create return request.' };

    revalidatePath('/b2b/returns');
    revalidatePath('/admin/b2b/returns');
    revalidatePath('/b2b');
    return { success: true, message: `Return request ${res.returnRequest?.returnNumber} created successfully!` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit return request.' };
  }
}

export async function resolveReturnRequestAction(
  returnRequestId: string,
  resolutionType: 'Replace' | 'Credit Note' | 'Refund' | 'Repair' | 'Reject Claim',
  remarks: string,
  receivedStatus: 'READY_STOCK' | 'REPAIRABLE' | 'SCRAP' | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ACCOUNTS' && user.role !== 'INVENTORY')) {
    return { success: false, error: 'Access denied!' };
  }

  try {
    const res = await resolveReturnRequest(returnRequestId, resolutionType, remarks, receivedStatus, user.id);
    if (!res.success) return { success: false, error: res.error };

    revalidatePath('/admin/b2b/returns');
    revalidatePath('/b2b/returns');
    revalidatePath('/b2b');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve return request.' };
  }
}

export async function getB2BCatalogAction(customerId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const user = await getSession();
  if (!user) return { success: false, error: 'Session expired.' };

  try {
    const data = await getB2BCatalog(customerId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
