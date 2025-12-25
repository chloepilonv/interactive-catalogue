-- Create artifacts table
CREATE TABLE public.artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled',
  date TEXT DEFAULT 'Unknown date',
  description TEXT DEFAULT 'No description available.',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (visitors can view artifacts)
CREATE POLICY "Anyone can view artifacts" 
ON public.artifacts 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage artifacts (admin)
CREATE POLICY "Authenticated users can insert artifacts" 
ON public.artifacts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update artifacts" 
ON public.artifacts 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete artifacts" 
ON public.artifacts 
FOR DELETE 
TO authenticated
USING (true);

-- Create storage bucket for artifact photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artifacts', 'artifacts', true);

-- Storage policies for artifact photos
CREATE POLICY "Anyone can view artifact photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artifacts');

CREATE POLICY "Authenticated users can upload artifact photos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'artifacts');

CREATE POLICY "Authenticated users can update artifact photos" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'artifacts');

CREATE POLICY "Authenticated users can delete artifact photos" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'artifacts');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artifacts_updated_at
BEFORE UPDATE ON public.artifacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();