# ERP Database Dependency Audit Report

This report documents all foreign key dependencies, shared schemas, and database ownership boundaries between the **Master Inventory Module** and the new **B2B Wholesale Module**.

---

## 1. Inventory & B2B Schema Boundaries

```mermaid
graph TD
    %% Inventory ERP Master Tables
    subgraph Inventory Master (Untouched)
        products[products]
        product_variants[product_variants]
        product_colors[product_colors]
        product_sizes[product_sizes]
        stock_transactions[stock_transactions]
        stock_requests[stock_requests]
        profiles[profiles]
        price_history[price_history]
        audit_logs[audit_logs]
    end

    %% B2B Module Operational Tables
    subgraph B2B Module (New Extensions)
        customers[customers]
        customer_branches[customer_branches]
        customer_users[customer_users]
        sales_orders[sales_orders]
        sales_order_items[sales_order_items]
        dispatches[dispatches]
        dispatch_items[dispatch_items]
        invoice_metadata[invoice_metadata]
        payment_references[payment_references]
        returns[returns]
        return_items[return_items]
        customer_price_overrides[customer_price_overrides]
    end

    %% Foreign Key Cross-References
    customer_branches -->|customer_id| customers
    customer_users -->|customer_id| customers
    customer_users -->|branch_id| customer_branches
    sales_orders -->|branch_id| customer_branches
    sales_orders -->|customer_id| customers
    sales_orders -->|created_by| customer_users
    sales_orders -->|approved_by| profiles
    sales_order_items -->|order_id| sales_orders
    sales_order_items -->|variant_id| product_variants
    dispatches -->|order_id| sales_orders
    dispatches -->|created_by| profiles
    dispatch_items -->|dispatch_id| dispatches
    dispatch_items -->|variant_id| product_variants
    invoice_metadata -->|order_id| sales_orders
    invoice_metadata -->|created_by| profiles
    payment_references -->|customer_id| customers
    payment_references -->|invoice_id| invoice_metadata
    payment_references -->|verified_by| profiles
    returns -->|branch_id| customer_branches
    returns -->|customer_id| customers
    returns -->|order_id| sales_orders
    return_items -->|return_id| returns
    return_items -->|variant_id| product_variants
    customer_price_overrides -->|customer_id| customers
    customer_price_overrides -->|variant_id| product_variants

    %% Styling
    classDef master fill:#f8fafc,stroke:#475569,stroke-width:2px;
    classDef b2b fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    class products,product_variants,product_colors,product_sizes,stock_transactions,stock_requests,profiles,price_history,audit_logs master;
    class customers,customer_branches,customer_users,sales_orders,sales_order_items,dispatches,dispatch_items,invoice_metadata,payment_references,returns,return_items,customer_price_overrides b2b;
```

---

## 2. Foreign Key Dependency Paths to Inventory

To maintain a single source of truth, B2B tables never replicate catalogue names, quantities, or prices. They reference variant and profiles IDs directly:

1. **Product Variants References (`product_variants.id`)**:
   * `sales_order_items.variant_id` -> `product_variants.id`
   * `dispatch_items.variant_id` -> `product_variants.id`
   * `return_items.variant_id` -> `product_variants.id`
   * `customer_price_overrides.variant_id` -> `product_variants.id`
   * `custom_order_items.converted_variant_id` -> `product_variants.id` (nullable buffer)
2. **Employee Profile References (`profiles.id`)**:
   * `sales_orders.approved_by` -> `profiles.id` (audit tracking on who authorized order approval)
   * `dispatches.created_by` -> `profiles.id` (audit tracking on employee creating the dispatch)
   * `invoice_metadata.created_by` -> `profiles.id` (audit tracking on employee generating invoice)
   * `payment_references.verified_by` -> `profiles.id` (audit tracking on who verified bank transaction ledger UTR)
   * `return_resolutions.resolved_by` -> `profiles.id` (audit tracking on who approved return claims)

---

## 3. Database Resource Allocations

* **Untouched Master Tables (9 tables)**:
  * `profiles`, `products`, `product_colors`, `product_sizes`, `product_variants`, `stock_requests`, `stock_transactions`, `price_history`, `audit_logs`.
* **Extended Tables (1 table)**:
  * `audit_logs` — extended with B2B tracking columns (`username`, `role`, `entity`, `entity_id`, `old_value`, `new_value`, `ip_address`, `user_agent`).
* **New Operational Tables (20 tables)**:
  * `customers`, `customer_branches`, `customer_users`, `sales_orders`, `sales_order_items`, `dispatches`, `dispatch_items`, `invoice_metadata`, `returns`, `return_items`, `return_attachments`, `claims`, `claim_attachments`, `return_resolutions`, `payment_references`, `customer_price_overrides`, `customer_notifications`, `order_activity_logs`, `customer_ledger`, `custom_order_items`.
* **New RBAC Tables (4 tables)**:
  * `roles`, `permissions`, `role_permissions`, `user_roles`.

---

## 4. Conflict Verification Check
* **Duplicate Catalogues**: **NONE**. All B2B workflows select product items directly from `product_variants` and `products`.
* **Duplicate Stock ledgers**: **NONE**. Physical stock calculations are computed strictly from the `stock_transactions` table via sql aggregations.
* **Name Collisions**: **NONE**. All B2B module tables are prefixed or scoped.
* **Trigger Conflicts**: **NONE**. The database trigger `check_negative_ready_stock_trigger` on `stock_transactions` remains unaffected.
