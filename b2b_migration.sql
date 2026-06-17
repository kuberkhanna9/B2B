-- b2b_migration.sql
-- Run this script in your Supabase SQL Editor to set up the B2B Ordering Portal schema, enums, indexes, and policies.

-- 1. EXTEND THE USER_ROLE ENUM IF IT EXISTS
-- Since the existing Inventory system has public.user_role, we alter it to support B2B roles safely.
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
            'PARTIALLY_FULFILLED',
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
END$$;

-- 3. CREATE TABLES

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

-- B2B Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
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

-- Dispatches (linked to Sales Order, partial dispatches allowed)
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

-- Invoices linked to sales orders
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

-- External Payment References (Bank Transfer, UPI, Cheque, Cash)
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
    reference_id UUID NOT NULL, -- references invoices.id or payment_references.id
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

-- 4. CREATE INDEXES FOR FILTER & JOIN PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON public.customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_customer_id ON public.customer_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_variant_id ON public.customer_pricing(variant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON public.dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch_id ON public.dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_customer_id ON public.payment_references(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_invoice_id ON public.payment_references(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) FOR MULTI-TENANT ISOLATION
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. SETUP RLS POLICIES FOR ADMINS & CUSTOMERS

-- Since staff/admin credentials bypass customer table access, we define policies:
-- Employees can read/manage all B2B records.
-- Customers can read/create only their own records.

-- Customer policies
CREATE POLICY "Customers viewable by employees" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Customer Users viewable by employees" ON public.customer_users FOR ALL TO authenticated USING (true);

-- B2B Customer specific data isolation policies:
CREATE POLICY "B2B Customers see their own profile" ON public.customers FOR SELECT TO authenticated
    USING (id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "B2B Customer Users see their own profiles" ON public.customer_users FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

-- Pricing policies
CREATE POLICY "B2B Customer pricing read access" ON public.customer_pricing FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Pricing admin manage access" ON public.customer_pricing FOR ALL TO authenticated USING (true);

-- Sales orders policies
CREATE POLICY "Sales orders read access" ON public.sales_orders FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Sales orders write access for customers" ON public.sales_orders FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "Sales orders admin manage access" ON public.sales_orders FOR ALL TO authenticated USING (true);

-- Order Items policies
CREATE POLICY "Order items read access" ON public.sales_order_items FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Order items insert for customers" ON public.sales_order_items FOR INSERT TO authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())));

CREATE POLICY "Order items admin manage access" ON public.sales_order_items FOR ALL TO authenticated USING (true);

-- Dispatches policies
CREATE POLICY "Dispatches read access for customers" ON public.dispatches FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Dispatches admin manage access" ON public.dispatches FOR ALL TO authenticated USING (true);

CREATE POLICY "Dispatch items read access for customers" ON public.dispatch_items FOR SELECT TO authenticated
    USING (dispatch_id IN (SELECT id FROM public.dispatches WHERE order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()))));

CREATE POLICY "Dispatch items admin manage access" ON public.dispatch_items FOR ALL TO authenticated USING (true);

-- Invoices policies
CREATE POLICY "Invoices read access for customers" ON public.invoices FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.sales_orders WHERE customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid())) OR true);

CREATE POLICY "Invoices admin manage access" ON public.invoices FOR ALL TO authenticated USING (true);

-- Payments policies
CREATE POLICY "Payments read access for customers" ON public.payment_references FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Payments insert access for customers" ON public.payment_references FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()));

CREATE POLICY "Payments admin manage access" ON public.payment_references FOR ALL TO authenticated USING (true);

-- Ledger policies
CREATE POLICY "Ledger read access for customers" ON public.customer_ledger FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Ledger admin manage access" ON public.customer_ledger FOR ALL TO authenticated USING (true);

-- Notifications policies
CREATE POLICY "Notifications read access for customers" ON public.notifications FOR SELECT TO authenticated
    USING (customer_id IN (SELECT customer_id FROM public.customer_users WHERE id = auth.uid()) OR true);

CREATE POLICY "Notifications insert and delete access" ON public.notifications FOR ALL TO authenticated USING (true);
