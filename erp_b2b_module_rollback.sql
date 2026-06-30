-- erp_b2b_module_rollback.sql
-- Safely reverts the B2B ERP upgrade.
-- Removes ONLY the database objects introduced by the B2B module.
-- DOES NOT DROP or modify any existing Inventory ERP tables or warehouse data.

-- =============================================================================
-- 1. DROP B2B VIEWS
-- =============================================================================
DROP VIEW IF EXISTS public.inventory_availability CASCADE;

-- =============================================================================
-- 2. DROP B2B TABLES (In reverse dependency order)
-- =============================================================================
DROP TABLE IF EXISTS public.custom_order_items CASCADE;
DROP TABLE IF EXISTS public.customer_ledger CASCADE;
DROP TABLE IF EXISTS public.order_activity_logs CASCADE;
DROP TABLE IF EXISTS public.customer_notifications CASCADE;
DROP TABLE IF EXISTS public.customer_price_overrides CASCADE;
DROP TABLE IF EXISTS public.payment_references CASCADE;
DROP TABLE IF EXISTS public.return_resolutions CASCADE;
DROP TABLE IF EXISTS public.claim_attachments CASCADE;
DROP TABLE IF EXISTS public.claims CASCADE;
DROP TABLE IF EXISTS public.return_attachments CASCADE;
DROP TABLE IF EXISTS public.return_items CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP TABLE IF EXISTS public.invoice_metadata CASCADE;
DROP TABLE IF EXISTS public.dispatch_items CASCADE;
DROP TABLE IF EXISTS public.dispatches CASCADE;
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.customer_users CASCADE;
DROP TABLE IF EXISTS public.customer_branches CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Drop B2B RBAC tables
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- =============================================================================
-- 3. REVERT AUDIT_LOGS TABLE EXTENSION
-- =============================================================================
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS username;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS role;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS entity;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS old_value;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS new_value;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS user_agent;

-- =============================================================================
-- 4. DROP B2B ENUM TYPES
-- =============================================================================
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS dispatch_status CASCADE;
DROP TYPE IF EXISTS payment_mode CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;
DROP TYPE IF EXISTS return_type CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS ledger_reference_type CASCADE;
DROP TYPE IF EXISTS customer_status CASCADE;
