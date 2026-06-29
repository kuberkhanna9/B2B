# ERP Database Audit Report

This database audit analyzes the table schemas in both the **Inventory ERP** and **B2B Wholesale Portal** to ensure single-source-of-truth alignment.

---

## 1. Existing Inventory Master Tables
These tables are owned by the Inventory ERP module and contain master production data. They must NOT be recreated or duplicated:
1. `profiles`: User profile roles and statuses.
2. `products`: Master product catalog records.
3. `product_colors`: Master color combinations mapped to products.
4. `product_sizes`: Master size listings mapped to products.
5. `product_variants` (SKUs): Color-size SKUs, including MRP, Wholesale Selling Price (WSP), and Cost Price.
6. `stock_requests`: Warehouse inbound/outbound requests.
7. `stock_transactions`: Immutable stock audit ledger records.
8. `price_history`: Log of cost, WSP, and MRP adjustments.
9. `audit_logs`: Extended with B2B tracking columns (`username`, `role`, `entity`, `old_value`, `new_value`, `ip_address`).

---

## 2. Existing B2B Portal Tables
These tables belong strictly to the B2B Wholesale Portal and store customer relations, order processing, returns, logistics, and portal-specific security mappings:
1. `customers`: Wholesale company details.
2. `customer_users`: Client-side admin accounts linked to customers.
3. `customer_pricing`: Client-specific SKU pricing overrides.
4. `customer_branches`: Customer physical branch locations.
5. `order_sources`: Distribution channels (e.g. PORTAL, ADMIN).
6. `sales_orders`: Client order headers and processing state.
7. `sales_order_items`: Approved/ordered quantities and prices.
8. `dispatches`: Courier metadata, tracking numbers, and dates.
9. `dispatch_items`: Dispatched quantities mapped to variants.
10. `invoices`: Invoice totals, pdf URLs, and due dates.
11. `payment_references`: Customer bank transfer/UPI UTR receipts.
12. `customer_ledger`: Financial debit/credit ledger records.
13. `notifications`: In-app customer notifications.
14. `custom_order_items`: Non-catalog item requests.
15. `return_requests`: Return claim headers.
16. `return_request_items`: Claimed quantities.
17. `return_attachments`: Scanned courier receipt PDFs/JPEGs.
18. `return_claim_images`: Image claims.
19. `return_claim_attachments`: Expanded claim document attachments.
20. `return_resolutions`: Claim resolutions (e.g. credit notes).
21. `roles`: Security RBAC roles.
22. `permissions`: RBAC authorization codes.
23. `role_permissions`: Role-to-permission mappings.
24. `user_roles`: App user-to-role mappings.
25. `branch_users`: B2B branch-specific user accounts.

---

## 3. Reconciliations

### Duplicate Tables
- **None**: Both the B2B portal and the Inventory system have already unified their schemas under a single namespace in the database client. No duplicate tables exist in the codebase.

### Tables Safe to Remove
- **None**: All 9 Inventory tables are required for warehouse operations, and all 25 B2B tables are required for customer operations.

### Tables to Keep
- All **9 Inventory master tables** and all **25 B2B portal tables** must be maintained in the shared database.

### Missing Tables
- **None**: Structurally, all tables are fully defined. However, the B2B-specific tables and the `inventory_availability` view do not exist on the new database project (`mnapqmhcinybkhvnaupw`) yet and must be created via migrations.

---

## 4. Migration Strategy
1. **Unify database credentials**: Update both `B2B/.env.local` and `Inventory/.env.local` to point to the new project ref (`mnapqmhcinybkhvnaupw`) and uncomment the `DATABASE_URL` key in the B2B portal.
2. **Execute setup script**: Run [b2b_production_setup.sql](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/b2b_production_setup.sql) on the database. This script:
   - Alters the existing `audit_logs` schema to add B2B auditing columns.
   - Alters the `user_role` enum type to add the `B2B_CUSTOMER` value.
   - Creates the 25 B2B-specific tables, keys, indexes, and RLS policies.
   - Seeds standard roles, permissions, and order sources.
   - Creates the `inventory_availability` view to calculate stock positions.
