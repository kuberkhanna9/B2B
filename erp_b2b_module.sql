-- erp_b2b_module.sql
-- Upgrades the Lall Ji Knitwears ERP Database with the complete B2B Module.
-- Extends the database without dropping or altering any existing Inventory ERP tables.

-- =============================================================================
-- 1. CUSTOM B2B ENUMS
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'PENDING_APPROVAL',
            'APPROVED',
            'PARTIALLY_APPROVED',
            'PARTIALLY_FULFILLED',
            'PARTIALLY_DISPATCHED',
            'DISPATCHED',
            'DELIVERED',
            'COMPLETED',
            'CANCELLED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispatch_status') THEN
        CREATE TYPE dispatch_status AS ENUM (
            'PENDING',
            'DISPATCHED',
            'DELIVERED',
            'CANCELLED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE payment_mode AS ENUM (
            'BANK_TRANSFER',
            'UPI',
            'CHEQUE',
            'CASH'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'SUBMITTED',
            'VERIFIED',
            'REJECTED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
        CREATE TYPE return_status AS ENUM (
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'REJECTED',
            'RECEIVED',
            'CLOSED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_type') THEN
        CREATE TYPE return_type AS ENUM (
            'DEFECTIVE',
            'SOR_RETURN',
            'WRONG_ITEM',
            'EXCESS_QUANTITY',
            'CUSTOMER_REJECTION',
            'TRANSIT_DAMAGE',
            'SIZE_ISSUE',
            'OTHER',
            'COLOUR_ISSUE',
            'SHORT_QUANTITY',
            'CUSTOMER_CANCELLATION'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM (
            'UNPAID',
            'PARTIALLY_PAID',
            'PAID',
            'OVERDUE'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_reference_type') THEN
        CREATE TYPE ledger_reference_type AS ENUM (
            'INVOICE',
            'PAYMENT'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM (
            'ACTIVE',
            'INACTIVE'
        );
    END IF;
END$$;

-- Ensure CLIENT_ADMIN and CLIENT_BRANCH_USER roles are supported in profiles if needed
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'B2B_CUSTOMER';

-- =============================================================================
-- 2. EXTEND EXISTING ERP TABLES
-- =============================================================================
-- Safely extend the existing audit_logs table to keep a single unified timeline
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);

-- =============================================================================
-- 3. CREATE B2B MODULE TABLES
-- =============================================================================

-- Customers (Represents Corporate/Company profile)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    billing_address VARCHAR(1000),
    shipping_address VARCHAR(1000),
    status customer_status DEFAULT 'ACTIVE'::customer_status NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customer Branches
CREATE TABLE IF NOT EXISTS public.customer_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    gst VARCHAR(50),
    billing_address VARCHAR(1000),
    shipping_address VARCHAR(1000),
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customer Users
CREATE TABLE IF NOT EXISTS public.customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.customer_branches(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL UNIQUE,
    branch_id UUID NOT NULL REFERENCES public.customer_branches(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.customer_users(id) ON DELETE RESTRICT,
    status order_status DEFAULT 'PENDING_APPROVAL'::order_status NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    remarks VARCHAR(500),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    approved_quantity INTEGER DEFAULT 0 NOT NULL CHECK (approved_quantity >= 0),
    dispatched_quantity INTEGER DEFAULT 0 NOT NULL CHECK (dispatched_quantity >= 0),
    price_per_unit NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispatches
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
    dispatch_number VARCHAR(100) NOT NULL UNIQUE,
    courier VARCHAR(255) NOT NULL,
    tracking_number VARCHAR(255) NOT NULL,
    dispatch_date TIMESTAMPTZ NOT NULL,
    status dispatch_status DEFAULT 'PENDING'::dispatch_status NOT NULL,
    remarks VARCHAR(500),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispatch Items
CREATE TABLE IF NOT EXISTS public.dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Invoice Metadata
CREATE TABLE IF NOT EXISTS public.invoice_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_date TIMESTAMPTZ NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status invoice_status DEFAULT 'UNPAID'::invoice_status NOT NULL,
    invoice_pdf_url VARCHAR(1000),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Returns (Replacing return_requests)
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    branch_id UUID NOT NULL REFERENCES public.customer_branches(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100),
    status return_status DEFAULT 'PENDING'::return_status NOT NULL,
    reason return_type NOT NULL,
    remarks VARCHAR(1000),
    created_by_type VARCHAR(50) NOT NULL, -- 'CUSTOMER' or 'ADMIN'
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Return Items
CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    custom_item_name VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Return Attachments
CREATE TABLE IF NOT EXISTS public.return_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claims
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    image_url VARCHAR(1000) NOT NULL,
    claim_title VARCHAR(255),
    description VARCHAR(1000),
    status VARCHAR(50) DEFAULT 'PENDING',
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claim Attachments
CREATE TABLE IF NOT EXISTS public.claim_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Return Claim Resolutions
CREATE TABLE IF NOT EXISTS public.return_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    resolution_type VARCHAR(100) NOT NULL,
    remarks VARCHAR(1000),
    resolved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Payment References
CREATE TABLE IF NOT EXISTS public.payment_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES public.invoice_metadata(id) ON DELETE RESTRICT,
    payment_date TIMESTAMPTZ NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode payment_mode NOT NULL,
    reference_number VARCHAR(100),
    utr_number VARCHAR(100) NOT NULL UNIQUE,
    notes VARCHAR(1000),
    attachment_url VARCHAR(1000),
    status payment_status DEFAULT 'SUBMITTED'::payment_status NOT NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    verified_at TIMESTAMPTZ,
    rejection_reason VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customer Price Overrides
CREATE TABLE IF NOT EXISTS public.customer_price_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    custom_price NUMERIC(12, 2) NOT NULL CHECK (custom_price >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customer Notifications
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    message VARCHAR(1000) NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Order Activity Logs
CREATE TABLE IF NOT EXISTS public.order_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    remarks VARCHAR(1000),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customer Ledger
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    date TIMESTAMPTZ NOT NULL,
    reference_type ledger_reference_type NOT NULL,
    reference_id UUID NOT NULL,
    debit_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    credit_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Custom Order Items
CREATE TABLE IF NOT EXISTS public.custom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    wsp NUMERIC(12, 2) NOT NULL CHECK (wsp >= 0),
    mrp NUMERIC(12, 2) NOT NULL CHECK (mrp >= 0),
    gst_percent NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    hsn_code VARCHAR(50),
    remarks VARCHAR(500),
    image_url VARCHAR(1000),
    converted_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RBAC Tables
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- =============================================================================
-- 4. CREATE STOCK POSITION VIEW
-- =============================================================================
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

-- =============================================================================
-- 5. CREATE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_branches_customer ON public.customer_branches(customer_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON public.customer_branches(status);
CREATE INDEX IF NOT EXISTS idx_cusers_customer ON public.customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_cusers_branch ON public.customer_users(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_branch ON public.sales_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON public.sales_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_variant ON public.sales_order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_order ON public.dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON public.dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_variant ON public.dispatch_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_order ON public.invoice_metadata(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON public.invoice_metadata(status);
CREATE INDEX IF NOT EXISTS idx_returns_branch ON public.returns(branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON public.returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_variant ON public.return_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_claims_return ON public.claims(return_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_return ON public.claim_attachments(return_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payment_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payment_references(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_references(status);
CREATE INDEX IF NOT EXISTS idx_price_overrides_customer ON public.customer_price_overrides(customer_id);
CREATE INDEX IF NOT EXISTS idx_price_overrides_variant ON public.customer_price_overrides(variant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON public.customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.customer_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_logs_order ON public.order_activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_customer ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.customer_ledger(created_at DESC);

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_order_items ENABLE ROW LEVEL SECURITY;

-- Enable public select access for all authenticated roles on B2B
CREATE POLICY "Allow authenticated read on customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customer_branches" ON public.customer_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customer_users" ON public.customer_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on sales_orders" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on sales_order_items" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on dispatches" ON public.dispatches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on dispatch_items" ON public.dispatch_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on invoice_metadata" ON public.invoice_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on returns" ON public.returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on return_items" ON public.return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on claims" ON public.claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on claim_attachments" ON public.claim_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on payment_references" ON public.payment_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customer_price_overrides" ON public.customer_price_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customer_notifications" ON public.customer_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on order_activity_logs" ON public.order_activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customer_ledger" ON public.customer_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on custom_order_items" ON public.custom_order_items FOR SELECT TO authenticated USING (true);

-- Allow full write permission for database clients / backend API
CREATE POLICY "Allow full write on customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on customer_branches" ON public.customer_branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on customer_users" ON public.customer_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on sales_orders" ON public.sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on sales_order_items" ON public.sales_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on dispatches" ON public.dispatches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on dispatch_items" ON public.dispatch_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on invoice_metadata" ON public.invoice_metadata FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on returns" ON public.returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on return_items" ON public.return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on claims" ON public.claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on claim_attachments" ON public.claim_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on payment_references" ON public.payment_references FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on customer_price_overrides" ON public.customer_price_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on customer_notifications" ON public.customer_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on order_activity_logs" ON public.order_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on customer_ledger" ON public.customer_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full write on custom_order_items" ON public.custom_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
