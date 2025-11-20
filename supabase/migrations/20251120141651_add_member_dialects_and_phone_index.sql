/*
  # Add member_dialects junction table and optimize queries
  
  1. New Tables
    - `member_dialects`
      - Junction table for many-to-many relationship between members and dialects
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key to members)
      - `dialect_id` (uuid, foreign key to dialects)
      - `created_at` (timestamptz)
      - Unique constraint on (member_id, dialect_id)
  
  2. Changes
    - Migrate existing dialect_id data to member_dialects table
    - Keep dialect_id column for backward compatibility initially
    
  3. Security
    - Enable RLS on member_dialects table
    - Add policies for public access (consistent with existing tables)
    
  4. Optimizations
    - Add index on members.phone for faster lookups
    - Add indexes on junction table foreign keys
*/

-- Create member_dialects junction table
CREATE TABLE IF NOT EXISTS public.member_dialects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  dialect_id UUID REFERENCES public.dialects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(member_id, dialect_id)
);

-- Migrate existing dialect_id data to member_dialects
INSERT INTO public.member_dialects (member_id, dialect_id)
SELECT id, dialect_id 
FROM public.members 
WHERE dialect_id IS NOT NULL
ON CONFLICT (member_id, dialect_id) DO NOTHING;

-- Enable RLS on member_dialects
ALTER TABLE public.member_dialects ENABLE ROW LEVEL SECURITY;

-- Create policies for member_dialects
CREATE POLICY "Anyone can view member_dialects" 
  ON public.member_dialects FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert member_dialects" 
  ON public.member_dialects FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can delete member_dialects" 
  ON public.member_dialects FOR DELETE 
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_member_dialects_member_id ON public.member_dialects(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dialects_dialect_id ON public.member_dialects(dialect_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_member_id ON public.member_groups(member_id);
CREATE INDEX IF NOT EXISTS idx_member_groups_group_id ON public.member_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members(is_active);
