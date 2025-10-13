-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Users can view their own tags"
ON public.tags
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
ON public.tags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
ON public.tags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
ON public.tags
FOR DELETE
USING (auth.uid() = user_id);

-- Create financial_item_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.financial_item_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_item_id UUID NOT NULL REFERENCES public.financial_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(financial_item_id, tag_id)
);

-- Enable RLS for financial_item_tags
ALTER TABLE public.financial_item_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_item_tags
CREATE POLICY "Users can view their own item tags"
ON public.financial_item_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.financial_items
    WHERE financial_items.id = financial_item_tags.financial_item_id
    AND financial_items.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own item tags"
ON public.financial_item_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.financial_items
    WHERE financial_items.id = financial_item_tags.financial_item_id
    AND financial_items.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own item tags"
ON public.financial_item_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.financial_items
    WHERE financial_items.id = financial_item_tags.financial_item_id
    AND financial_items.user_id = auth.uid()
  )
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_item_id UUID NOT NULL REFERENCES public.financial_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for attachments
CREATE POLICY "Users can view their own attachments"
ON public.attachments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attachments"
ON public.attachments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.attachments
FOR DELETE
USING (auth.uid() = user_id);

-- Create bank_reconciliation table for conciliação bancária
CREATE TABLE IF NOT EXISTS public.bank_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank TEXT NOT NULL,
  month TEXT NOT NULL,
  statement_balance DECIMAL(10,2) NOT NULL,
  system_balance DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  reconciled BOOLEAN DEFAULT false,
  reconciliation_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bank, month)
);

-- Enable RLS for bank_reconciliation
ALTER TABLE public.bank_reconciliation ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_reconciliation
CREATE POLICY "Users can view their own bank reconciliations"
ON public.bank_reconciliation
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank reconciliations"
ON public.bank_reconciliation
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank reconciliations"
ON public.bank_reconciliation
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank reconciliations"
ON public.bank_reconciliation
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on bank_reconciliation
CREATE TRIGGER update_bank_reconciliation_updated_at
BEFORE UPDATE ON public.bank_reconciliation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
