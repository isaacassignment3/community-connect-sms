-- Create dialects table
CREATE TABLE public.dialects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT NOT NULL,
  dialect_id UUID REFERENCES public.dialects(id) ON DELETE SET NULL,
  occupation TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create member_groups junction table (many-to-many)
CREATE TABLE public.member_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(member_id, group_id)
);

-- Create message_history table
CREATE TABLE public.message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_text TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'delivered'
  groups JSONB, -- Array of group names
  dialects JSONB, -- Array of dialect names
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sender_id TEXT,
  message_id TEXT -- Hubtel message ID
);

-- Create settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT,
  client_id TEXT,
  client_secret TEXT,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.dialects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now since no auth is mentioned)
CREATE POLICY "Anyone can view dialects" ON public.dialects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dialects" ON public.dialects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update dialects" ON public.dialects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete dialects" ON public.dialects FOR DELETE USING (true);

CREATE POLICY "Anyone can view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert groups" ON public.groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update groups" ON public.groups FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete groups" ON public.groups FOR DELETE USING (true);

CREATE POLICY "Anyone can view members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete members" ON public.members FOR DELETE USING (true);

CREATE POLICY "Anyone can view member_groups" ON public.member_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert member_groups" ON public.member_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete member_groups" ON public.member_groups FOR DELETE USING (true);

CREATE POLICY "Anyone can view message_history" ON public.message_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert message_history" ON public.message_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete message_history" ON public.message_history FOR DELETE USING (true);

CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.settings (id) VALUES (gen_random_uuid());