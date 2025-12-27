-- Add new columns to artifacts table
ALTER TABLE public.artifacts 
ADD COLUMN catalog_number text DEFAULT NULL,
ADD COLUMN donation text DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.artifacts.catalog_number IS 'Numéro de catalogue';
COMMENT ON COLUMN public.artifacts.donation IS 'Don (donation information)';