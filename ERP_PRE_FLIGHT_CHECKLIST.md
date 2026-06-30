# ERP Pre-Flight Migration Checklist

This checklist acts as the final validation record before executing the database migration against the production **Inventory ERP** database.

---

## Pre-Flight Status: **READY FOR PRODUCTION EXECUTION**

---

## 1. Schema Safety Check

* **[x] Inventory tables untouched**: No existing Inventory tables (`profiles`, `products`, `product_colors`, `product_sizes`, `product_variants`, `stock_requests`, `stock_transactions`, `price_history`, `audit_logs`) will be dropped, renamed, or recreated.
* **[x] Only B2B tables will be created**: The SQL migration script `erp_b2b_module.sql` only creates B2B specific operational and RBAC tables (e.g. `customers`, `customer_branches`, `customer_users`, etc.).
* **[x] Existing Inventory APIs remain compatible**: Checked and confirmed that all shared schemas continue to export fields used by Inventory microservices.
* **[x] Migration is idempotent**: Verified all sql declarations use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, and type generation wrapped in duplicate-safe `DO` execution blocks.
* **[x] Rollback script generated**: Refined `erp_b2b_module_rollback.sql` has been created, tested, and validated to safely remove B2B components without altering master tables.

---

## 2. No Replication Audits

* **[x] No duplicate products**: Master styles and details remain exclusively owned by `products`.
* **[x] No duplicate variants**: SKUs, MRPs, cost price, and locations remain exclusively defined in `product_variants`.
* **[x] No duplicate stock**: No stock inventory fields are duplicated. Quantities are computed at query runtime.
* **[x] No duplicate catalogue**: Shared inventory access is via foreign keys pointing directly to `product_variants.id`.
* **[x] No duplicate warehouse logic / inventory calculations**: View `inventory_availability` calculates physical stock strictly using the `stock_transactions` ledger.

---

## 3. Code Verification Check

* **[x] TypeScript passes**: Compiled safely via `npx tsc --noEmit` with **0 errors**.
* **[x] Build passes**: Optimized production client and server bundles build successfully via `npm run build`.
