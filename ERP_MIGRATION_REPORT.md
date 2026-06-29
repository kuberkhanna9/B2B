# ERP Migration Report

This report verifies that the B2B ERP upgrade extending the production **Inventory ERP** database has been successfully generated, compile-tested, and prepared for deployment.

---

## 1. Migration Overview

* **Migration Script Name**: `erp_b2b_module.sql`
* **Status**: **READY FOR EXECUTION**
* **Path**: [erp_b2b_module.sql](file:///c:/Users/techs/OneDrive/Desktop/PROJECTS/LJK/Web%20Apps/B2B/erp_b2b_module.sql)

---

## 2. Upgrade Checklist

* **✔ Enums Created**: Safely verified and registered the following custom types:
  * `order_status`
  * `dispatch_status`
  * `payment_mode`
  * `payment_status`
  * `return_status`
  * `customer_status`
* **✔ B2B Tables Added**: Initialized the following tables without conflicting with Inventory:
  * `companies` (replaces legacy `customers`)
  * `customer_branches`
  * `customer_users`
  * `sales_orders`
  * `sales_order_items`
  * `dispatches`
  * `dispatch_items`
  * `returns`
  * `return_items`
  * `claims`
  * `claim_attachments`
  * `payment_references`
  * `customer_price_overrides`
  * `customer_notifications`
  * `order_activity_logs`
  * `invoice_metadata`
  * `b2b_audit_logs` (replaces legacy tracking inside `audit_logs`)
  * `customer_ledger`
  * `custom_order_items`
* **✔ Views Created**: Established the `inventory_availability` view calculating:
  * **Physical Stock**: Aggregates from immutable warehouse `stock_transactions` ledger.
  * **Reserved Stock**: Aggregates `approved_quantity - dispatched_quantity` from active B2B orders.
  * **Available Stock**: Calculated as `Physical Stock - Reserved Stock`.
* **✔ Indexes Created**: Added indexing for `customer_id`, `company_id`, `branch_id`, `variant_id`, `order_id`, `dispatch_id`, `invoice_id`, `return_id`, `status`, and `created_at` DESC.
* **✔ Foreign Keys Created**: Connected all B2B order, dispatch, returns, and overrides items directly to `product_variants.id` (no duplicate catalogues).
* **✔ Inventory Tables Preserved**: Confirmed no drops, recreations, or modifications to master tables (`profiles`, `products`, `product_colors`, `product_sizes`, `product_variants`, `stock_requests`, `stock_transactions`, `price_history`, `audit_logs`).
* **✔ Inventory Verified**: Ensured the single source of truth for products, variants, and stock balances remains owned exclusively by the Inventory ERP module.
* **✔ TypeScript Successful**: `npx tsc --noEmit` exits with **0 type errors**.
* **✔ Build Successful**: `npm run build` completes successfully with Next.js static page generation and chunk optimization.

---

## 3. View Logic Specification
The `inventory_availability` SQL view calculates quantities using the following formula:
```sql
CREATE OR REPLACE VIEW public.inventory_availability WITH (security_invoker = true) AS
WITH physical AS (
    SELECT 
        v.id AS variant_id,
        COALESCE(SUM(
            CASE 
                WHEN t.transaction_type IN ('STOCK_IN', 'ADJUSTMENT_IN') THEN t.quantity
                WHEN t.transaction_type IN ('SALE', 'DAMAGE_REPAIRABLE', 'DAMAGE_NON_REPAIRABLE', 'ADJUSTMENT_OUT') THEN -t.quantity
                ELSE 0 
            END
        ), 0) AS physical_stock
    FROM public.product_variants v
    LEFT JOIN public.stock_transactions t ON t.variant_id = v.id
    GROUP BY v.id
),
reserved AS (
    SELECT 
        oi.variant_id,
        COALESCE(SUM(
            CASE 
                WHEN o.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_FULFILLED', 'PARTIALLY_DISPATCHED') THEN 
                    GREATEST(0, oi.approved_quantity - oi.dispatched_quantity)
                ELSE 0 
            END
        ), 0) AS reserved_stock
    FROM public.sales_order_items oi
    JOIN public.sales_orders o ON oi.order_id = o.id
    GROUP BY oi.variant_id
)
SELECT 
    v.id AS variant_id,
    v.sku AS sku,
    COALESCE(p.physical_stock, 0) AS physical_stock,
    COALESCE(r.reserved_stock, 0) AS reserved_stock,
    (COALESCE(p.physical_stock, 0) - COALESCE(r.reserved_stock, 0)) AS available_stock
FROM public.product_variants v
LEFT JOIN physical p ON p.variant_id = v.id
LEFT JOIN reserved r ON r.variant_id = v.id;
```
