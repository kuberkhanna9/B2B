# ERP Pre-Migration Schema Validation Report

This report compares the active PostgreSQL database schema (currently hosting the live **Inventory ERP** module) against the definitions in the codebase ([src/db/schema.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/db/schema.ts)).

---

## 1. Existing Inventory Master Tables
These tables exist in both the codebase and the actual PostgreSQL database. They contain live warehouse data and must remain untouched:
1. `profiles`: User login roles and statuses.
2. `products`: Master products.
3. `product_colors`: Colors mapped to products.
4. `product_sizes`: Sizes mapped to products.
5. `product_variants` (SKUs): Variants holding wholesale price, MRP, cost, and rack location.
6. `stock_requests`: Warehouse inbound/outbound approvals.
7. `stock_transactions`: Immutable stock ledger transactions.
8. `price_history`: Price adjustments logs.
9. `audit_logs`: Operations tracking logs.

---

## 2. Existing B2B Tables (In Code Schema Only)
These tables are defined in the Drizzle codebase schema ([src/db/schema.ts](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/src/db/schema.ts)) but do not exist in the actual database yet:
1. `customers`
2. `customer_users`
3. `customer_pricing`
4. `customer_branches`
5. `order_sources`
6. `sales_orders`
7. `sales_order_items`
8. `dispatches`
9. `dispatch_items`
10. `invoices`
11. `payment_references`
12. `customer_ledger`
13. `notifications`
14. `custom_order_items`
15. `return_requests`
16. `return_request_items`
17. `return_attachments`
18. `return_claim_images`
19. `return_claim_attachments`
20. `return_resolutions`
21. `roles`
22. `permissions`
23. `role_permissions`
24. `user_roles`
25. `branch_users`

---

## 3. Missing B2B Tables (In actual database)
The following tables are missing from the production database schema and must be created to support B2B functionality:
* `companies` (Replacing old `customers` table name)
* `customer_branches`
* `customer_users`
* `sales_orders`
* `sales_order_items`
* `dispatches`
* `dispatch_items`
* `returns` (Replacing old `return_requests` table name)
* `return_items` (Replacing old `return_request_items` table name)
* `claims` (Replacing old `return_claim_images` table name)
* `claim_attachments` (Replacing old `return_claim_attachments` table name)
* `payment_references`
* `customer_price_overrides` (Replacing old `customer_pricing` table name)
* `customer_notifications` (Replacing old `notifications` table name)
* `order_activity_logs` (New table to isolate B2B logs)
* `invoice_metadata` (Replacing old `invoices` table name)
* `b2b_audit_logs` (Isolating B2B audits from `audit_logs`)

---

## 4. Enums Validation

### Existing Enums (In database)
- `user_role` ('SUPERADMIN', 'ACCOUNTS', 'INVENTORY', 'RETAIL')
- `request_type` ('STOCK_IN', 'SALE', 'DAMAGE_REPAIRABLE', 'DAMAGE_NON_REPAIRABLE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')
- `request_status` ('PENDING', 'APPROVED', 'REJECTED')

### Missing Enums (To create in database)
* `order_status` ('PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_FULFILLED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED')
* `dispatch_status` ('PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')
* `payment_mode` ('BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH')
* `payment_status` ('SUBMITTED', 'VERIFIED', 'REJECTED')
* `return_status` ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RECEIVED', 'CLOSED')
* `customer_status` ('ACTIVE', 'INACTIVE')

---

## 5. Indexes Validation

### Existing Indexes (In database)
- `idx_variants_sku` on `product_variants(sku)`
- `idx_transactions_variant_id` on `stock_transactions(variant_id)`
- `idx_requests_status` on `stock_requests(status)`
- `idx_audit_logs_created_at` on `audit_logs(created_at desc)`
- `idx_price_history_variant` on `price_history(variant_id)`

### Missing Indexes (To create in database)
* Index on `customer_id` for customer related tables.
* Index on `company_id` for companies related tables.
* Index on `branch_id` for branches related tables.
* Index on `variant_id` for inventory mappings.
* Index on `order_id` for order items, invoices, and returns.
* Index on `dispatch_id` for dispatch items.
* Index on `invoice_id` for payments.
* Index on `return_id` for claim items and resolutions.
* Index on `created_at` (DESC) for ordering history.
* Index on `status` for status tracking tables.

---

## 6. Foreign Keys Validation

### Existing Foreign Keys (In database)
- `product_colors.product_id` -> `products.id`
- `product_sizes.product_id` -> `products.id`
- `product_variants.product_id` -> `products.id`
- `product_variants.color_id` -> `product_colors.id`
- `product_variants.size_id` -> `product_sizes.id`
- `stock_requests.variant_id` -> `product_variants.id`
- `stock_requests.created_by` -> `profiles.id`
- `stock_requests.reviewed_by` -> `profiles.id`
- `stock_transactions.request_id` -> `stock_requests.id`
- `stock_transactions.variant_id` -> `product_variants.id`
- `stock_transactions.created_by` -> `profiles.id`
- `price_history.variant_id` -> `product_variants.id`
- `price_history.changed_by` -> `profiles.id`
- `audit_logs.user_id` -> `profiles.id`

### Missing Foreign Keys (To create in database)
* `customer_price_overrides.variant_id` -> `product_variants.id`
* `sales_order_items.variant_id` -> `product_variants.id`
* `dispatch_items.variant_id` -> `product_variants.id`
* `return_items.variant_id` -> `product_variants.id`
* `sales_orders.branch_id` -> `customer_branches.id`
* `customer_branches.company_id` -> `companies.id`
* `customer_users.company_id` -> `companies.id`
