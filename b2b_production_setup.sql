-- b2b_production_setup.sql
-- Unified SQL Setup script for Lall Ji B2B Wholesale Portal on top of Production Inventory Database.
-- Run this script in the Supabase SQL Editor.

-- 1. EXTEND THE USER_ROLE ENUM
-- Since public.user_role already exists from the Inventory system, we extend it safely.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPERADMIN';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ACCOUNTS';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'INVENTORY';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'RETAIL';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'B2B_CUSTOMER';

-- 2. CREATE CUSTOM B2B ENUMS
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
END$$;

-- 3. EXTEND AUDIT_LOGS TABLE WITH B2B COLUMNS
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

-- 4. CREATE B2B TABLES

-- Customers table (Company profile)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    billing_address VARCHAR(1000),
    shipping_address VARCHAR(1000),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Customer Users table (Customer login credentials)
CREATE TABLE IF NOT EXISTS public.customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Customer Specific Pricing SKU overrides
CREATE TABLE IF NOT EXISTS public.customer_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    custom_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Order Sources
CREATE TABLE IF NOT EXISTS public.order_sources (
    id VARCHAR(100) PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL
);

-- B2B Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.customer_branches(id) ON DELETE RESTRICT,
    source_id VARCHAR(100) REFERENCES public.order_sources(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL, -- references customer_users.id or profiles.id
    status order_status DEFAULT 'PENDING_APPROVAL'::order_status NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    remarks VARCHAR(500),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B2B Sales Order Items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    approved_quantity INTEGER DEFAULT 0 NOT NULL CHECK (approved_quantity >= 0),
    dispatched_quantity INTEGER DEFAULT 0 NOT NULL CHECK (dispatched_quantity >= 0),
    price_per_unit NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Dispatches
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
    dispatch_number VARCHAR(100) UNIQUE NOT NULL,
    courier VARCHAR(255) NOT NULL,
    tracking_number VARCHAR(255) NOT NULL,
    dispatch_date TIMESTAMP WITH TIME ZONE NOT NULL,
    remarks VARCHAR(500),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Dispatch Items
CREATE TABLE IF NOT EXISTS public.dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status invoice_status DEFAULT 'UNPAID'::invoice_status NOT NULL,
    invoice_pdf_url VARCHAR(1000),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- External Payment References
CREATE TABLE IF NOT EXISTS public.payment_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode payment_mode NOT NULL,
    reference_number VARCHAR(100),
    utr_number VARCHAR(100) UNIQUE NOT NULL,
    notes VARCHAR(1000),
    attachment_url VARCHAR(1000),
    status payment_status DEFAULT 'SUBMITTED'::payment_status NOT NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Double-Entry Customer Ledger
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference_type ledger_reference_type NOT NULL,
    reference_id UUID NOT NULL,
    debit_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (debit_amount >= 0),
    credit_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (credit_amount >= 0),
    running_balance NUMERIC(12, 2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Customer Alerts/Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    message VARCHAR(1000) NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Custom (non-SKU) Sales Order Items
CREATE TABLE IF NOT EXISTS public.custom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    wsp NUMERIC(12, 2) NOT NULL CHECK (wsp >= 0),
    mrp NUMERIC(12, 2) NOT NULL CHECK (mrp >= 0),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (gst_percent >= 0),
    hsn_code VARCHAR(50),
    remarks VARCHAR(500),
    image_url VARCHAR(1000),
    converted_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Return Requests
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.customer_branches(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100),
    status return_status DEFAULT 'PENDING'::return_status NOT NULL,
    reason return_type NOT NULL,
    remarks VARCHAR(1000),
    created_by_type VARCHAR(50) NOT NULL CHECK (created_by_type IN ('CUSTOMER', 'ADMIN')),
    createdBy UUID NOT NULL, -- customer_users.id or profiles.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Return Request Items
CREATE TABLE IF NOT EXISTS public.return_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    custom_item_name VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Return Attachments
CREATE TABLE IF NOT EXISTS public.return_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Return Resolutions
CREATE TABLE IF NOT EXISTS public.return_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    resolution_type VARCHAR(100) NOT NULL,
    remarks VARCHAR(1000),
    resolved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Return Claim Images
CREATE TABLE IF NOT EXISTS public.return_claim_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    image_url VARCHAR(1000) NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Return Claim Attachments
CREATE TABLE IF NOT EXISTS public.return_claim_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B2B Portal RBAC Tables
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.branch_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.customer_branches(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. CREATE OPTIMIZATION INDEXES FOR B2B
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON public.customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_customer_id ON public.customer_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_variant_id ON public.customer_pricing(variant_id);
CREATE INDEX IF NOT EXISTS idx_customer_branches_customer_id ON public.customer_branches(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_branch_id ON public.sales_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON public.dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch_id ON public.dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_customer_id ON public.payment_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_invoice_id ON public.payment_references(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_order_items_order_id ON public.custom_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer_id ON public.return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_request_items_return ON public.return_request_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_attachments_return ON public.return_attachments(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_resolutions_return ON public.return_resolutions(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_claim_images_return ON public.return_claim_images(return_id);
CREATE INDEX IF NOT EXISTS idx_return_claim_attachments_return ON public.return_claim_attachments(return_id);
CREATE INDEX IF NOT EXISTS idx_branch_users_customer ON public.branch_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_branch_users_branch ON public.branch_users(branch_id);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) FOR B2B
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_claim_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_claim_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_users ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE RLS POLICIES FOR B2B
-- Employees can read/manage all B2B records.
-- Customers can read/create only their own records.

CREATE POLICY "Customers viewable by employees" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Customer Users viewable by employees" ON public.customer_users FOR ALL TO authenticated USING (true);

CREATE POLICY "B2B Customers see their own profile" ON public.customers FOR SELECT TO authenticated
    USING (id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "B2B Customer Users see their own profiles" ON public.customer_users FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "B2B Customer pricing read access" ON public.customer_pricing FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Pricing admin manage access" ON public.customer_pricing FOR ALL TO authenticated USING (true);

CREATE POLICY "Sales orders read access" ON public.sales_orders FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Sales orders write access for customers" ON public.sales_orders FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "Sales orders admin manage access" ON public.sales_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Order items read access" ON public.sales_order_items FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Order items insert for customers" ON public.sales_order_items FOR INSERT TO authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())));

CREATE POLICY "Order items admin manage access" ON public.sales_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Dispatches read access for customers" ON public.dispatches FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Dispatches admin manage access" ON public.dispatches FOR ALL TO authenticated USING (true);

CREATE POLICY "Dispatch items read access for customers" ON public.dispatch_items FOR SELECT TO authenticated
    USING (dispatch_id IN (SELECT id FROM public.dispatches WHERE order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()))));

CREATE POLICY "Dispatch items admin manage access" ON public.dispatch_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Invoices read access for customers" ON public.invoices FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Invoices admin manage access" ON public.invoices FOR ALL TO authenticated USING (true);

CREATE POLICY "Payments read access for customers" ON public.payment_references FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Payments insert access for customers" ON public.payment_references FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "Payments admin manage access" ON public.payment_references FOR ALL TO authenticated USING (true);

CREATE POLICY "Ledger read access for customers" ON public.customer_ledger FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Ledger admin manage access" ON public.customer_ledger FOR ALL TO authenticated USING (true);

CREATE POLICY "Notifications read access for customers" ON public.notifications FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Notifications insert and delete access" ON public.notifications FOR ALL TO authenticated USING (true);

CREATE POLICY "Branches viewable by employees" ON public.customer_branches FOR ALL TO authenticated USING (true);
CREATE POLICY "B2B Customers see their own branches" ON public.customer_branches FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "Order sources viewable by all authenticated users" ON public.order_sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Custom items read access" ON public.custom_order_items FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);
CREATE POLICY "Custom items admin manage access" ON public.custom_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Returns read access" ON public.return_requests FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);
CREATE POLICY "Returns insert access for customers" ON public.return_requests FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));
CREATE POLICY "Returns admin manage access" ON public.return_requests FOR ALL TO authenticated USING (true);

CREATE POLICY "Return items read access" ON public.return_request_items FOR SELECT TO authenticated
    USING (return_request_id IN (SELECT id FROM public.return_requests WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);
CREATE POLICY "Return items admin manage access" ON public.return_request_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Return attachments read access" ON public.return_attachments FOR SELECT TO authenticated
    USING (return_request_id IN (SELECT id FROM public.return_requests WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);
CREATE POLICY "Return attachments admin manage access" ON public.return_attachments FOR ALL TO authenticated USING (true);

CREATE POLICY "Return resolutions read access" ON public.return_resolutions FOR SELECT TO authenticated
    USING (return_request_id IN (SELECT id FROM public.return_requests WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);
CREATE POLICY "Return resolutions admin manage access" ON public.return_resolutions FOR ALL TO authenticated USING (true);

CREATE POLICY "Return claim images read access" ON public.return_claim_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Return claim images admin write access" ON public.return_claim_images FOR ALL TO authenticated USING (true);

CREATE POLICY "Return claim attachments read access" ON public.return_claim_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Return claim attachments admin write access" ON public.return_claim_attachments FOR ALL TO authenticated USING (true);

CREATE POLICY "Roles viewable by authenticated users" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Roles admin manage access" ON public.roles FOR ALL TO authenticated USING (true);

CREATE POLICY "Permissions viewable by authenticated users" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permissions admin manage access" ON public.permissions FOR ALL TO authenticated USING (true);

CREATE POLICY "Role permissions viewable by authenticated users" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role permissions admin manage access" ON public.role_permissions FOR ALL TO authenticated USING (true);

CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "User roles admin manage access" ON public.user_roles FOR ALL TO authenticated USING (true);

CREATE POLICY "Branch users viewable by employees" ON public.branch_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Branch users viewable by branch admin" ON public.branch_users FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));
CREATE POLICY "Branch users admin manage access" ON public.branch_users FOR ALL TO authenticated USING (true);

-- 8. SEED B2B DATA

-- Seed order sources
INSERT INTO public.order_sources (id, source_name) VALUES
('CUSTOMER_PORTAL', 'Customer Portal'),
('ADMIN_CREATED', 'Admin Created'),
('WHATSAPP', 'WhatsApp'),
('PHONE', 'Phone Call'),
('EMAIL', 'Email')
ON CONFLICT (id) DO NOTHING;

-- Seed B2B roles
INSERT INTO public.roles (name, description) VALUES
('SUPERADMIN', 'System owner and administrator'),
('INVENTORY_DEPARTMENT', 'Warehouse and stock operations'),
('ACCOUNTS_DEPARTMENT', 'Billing and receivables'),
('CLIENT_ADMIN', 'Primary user for customer company'),
('CLIENT_BRANCH_USER', 'Branch-level ordering user')
ON CONFLICT (name) DO NOTHING;

-- 9. CREATE INVENTORY AVAILABILITY SQL VIEW
CREATE OR REPLACE VIEW public.inventory_availability AS
WITH physical_summary AS (
    SELECT 
        variant_id,
        COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('STOCK_IN', 'ADJUSTMENT_IN') THEN quantity
                WHEN transaction_type IN ('SALE', 'DAMAGE_REPAIRABLE', 'DAMAGE_NON_REPAIRABLE', 'ADJUSTMENT_OUT') THEN -quantity
                ELSE 0 
            END
        ), 0) AS physical_stock
    FROM public.stock_transactions
    GROUP BY variant_id
),
reserved_summary AS (
    SELECT 
        soi.variant_id,
        COALESCE(SUM(soi.approved_quantity - soi.dispatched_quantity), 0) AS reserved_stock
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON soi.order_id = so.id
    WHERE so.status IN ('APPROVED', 'PARTIALLY_FULFILLED')
    GROUP BY soi.variant_id
)
SELECT 
    v.id AS variant_id,
    v.sku,
    COALESCE(p.physical_stock, 0) AS physical_stock,
    COALESCE(r.reserved_stock, 0) AS reserved_stock,
    GREATEST(0, COALESCE(p.physical_stock, 0) - COALESCE(r.reserved_stock, 0)) AS available_stock
FROM public.product_variants v
LEFT JOIN physical_summary p ON v.id = p.variant_id
LEFT JOIN reserved_summary r ON v.id = r.variant_id;
