-- Corrigir FK de recurring_template_id e adicionar tabela para categorias por unidade

-- Ajustar constraint para apontar para recurring_templates
ALTER TABLE public.financial_items
DROP CONSTRAINT IF EXISTS financial_items_recurring_template_id_fkey;

ALTER TABLE public.financial_items
ADD CONSTRAINT financial_items_recurring_template_id_fkey
FOREIGN KEY (recurring_template_id)
REFERENCES public.recurring_templates(id)
ON DELETE SET NULL;

-- Criar tabela unit_categories para persistir categorias dinâmicas por unidade
CREATE TABLE IF NOT EXISTS public.unit_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_unit_id, type, name)
);

-- RLS e políticas
ALTER TABLE public.unit_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unit categories"
ON public.unit_categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unit categories"
ON public.unit_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unit categories"
ON public.unit_categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unit categories"
ON public.unit_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Índice para acelerar buscas por combo usuário/unidade/tipo
CREATE INDEX IF NOT EXISTS idx_unit_categories_user_unit_type
ON public.unit_categories(user_id, business_unit_id, type);

-- Trigger para manter updated_at
CREATE TRIGGER update_unit_categories_updated_at
BEFORE UPDATE ON public.unit_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
