-- Create SMS templates table
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS templates
CREATE POLICY "Anyone can view SMS templates" 
ON public.sms_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert SMS templates" 
ON public.sms_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update SMS templates" 
ON public.sms_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete SMS templates" 
ON public.sms_templates 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();