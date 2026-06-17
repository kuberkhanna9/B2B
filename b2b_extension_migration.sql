-- b2b_extension_migration.sql
-- Run this script in your Supabase SQL Editor to extend the B2B portal schema.

-- 1. Enums for return status and return reason/type
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_APPROVED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_DISPATCHED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'COMPLETED';

DO $$
BEGIN
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
            'OTHER'
        );
    END IF;
END$$;

-- 2. Create customer_branches table
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

-- 3. Create order_sources table
CREATE TABLE IF NOT EXISTS public.order_sources (
    id VARCHAR(100) PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL
);

-- Seed order sources
INSERT INTO public.order_sources (id, source_name) VALUES
('CUSTOMER_PORTAL', 'Customer Portal'),
('ADMIN_CREATED', 'Admin Created'),
('WHATSAPP', 'WhatsApp'),
('PHONE', 'Phone Call'),
('EMAIL', 'Email')
ON CONFLICT (id) DO NOTHING;

-- 4. Alter sales_orders to link branch and source
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.customer_branches(id) ON DELETE RESTRICT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS source_id VARCHAR(100) REFERENCES public.order_sources(id) ON DELETE RESTRICT;

-- Set default source_id for existing sales_orders
UPDATE public.sales_orders SET source_id = 'CUSTOMER_PORTAL' WHERE source_id IS NULL;

-- 5. Create custom_order_items table
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

-- 6. Create return_requests table
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
    created_by UUID NOT NULL, -- references customer_users.id or profiles.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create return_request_items table
CREATE TABLE IF NOT EXISTS public.return_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    custom_item_name VARCHAR(255), -- if returning a custom non-SKU item
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 8. Create return_attachments table
CREATE TABLE IF NOT EXISTS public.return_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    file_url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Create return_resolutions table
CREATE TABLE IF NOT EXISTS public.return_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    resolution_type VARCHAR(100) NOT NULL, -- e.g. Replace, Credit Note, Refund, Repair, Reject Claim
    remarks VARCHAR(1000),
    resolved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Enable RLS and Create Policies
ALTER TABLE public.customer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_resolutions ENABLE ROW LEVEL SECURITY;

-- Select policies
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

-- 11. Add old_value and new_value columns to audit_logs for diff tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;

