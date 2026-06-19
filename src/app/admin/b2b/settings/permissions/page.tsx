// src/app/admin/b2b/settings/permissions/page.tsx
import { getSession } from '@/utils/session';
import { getRoles, getPermissions, getRolePermissions } from '@/utils/db';
import Navigation from '@/components/Navigation';
import { redirect } from 'next/navigation';

export const revalidate = 0;

// Standard permission groupings for display purposes
const PERMISSION_GROUPS = [
  {
    name: 'Products & Variants Catalog',
    keys: ['VIEW_PRODUCT_CATALOGUE', 'VIEW_PRODUCT', 'CREATE_PRODUCT', 'EDIT_PRODUCT', 'DELETE_PRODUCT', 'BULK_DELETE_PRODUCT', 'RESTORE_PRODUCT']
  },
  {
    name: 'Inventory & Warehouse Operations',
    keys: ['VIEW_INVENTORY', 'SEARCH_INVENTORY', 'VIEW_STOCK_LEVEL', 'VIEW_AVAILABLE_STOCK', 'CREATE_STOCK_IN_TXN', 'CREATE_STOCK_OUT_REQ', 'CREATE_DAMAGE_REQ', 'CREATE_REPAIR_REQ', 'CREATE_RETURN_INTAKE_REQ', 'MANAGE_INVENTORY', 'MANAGE_STOCK_REQUEST', 'APPROVE_STOCK_REQUEST', 'PRINT_LABEL']
  },
  {
    name: 'Sales Orders',
    keys: ['VIEW_ORDER', 'VIEW_APPROVED_ORDER', 'VIEW_CUSTOMER_ORDER', 'VIEW_COMPANY_ORDER', 'VIEW_COMPANY_BRANCH_ORDER', 'CREATE_ORDER', 'CREATE_ORDER_BEHALF', 'APPROVE_ORDER', 'REJECT_ORDER', 'MODIFY_ORDER_QTY', 'ADD_CUSTOM_ITEM']
  },
  {
    name: 'Dispatches & Logistics',
    keys: ['VIEW_DISPATCH', 'CREATE_DISPATCH', 'UPDATE_DISPATCH_STATUS']
  },
  {
    name: 'Invoices, Receipts & Ledger',
    keys: ['VIEW_INVOICE', 'GENERATE_INVOICE', 'UPLOAD_INVOICE_PDF', 'MANAGE_CUSTOMER_LEDGER', 'VIEW_OUTSTANDING_AMOUNT', 'VIEW_CUSTOMER_STATEMENT', 'VIEW_STATEMENT']
  },
  {
    name: 'Payments Proof & Review',
    keys: ['UPLOAD_PAYMENT_REF', 'VERIFY_PAYMENT_REF', 'VERIFY_PAYMENT', 'MARK_PAYMENT_RECEIVED']
  },
  {
    name: 'Returns & Defect Management',
    keys: ['VIEW_RETURN_REQUEST', 'CREATE_RETURN', 'APPROVE_RETURN', 'REJECT_RETURN']
  },
  {
    name: 'Pricing Rules',
    keys: ['VIEW_CUSTOMER_PRICING', 'VIEW_CUSTOMER_SPECIFIC_PRICING', 'MANAGE_CUSTOMER_PRICING']
  },
  {
    name: 'Security & System Controls',
    keys: ['MANAGE_USER', 'MANAGE_CUSTOMER', 'MANAGE_CUSTOMER_BRANCH', 'MANAGE_CUSTOMER_LOGIN', 'CREATE_BRANCH_USER', 'EDIT_BRANCH_USER', 'DISABLE_BRANCH_USER', 'VIEW_AUDIT_LOG', 'ACCESS_ALL_MODULES']
  }
];

export default async function PermissionMatrixPage() {
  const user = await getSession();
  if (!user || user.role !== 'SUPERADMIN') {
    redirect('/login');
  }

  // Load RBAC settings dynamically from database (or mock fallbacks)
  const dbRoles = await getRoles();
  const dbPermissions = await getPermissions();
  const dbRolePermissions = await getRolePermissions();

  // Create mappings for fast lookup
  const roleMap = dbRoles.reduce((acc: any, r: any) => {
    acc[r.id] = r.name;
    return acc;
  }, {});

  const permMap = dbPermissions.reduce((acc: any, p: any) => {
    acc[p.id] = p.code;
    return acc;
  }, {});

  // Build a set of permitted 'roleName:permissionCode' combinations
  const permittedSet = new Set<string>();
  for (const rp of dbRolePermissions) {
    const roleName = roleMap[rp.roleId];
    const permCode = permMap[rp.permissionId];
    if (roleName && permCode) {
      permittedSet.add(`${roleName}:${permCode}`);
    }
  }

  // Specific Roles columns in order of preference
  const rolesList = ['SUPERADMIN', 'INVENTORY_DEPARTMENT', 'ACCOUNTS_DEPARTMENT', 'CLIENT_ADMIN', 'CLIENT_BRANCH_USER'];
  const matchedRoles = dbRoles
    .filter((r: any) => rolesList.includes(r.name))
    .sort((a: any, b: any) => rolesList.indexOf(a.name) - rolesList.indexOf(b.name));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <Navigation user={user} />
      
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Access Permission Matrix</h1>
              <p className="text-slate-500 text-xs mt-1">
                Visualise roles and active permission mappings compiled dynamically from the security database.
              </p>
            </div>
            <div className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-300">
              Active Security Guard: CENTRAL_MIDDLEWARE
            </div>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <span className="font-bold">Information:</span> This matrix console is in <span className="font-semibold">Read-Only</span> mode. Mappings are seeded directly inside the database and are validated server-side during page renders, database queries, and middleware processing to achieve strict data isolation.
            </div>
          </div>
        </div>

        {/* Permission Grid Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3 min-w-[280px]">
                    Module &amp; Permission Codes
                  </th>
                  {matchedRoles.map((role: any) => (
                    <th key={role.id} className="p-4 text-xs font-black text-slate-800 tracking-tight text-center min-w-[140px]">
                      <div className="text-slate-900">{role.name.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Role Code: {role.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((group) => {
                  // Resolve permissions in database matching this group's keys
                  const groupPerms = dbPermissions.filter((p: any) => group.keys.includes(p.code));
                  if (groupPerms.length === 0) return null;

                  return (
                    <optgroup key={group.name} className="contents">
                      {/* Group Header Row */}
                      <tr className="bg-slate-100/70 border-y border-slate-200/60 font-semibold text-slate-700 text-xs">
                        <td colSpan={matchedRoles.length + 1} className="p-3 pl-4 font-black tracking-tight text-slate-800">
                          {group.name}
                        </td>
                      </tr>
                      {groupPerms.map((perm: any) => (
                        <tr key={perm.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-mono text-xs text-slate-700 font-semibold">{perm.code}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">Enforced validation key</div>
                          </td>
                          {matchedRoles.map((role: any) => {
                            const isPermitted = permittedSet.has(`${role.name}:${perm.code}`);
                            return (
                              <td key={role.id} className="p-4 text-center">
                                {isPermitted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Allowed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-slate-300">
                                    &mdash;
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </optgroup>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
