-- Create business_units table
CREATE TABLE IF NOT EXISTS public.business_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'building',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS for business_units
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Create policies for business_units
CREATE POLICY "Users can view their own business units"
ON public.business_units
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business units"
ON public.business_units
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business units"
ON public.business_units
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business units"
ON public.business_units
FOR DELETE
USING (auth.uid() = user_id);

-- Add business_unit_id column to financial_items
ALTER TABLE public.financial_items
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_items_business_unit
ON public.financial_items(business_unit_id);

-- Function to create default business units for a user
CREATE OR REPLACE FUNCTION public.create_default_business_units(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.business_units (name, color, icon, user_id)
  VALUES
    ('Apartamento', '#ef4444', 'home', p_user_id),
    ('Escritório', '#3b82f6', 'briefcase', p_user_id),
    ('Viagens e Lazer', '#8b5cf6', 'plane', p_user_id),
    ('Vida Esportiva', '#10b981', 'dumbbell', p_user_id),
    ('Compras Pessoais', '#f59e0b', 'shopping-bag', p_user_id),
    ('Go On Outdoor', '#14b8a6', 'mountain', p_user_id),
    ('Carro', '#6366f1', 'car', p_user_id),
    ('Comida', '#ec4899', 'utensils', p_user_id)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Trigger to create default business units for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_business_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_default_business_units(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_business_units'
  ) THEN
    CREATE TRIGGER on_auth_user_created_business_units
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_business_units();
  END IF;
END
$$;

-- Create default business units for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    PERFORM public.create_default_business_units(user_record.id);
  END LOOP;
END
$$;
