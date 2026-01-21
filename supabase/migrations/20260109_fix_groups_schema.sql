-- Fix groups table schema to match application expectations
-- Rename columns and convert skills to JSONB array

-- Step 1: Add new columns with correct names
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_name TEXT,
  ADD COLUMN IF NOT EXISTS project_outcomes TEXT,
  ADD COLUMN IF NOT EXISTS skills_required TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills_needed TEXT[] DEFAULT '{}';

-- Step 2: Migrate data from old columns to new ones
UPDATE public.groups
SET 
  project_name = COALESCE(name, ''),
  supervisor_name = COALESCE(supervisor, ''),
  project_outcomes = description,
  skills_required = CASE WHEN skills IS NOT NULL AND skills != '' THEN STRING_TO_ARRAY(skills, ',') ELSE '{}' END,
  skills_needed = '{}'
WHERE project_name IS NULL;

-- Step 3: Make new columns NOT NULL
ALTER TABLE public.groups
  ALTER COLUMN project_name SET NOT NULL,
  ALTER COLUMN supervisor_name SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE public.groups
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS supervisor,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS skills;

-- Create an index for faster group searches
CREATE INDEX IF NOT EXISTS idx_groups_project_name ON public.groups(project_name);
CREATE INDEX IF NOT EXISTS idx_groups_supervisor_name ON public.groups(supervisor_name);
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON public.groups(owner_id);
