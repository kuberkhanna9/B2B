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
  getB2BCatalog,
  getBranchUsers,
  createBranchUser,
  updateBranchUser
} from '@/utils/db';
import { checkPermission } from '@/utils/rbac';
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER_LOGIN')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER_PRICING')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER_PRICING')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'CREATE_ORDER') || !user.customerId) {
    return { success: false, error: 'Session expired or invalid permissions. Please login as B2B Customer.' };
  }

  if (!branchId) {
    return { success: false, error: 'Branch selection is required.' };
  }

  // Branch level security validation
  if (user.role === 'CLIENT_BRANCH_USER' && user.branchId !== branchId) {
    return { success: false, error: 'Access denied: Cannot place order for another branch.' };
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
  if (!user || !checkPermission(user, 'APPROVE_ORDER')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'REJECT_ORDER')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'CREATE_DISPATCH')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'GENERATE_INVOICE')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'UPLOAD_PAYMENT_REF') || !user.customerId) {
    return { success: false, error: 'Session expired or invalid permissions. Please login.' };
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
  if (!user || !checkPermission(user, 'VERIFY_PAYMENT_REF')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'VERIFY_PAYMENT_REF')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !user.customerId || (user.role !== 'CLIENT_ADMIN' && user.role !== 'CLIENT_BRANCH_USER')) {
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

    // Validation boundary based on role and permissions
    if (user.role === 'CLIENT_ADMIN') {
      if (details.order.customerId !== user.customerId) {
        return { success: false, error: 'Permission Denied! This order does not belong to your company.' };
      }
    } else if (user.role === 'CLIENT_BRANCH_USER') {
      if (details.order.customerId !== user.customerId || details.order.branchId !== user.branchId) {
        return { success: false, error: 'Permission Denied! This order does not belong to your assigned branch.' };
      }
    } else {
      // Factory users: require VIEW_ORDER permission
      if (!checkPermission(user, 'VIEW_ORDER') && !checkPermission(user, 'VIEW_CUSTOMER_ORDER') && !checkPermission(user, 'VIEW_APPROVED_ORDER')) {
        return { success: false, error: 'Permission Denied! Missing required permissions.' };
      }
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
  if (!user || !checkPermission(user, 'MANAGE_CUSTOMER_BRANCH')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'CREATE_ORDER_BEHALF')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'CREATE_PRODUCT')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
    id?: string;
    customerId: string;
    branchId?: string;
    orderId?: string;
    invoiceNumber?: string;
    reason: 'DEFECTIVE' | 'SOR_RETURN' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'CUSTOMER_REJECTION' | 'TRANSIT_DAMAGE' | 'SIZE_ISSUE' | 'OTHER' | 'COLOUR_ISSUE' | 'SHORT_QUANTITY' | 'CUSTOMER_CANCELLATION';
    remarks?: string;
    items: { variantId?: string; customItemName?: string; quantity: number }[];
    photos?: string[];
    attachments?: { fileUrl: string; fileName: string; fileType: string }[];
  }
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user || !checkPermission(user, 'CREATE_RETURN')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
  }

  const createdByType = (user.role === 'CLIENT_ADMIN' || user.role === 'CLIENT_BRANCH_USER') ? 'CUSTOMER' : 'ADMIN';

  // Isolation Checks
  if (user.role === 'CLIENT_ADMIN' && user.customerId !== data.customerId) {
    return { success: false, error: 'Permission Denied! Customer mismatch.' };
  }
  if (user.role === 'CLIENT_BRANCH_USER') {
    if (user.customerId !== data.customerId || user.branchId !== data.branchId) {
      return { success: false, error: 'Permission Denied! Branch or customer mismatch.' };
    }
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
  if (!user || !checkPermission(user, 'APPROVE_RETURN')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
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
  if (!user || !checkPermission(user, 'VIEW_PRODUCT_CATALOGUE')) {
    return { success: false, error: 'Access denied! Missing required permissions.' };
  }

  try {
    const data = await getB2BCatalog(user.customerId || customerId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// CLIENT ADMIN USER MANAGEMENT ACTIONS
// =============================================================================
export async function getBranchUsersAction(customerId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const user = await getSession();
  if (!user) return { success: false, error: 'Session expired.' };

  let targetCustomerId = customerId;
  if (user.role === 'CLIENT_ADMIN') {
    targetCustomerId = user.customerId;
  } else if (user.role === 'CLIENT_BRANCH_USER') {
    return { success: false, error: 'Access denied! Branch users cannot manage other users.' };
  } else {
    if (!checkPermission(user, 'MANAGE_USER') && !checkPermission(user, 'MANAGE_CUSTOMER')) {
      return { success: false, error: 'Access denied!' };
    }
  }

  try {
    const data = await getBranchUsers(targetCustomerId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBranchUserAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, error: 'Session expired.' };

  const customerId = formData.get('customerId') as string;
  const branchId = formData.get('branchId') as string;
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();
  const fullName = (formData.get('fullName') as string || '').trim();
  const email = (formData.get('email') as string || '').trim().toLowerCase();

  // Isolation & Permission check:
  if (user.role === 'CLIENT_ADMIN') {
    if (user.customerId !== customerId) {
      return { success: false, error: 'Permission Denied! Cannot manage another customer.' };
    }
    if (!checkPermission(user, 'CREATE_BRANCH_USER')) {
      return { success: false, error: 'Permission Denied! Missing CREATE_BRANCH_USER permission.' };
    }
  } else {
    if (!checkPermission(user, 'MANAGE_CUSTOMER') && !checkPermission(user, 'MANAGE_USER')) {
      return { success: false, error: 'Permission Denied.' };
    }
  }

  if (!customerId || !branchId || !username || !password || !fullName || !email) {
    return { success: false, error: 'All fields are required.' };
  }

  // Hash password
  const { hashPassword } = await import('@/utils/session');
  const passwordHash = hashPassword(password);

  try {
    await createBranchUser(customerId, branchId, username, passwordHash, fullName, email);
    revalidatePath('/admin/b2b/customers');
    revalidatePath('/b2b/settings/users');
    return { success: true, message: 'Branch login user successfully registered!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create branch user.' };
  }
}

export async function updateBranchUserAction(
  userId: string,
  data: { fullName?: string; email?: string; active?: boolean; password?: string; branchId?: string }
): Promise<{ success: boolean; error?: string }> {
  const user = await getSession();
  if (!user) return { success: false, error: 'Session expired.' };

  try {
    const branchUsersList = await getBranchUsers();
    const targetUser = branchUsersList.find((bu: any) => bu.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Branch user not found.' };
    }

    // Isolation & Permission check:
    if (user.role === 'CLIENT_ADMIN') {
      if (user.customerId !== targetUser.customerId) {
        return { success: false, error: 'Permission Denied! Access boundaries restricted.' };
      }
      if (data.active === false) {
        if (!checkPermission(user, 'DISABLE_BRANCH_USER')) {
          return { success: false, error: 'Permission Denied! Missing DISABLE_BRANCH_USER.' };
        }
      } else {
        if (!checkPermission(user, 'EDIT_BRANCH_USER')) {
          return { success: false, error: 'Permission Denied! Missing EDIT_BRANCH_USER.' };
        }
      }
    } else {
      if (!checkPermission(user, 'MANAGE_CUSTOMER') && !checkPermission(user, 'MANAGE_USER')) {
        return { success: false, error: 'Permission Denied.' };
      }
    }

    const updateData: any = { ...data };
    if (data.password) {
      const { hashPassword } = await import('@/utils/session');
      updateData.passwordHash = hashPassword(data.password);
      delete updateData.password;
    }

    await updateBranchUser(userId, updateData);
    revalidatePath('/admin/b2b/customers');
    revalidatePath('/b2b/settings/users');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update branch user.' };
  }
}
