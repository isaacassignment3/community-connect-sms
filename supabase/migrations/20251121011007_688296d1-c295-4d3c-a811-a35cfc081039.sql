-- Create member_dialects junction table
CREATE TABLE IF NOT EXISTS public.member_dialects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  dialect_id UUID NOT NULL REFERENCES public.dialects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, dialect_id)
);

-- Enable RLS
ALTER TABLE public.member_dialects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for member_dialects
CREATE POLICY "Anyone can view member dialects"
  ON public.member_dialects FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert member dialects"
  ON public.member_dialects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update member dialects"
  ON public.member_dialects FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete member dialects"
  ON public.member_dialects FOR DELETE
  USING (true);

-- Remove dialect_id column from members table
ALTER TABLE public.members DROP COLUMN IF EXISTS dialect_id;