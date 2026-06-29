# B2B & Inventory ERP Migration Plan

This migration plan outlines the steps, schemas, and configurations required to fully merge the B2B portal and the Inventory ERP system under a single Supabase database instance (`mnapqmhcinybkhvnaupw`).

---

## 1. Current Architecture
- **Inventory System**: Runs on a separate schema space or database credentials (historically pointing to `xqiefyoedaxetzkousmo`), acting as the master ledger for warehouse transactions, physical inventory count, and color/size variables.
- **B2B Portal**: Code refactored to read from Drizzle schemas, but currently configured for the deprecated tenant `xqiefyoedaxetzkousmo` in `.env.local` files, with no active connection to `mnapqmhcinybkhvnaupw`.
- **Mock Infrastructure**: Purged from filesystem but changes not yet committed to Git history.

---

## 2. Future Architecture (Single ERP Ecosystem)
- Both applications will connect to the same PostgreSQL database instance on Supabase project reference: **`mnapqmhcinybkhvnaupw`**.
- Both systems will share the same `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Data Ownership Rule**:
  - The Inventory ERP remains the master controller of products, variants, colors, sizes, and stock ledger tables (`products`, `product_variants`, `product_colors`, `product_sizes`, `profiles`, `stock_requests`, `stock_transactions`, `price_history`, `audit_logs`).
  - The B2B Portal only reads these tables for catalogue listings and computes stock using the database view `inventory_availability`. It owns customer transactions, dispatches, invoices, claims, and returns.

---

## 3. File Adjustments

### Files to Delete
- All local mock database and legacy migration files have been deleted (unstaged in Git):
  - `B2B/b2b_migration.sql`
  - `B2B/b2b_extension_migration.sql`
  - `B2B/b2b_claims_migration.sql`
  - `B2B/b2b_mock_db.json`
  - `B2B/src/utils/jsonDb.ts`

### Files to Modify
- **[B2B/.env.local](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/.env.local)**: Update credentials to point to `mnapqmhcinybkhvnaupw`.
- **[Inventory/.env.local](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/Inventory/.env.local)**: Update credentials to point to `mnapqmhcinybkhvnaupw`.

---

## 4. Database Table Reorganization

### Tables to Create
The following B2B-specific tables, types, and views will be created on the production schema via the migration script:
* **Enums**: `order_status`, `payment_mode`, `payment_status`, `invoice_status`, `ledger_reference_type`, `return_status`, `return_type`.
* **Tables**:
  - `customers`
  - `customer_users`
  - `customer_pricing`
  - `customer_branches`
  - `order_sources`
  - `sales_orders`
  - `sales_order_items`
  - `dispatches`
  - `dispatch_items`
  - `invoices`
  - `payment_references`
  - `customer_ledger`
  - `notifications`
  - `custom_order_items`
  - `return_requests`
  - `return_request_items`
  - `return_attachments`
  - `return_claim_images`
  - `return_claim_attachments`
  - `return_resolutions`
  - `roles`
  - `permissions`
  - `role_permissions`
  - `user_roles`
  - `branch_users`
* **Views**:
  - `inventory_availability`

### Tables to Reuse (Master Single Source of Truth)
No duplicate product or stock ledger tables will be created. The B2B portal will directly query:
* `products`
* `product_variants`
* `product_colors`
* `product_sizes`
* `profiles`
* `stock_requests`
* `stock_transactions`
* `price_history`
* `audit_logs` (extended with columns)

### Tables to Remove
- **None**: All existing tables in the schemas are active. No tables are dropped.

---

## 5. Expected Risks & Rollback Strategy

### Risks
1. **Divergent Schema/Typings**: Minor field mismatches could throw SQL runtime errors. (Mitigated by matching Drizzle schemas exactly and pre-testing using compilation checking).
2. **Access Security (RLS)**: Incorrect RLS policies on the shared database could prevent the B2B portal from reading variants or writing orders. (Mitigated by using standard CLI/PostgreSQL policies that permit read/write privileges based on role tokens).

### Rollback Strategy
1. **Config Rollover**: Back up current `.env.local` files in both directories.
2. **SQL Reversion**: If schema migration encounters errors, drop the created tables and views using the teardown scripts before executing fixes:
   ```sql
   DROP VIEW IF EXISTS inventory_availability;
   DROP TABLE IF EXISTS return_resolutions, return_claim_attachments, return_claim_images, return_attachments, return_request_items, return_requests, custom_order_items, notifications, customer_ledger, payment_references, invoices, dispatch_items, dispatches, sales_order_items, sales_orders, order_sources, customer_branches, customer_pricing, customer_users, customers, branch_users, user_roles, role_permissions, permissions, roles;
   ```
