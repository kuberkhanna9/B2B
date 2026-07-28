-- Migration to support many-to-many branch assignments for B2B portal login users

-- 1. Create a junction table to map users to multiple branches
CREATE TABLE IF NOT EXISTS public.customer_user_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.customer_users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.customer_branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_user_branch UNIQUE (user_id, branch_id)
);

-- 2. Migrate existing single branch mappings from customer_users.branch_id to the new junction table
INSERT INTO public.customer_user_branches (user_id, branch_id)
SELECT id, branch_id 
FROM public.customer_users 
WHERE branch_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- 3. Note: customer_users.branch_id column is retained to preserve backward compatibility with any queries using single branch assignments.
