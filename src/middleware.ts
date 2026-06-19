// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROUTE_PERMISSIONS = [
  { prefix: '/admin/b2b/customers', permissions: ['MANAGE_CUSTOMER'] },
  { prefix: '/admin/b2b/payments', permissions: ['VERIFY_PAYMENT_REF', 'VERIFY_PAYMENT'] },
  { prefix: '/admin/b2b/dispatches', permissions: ['CREATE_DISPATCH', 'UPDATE_DISPATCH_STATUS'] },
  { prefix: '/admin/b2b/invoices', permissions: ['GENERATE_INVOICE', 'UPLOAD_INVOICE_PDF'] },
  { prefix: '/admin/b2b/orders', permissions: ['VIEW_ORDER', 'VIEW_APPROVED_ORDER', 'VIEW_CUSTOMER_ORDER'] },
  { prefix: '/admin/b2b/returns', permissions: ['VIEW_RETURN_REQUEST', 'APPROVE_RETURN', 'REJECT_RETURN'] },
  { prefix: '/admin/b2b/settings/permissions', permissions: ['VIEW_AUDIT_LOG'] },
  
  { prefix: '/b2b/catalog', permissions: ['VIEW_PRODUCT_CATALOGUE'] },
  { prefix: '/b2b/orders', permissions: ['VIEW_COMPANY_ORDER', 'VIEW_COMPANY_BRANCH_ORDER', 'CREATE_ORDER'] },
  { prefix: '/b2b/returns', permissions: ['CREATE_RETURN'] },
  { prefix: '/b2b/payments', permissions: ['UPLOAD_PAYMENT_REF'] },
  { prefix: '/b2b/invoices', permissions: ['VIEW_INVOICE'] },
  { prefix: '/b2b/dispatches', permissions: ['VIEW_DISPATCH'] },
  { prefix: '/b2b/ledger', permissions: ['VIEW_STATEMENT'] },
  { prefix: '/b2b/documents', permissions: ['VIEW_STATEMENT', 'VIEW_INVOICE'] },
  { prefix: '/b2b/users', permissions: ['CREATE_BRANCH_USER'] }
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Only protect admin/b2b and client/b2b routes
  if (!path.startsWith('/admin/b2b') && !path.startsWith('/b2b')) {
    return NextResponse.next();
  }

  const cookieVal = request.cookies.get('ljk_user')?.value;
  if (!cookieVal) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  let session: any = null;
  try {
    // Attempt base64 JSON parsing
    const decoded = atob(cookieVal);
    session = JSON.parse(decoded);
  } catch (err) {
    // Legacy cookie value (plain username or UUID)
    // Redirect to login to refresh session with secure base64 RBAC data
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  if (!session || !session.role) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role;
  const userPermissions: string[] = session.permissions || [];

  // Group boundary check:
  // 1. Client users cannot access factory admin pages
  if (path.startsWith('/admin/b2b')) {
    if (role === 'CLIENT_ADMIN' || role === 'CLIENT_BRANCH_USER') {
      await logDeny(request, session, path);
      return renderForbidden();
    }
  }

  // 2. Factory users cannot access client order portal pages
  if (path.startsWith('/b2b')) {
    if (role === 'SUPERADMIN' || role === 'INVENTORY_DEPARTMENT' || role === 'ACCOUNTS_DEPARTMENT') {
      await logDeny(request, session, path);
      return renderForbidden();
    }
  }

  // Check specific route permissions
  for (const route of ROUTE_PERMISSIONS) {
    if (path.startsWith(route.prefix)) {
      const hasPerm = role === 'SUPERADMIN' || route.permissions.some(p => userPermissions.includes(p));
      if (!hasPerm) {
        await logDeny(request, session, path);
        return renderForbidden();
      }
    }
  }

  return NextResponse.next();
}

async function logDeny(request: NextRequest, session: any, path: string) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    // POST request to backend Node API for logging to database
    const apiURL = new URL('/api/audit-log', request.url);
    await fetch(apiURL.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: session.id,
        username: session.username,
        role: session.role,
        action: 'PERMISSION_DENIED',
        module: 'RBAC_MIDDLEWARE',
        description: `Permission denied attempt to access page route: ${path}`,
        ipAddress: ip,
        entity: 'Route'
      })
    });
  } catch (err) {
    console.error('Failed to log deny attempt:', err);
  }
}

function renderForbidden() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>403 - Forbidden Access</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f9fafb;
            color: #1f2937;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
            text-align: center;
            max-width: 480px;
            width: 90%;
            border: 1px solid #f3f4f6;
          }
          .icon-wrapper {
            background-color: #fee2e2;
            color: #ef4444;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem auto;
          }
          .icon-wrapper svg {
            width: 32px;
            height: 32px;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0 0 0.75rem 0;
          }
          p {
            font-size: 0.95rem;
            line-height: 1.5;
            color: #4b5563;
            margin: 0 0 2rem 0;
          }
          .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }
          a, button {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.2s;
            cursor: pointer;
            border: none;
          }
          .btn-primary {
            background-color: #1e3a8a;
            color: white;
          }
          .btn-primary:hover {
            background-color: #172554;
          }
          .btn-secondary {
            background-color: #f3f4f6;
            color: #4b5563;
          }
          .btn-secondary:hover {
            background-color: #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h1>403 - Access Denied</h1>
          <p>You do not have permission to access this page. Your attempt has been logged under audit security guidelines.</p>
          <div class="actions">
            <a href="/login" class="btn-primary">Sign In</a>
            <button onclick="window.history.back()" class="btn-secondary">Go Back</button>
          </div>
        </div>
      </body>
    </html>`,
    {
      status: 403,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

export const config = {
  matcher: ['/admin/b2b/:path*', '/b2b/:path*']
};
