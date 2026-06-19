-- b2b_claims_migration.sql
-- Run this script in your Supabase SQL Editor to add the return_claim_images table.

CREATE TABLE IF NOT EXISTS public.return_claim_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
    image_url VARCHAR(1000) NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
