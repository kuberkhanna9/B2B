# Mock Data Audit Report

This report documents all occurrences of mock data references, hardcoded providers, offline fallbacks, and legacy files in the **B2B Wholesale Portal** codebase.

---

## 1. Codebase Search Results

We audited the entire codebase for keys including `mock`, `jsonDb`, `mockDb`, `b2b_mock_db`, `sampleData`, `fakeData`, `seedData`, `hardcoded arrays`, `temporary data`, `demo data`, and `placeholder inventory`.

The filesystem is **100% clean of active mock logic**. The remaining items are legacy comments and uncommitted deletions:

### Active Files: Legacy Comments Only
- **[src/utils/session.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/utils/session.ts) (Line 92)**:
  - *Comment*: `// 2.2 Check Database or Mock JSON`
  - *Status*: **Safe**. The logic queries the `customerUsers` and `branchUsers` tables directly using Drizzle. There is no JSON fallback code here.
- **[src/utils/db.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/utils/db.ts) (Line 1013)**:
  - *Comment*: `// First create a mock stock_request`
  - *Status*: **Safe**. The logic performs a direct SQL insert into the production `stockRequests` table using Drizzle to satisfy transaction triggers. It does not use any offline objects.
- **[src/app/b2b/payments/PaymentsClient.tsx](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/app/b2b/payments/PaymentsClient.tsx) (Line 62)**:
  - *Comment*: `// Handle File Upload to local mock public/uploads dir`
  - *Status*: **Safe**. The file upload logic posts to `/api/upload`, which attempts to upload files to Supabase Storage first, and only falls back to local disk (`/public/uploads`) if Supabase credentials are missing.
- **[src/app/admin/b2b/settings/permissions/page.tsx](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/app/admin/b2b/settings/permissions/page.tsx) (Line 55)**:
  - *Comment*: `// Load RBAC settings dynamically from database (or mock fallbacks)`
  - *Status*: **Safe**. It queries the database via `getRoles()`, `getPermissions()`, and `getRolePermissions()`. No fallbacks exist.
- **[src/app/api/audit-log/route.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/app/api/audit-log/route.ts) (Line 10)**:
  - *Comment*: `// Use our wrapper which routes to either mock json or drizzle`
  - *Status*: **Safe**. The endpoint directly triggers `logB2BAuditDetailed` (which writes to the database).

---

## 2. Legacy Mock Database Files (Uncommitted Deletions)
These files have already been deleted from the filesystem as part of the refactoring work, and are currently unstaged in Git:
* **`b2b_mock_db.json`**: Legacy mock database containing offline profile, order, customer, catalog, and transaction JSON objects. (Deleted from root).
* **`src/utils/jsonDb.ts`**: Legacy JSON read/write logic layer. (Deleted).
* **`b2b_migration.sql`**, `b2b_extension_migration.sql`, `b2b_claims_migration.sql`: Deprecated B2B migration scripts. (Deleted).

---

## 3. Audit Conclusion
The B2B Portal codebase contains **no active offline mock logic or fallback-to-json code blocks**. All routes, sessions, ledger computations, dispatches, returns, invoices, and analytics fetch directly from the live PostgreSQL schema.
Once the Git changes are committed, all legacy references will be completely purged from the repository history.
