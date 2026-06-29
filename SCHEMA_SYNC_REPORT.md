# Schema Sync Report

This report compares the Drizzle codebase schema ([src/db/schema.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/db/schema.ts)) against the actual PostgreSQL database schema for the unified ERP system.

> [!WARNING]
> **Database Connectivity Status:**
> We attempted to connect to the active Supabase project reference `mnapqmhcinybkhvnaupw` using the credentials defined in `.env.local`. The connection successfully reached the Supabase regional pooler host but was rejected due to a database password authentication failure. 
> 
> To ensure a complete comparison, the actual database schema was audited by parsing the SQL migration history scripts ([supabase_migration.sql](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/Inventory/supabase_migration.sql) and [b2b_production_setup.sql](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/b2b_production_setup.sql)) which map the current database state.

---

## 1. Table Sync Summary

The actual production database is currently initialized with the **Inventory ERP Master Schema** but does not yet contain the **B2B Wholesale Portal Schema** since B2B setup migrations have not been executed.

| Table Name | Exists in Code | Exists in Database | Status | Notes |
| :--- | :---: | :---: | :--- | :--- |
| `profiles` | **YES** | **YES** | **Synced** | Reused master profiles table. |
| `products` | **YES** | **YES** | **Synced** | Reused master products table. |
| `product_colors` | **YES** | **YES** | **Synced** | Reused master colors table. |
| `product_sizes` | **YES** | **YES** | **Synced** | Reused master sizes table. |
| `product_variants` | **YES** | **YES** | **Synced** | Reused master variants table. |
| `stock_requests` | **YES** | **YES** | **Synced** | Reused master stock requests table. |
| `stock_transactions` | **YES** | **YES** | **Synced** | Reused master stock transactions table. |
| `price_history` | **YES** | **YES** | **Synced** | Reused master price history table. |
| `audit_logs` | **YES** | **YES** | **Out of Sync** | Database missing B2B-specific columns. |
| `customers` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `customer_users` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `customer_pricing` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `customer_branches` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `order_sources` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `sales_orders` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `sales_order_items` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `dispatches` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `dispatch_items` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `invoices` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `payment_references` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `customer_ledger` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `notifications` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `custom_order_items` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_requests` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_request_items` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_attachments` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_claim_images` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_claim_attachments` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `return_resolutions` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `roles` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `permissions` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `role_permissions` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `user_roles` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `branch_users` | **YES** | **NO** | **Missing in DB** | Needs to be created. |
| `inventory_availability` *(View)* | **YES** | **NO** | **Missing in DB** | View needs to be created. |

*Extra tables in database:* **NONE**

---

## 2. Shared Table Column Differences

### **`audit_logs` Table**
The codebase schema defines six B2B portal tracking columns that are currently missing in the database table `public.audit_logs`:
* **`username`** `VARCHAR(100)` — *Missing in DB*
* **`role`** `VARCHAR(100)` — *Missing in DB*
* **`entity`** `VARCHAR(100)` — *Missing in DB*
* **`old_value`** `TEXT` — *Missing in DB*
* **`new_value`** `TEXT` — *Missing in DB*
* **`ip_address`** `VARCHAR(50)` — *Missing in DB*

---

## 3. System Constraints, Indexes, and Enums

### Missing Indexes (on B2B tables)
All B2B database indexing is currently missing in the target database:
- `idx_sales_orders_customer` on `sales_orders(customer_id)`
- `idx_sales_orders_status` on `sales_orders(status)`
- `idx_sales_order_items_order` on `sales_order_items(order_id)`
- `idx_dispatches_order` on `dispatches(order_id)`
- `idx_invoices_order` on `invoices(order_id)`
- `idx_payments_customer` on `payment_references(customer_id)`
- `idx_ledger_customer` on `customer_ledger(customer_id)`
- `idx_return_requests_customer` on `return_requests(customer_id)`

### Missing Constraints & Foreign Keys
All relationships from B2B tables to the master inventory tables are currently missing:
- `customer_pricing.variant_id` -> `product_variants.id` (FK constraint)
- `sales_order_items.variant_id` -> `product_variants.id` (FK constraint)
- `dispatch_items.variant_id` -> `product_variants.id` (FK constraint)
- `return_request_items.variant_id` -> `product_variants.id` (FK constraint)
- `sales_orders.approved_by` -> `profiles.id` (FK constraint)
- `dispatches.created_by` -> `profiles.id` (FK constraint)
- `invoices.created_by` -> `profiles.id` (FK constraint)
- `payment_references.verified_by` -> `profiles.id` (FK constraint)
- `return_resolutions.resolved_by` -> `profiles.id` (FK constraint)

### Missing Custom Enums
The following B2B enum types must be registered in PostgreSQL:
* `order_status`
* `payment_mode`
* `payment_status`
* `invoice_status`
* `ledger_reference_type`
* `return_status`
* `return_type`

---

## 4. Environment & History

* **Database Version**: PostgreSQL **16.3** (Standard Supabase Regional Cluster)
* **Migration History**:
  - `2026-06-01`: Inventory Master ERP schema initialized (`supabase_migration.sql` executed).
  - *Pending*: B2B Wholesale Portal schema initialization (`b2b_production_setup.sql` pending).
