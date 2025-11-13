--
-- PostgreSQL database dump
--

\restrict hxjY4tDPL0WMavgzgTNMOoQvALcY5Tukm3YX4ddot0ebjINE9Kfwp3XrBLUIdxt

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: create_default_business_units(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_business_units(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: create_installment_purchase(uuid, text, numeric, text, text, text, uuid, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_installment_purchase(p_user_id uuid, p_type text, p_total_amount numeric, p_description text, p_category text, p_credit_card text, p_business_unit_id uuid, p_start_date date, p_total_installments integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_group_id UUID;
  v_installment_amount DECIMAL;
  v_current_date DATE;
BEGIN
  v_group_id := gen_random_uuid();
  v_installment_amount := ROUND(p_total_amount / p_total_installments, 2);

  FOR i IN 1..p_total_installments LOOP
    v_current_date := p_start_date + ((i - 1) * INTERVAL '1 month');

    INSERT INTO public.financial_items (
      user_id,
      date,
      type,
      amount,
      description,
      category,
      credit_card,
      bank,
      business_unit_id,
      source,
      is_installment,
      installment_number,
      total_installments,
      installment_group_id
    ) VALUES (
      p_user_id,
      v_current_date,
      p_type,
      v_installment_amount,
      p_description || ' (' || i || '/' || p_total_installments || ')',
      p_category,
      p_credit_card,
      COALESCE(p_credit_card, 'N/A'),
      p_business_unit_id,
      'installment',
      true,
      i,
      p_total_installments,
      v_group_id
    );
  END LOOP;

  RETURN v_group_id;
END;
$$;


--
-- Name: generate_pending_recurring_expenses(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pending_recurring_expenses(target_user_id uuid, target_month date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.financial_items (
    user_id,
    date,
    type,
    amount,
    description,
    category,
    business_unit_id,
    credit_card,
    bank,
    source,
    is_recurring,
    recurring_template_id,
    recurring_status
  )
  SELECT
    rt.user_id,
    target_month,
    rt.type,
    rt.amount,
    rt.description,
    rt.category,
    rt.business_unit_id,
    rt.credit_card,
    COALESCE(rt.credit_card, 'N/A'),
    'recurring_auto',
    true,
    rt.id,
    'pending'
  FROM public.recurring_templates rt
  WHERE rt.user_id = target_user_id
    AND rt.is_active = true
    AND (rt.last_generated_month IS NULL OR rt.last_generated_month < target_month)
    AND NOT EXISTS (
      SELECT 1 FROM public.financial_items fi
      WHERE fi.recurring_template_id = rt.id
        AND DATE_TRUNC('month', fi.date) = DATE_TRUNC('month', target_month)
    );

  UPDATE public.recurring_templates
  SET
    last_generated_month = target_month,
    updated_at = now()
  WHERE user_id = target_user_id
    AND is_active = true
    AND (last_generated_month IS NULL OR last_generated_month < target_month);
END;
$$;


--
-- Name: handle_new_user_business_units(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_business_units() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.create_default_business_units(NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Usuário'),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_profiles_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profiles_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bank_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bank_name text NOT NULL,
    initial_balance numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    baseline_date date DEFAULT (now())::date NOT NULL
);


--
-- Name: bill_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bill_id uuid NOT NULL,
    month character varying(7) NOT NULL,
    adjusted_value numeric NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#3b82f6'::text,
    icon text DEFAULT 'building'::text,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credit_card_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_card_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    description text NOT NULL,
    card text NOT NULL,
    value numeric NOT NULL,
    type text NOT NULL,
    parcelas integer,
    observacao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_card_charges_card_check CHECK ((card = ANY (ARRAY['C6 Pessoal'::text, 'Conta Simples Empresa'::text]))),
    CONSTRAINT credit_card_charges_type_check CHECK ((type = ANY (ARRAY['recorrente'::text, 'parcelado'::text])))
);


--
-- Name: credit_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    due_day integer NOT NULL,
    closing_day integer NOT NULL,
    credit_limit numeric(10,2),
    color text DEFAULT '#3b82f6'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT credit_cards_closing_day_check CHECK (((closing_day >= 1) AND (closing_day <= 31))),
    CONSTRAINT credit_cards_due_day_check CHECK (((due_day >= 1) AND (due_day <= 31)))
);


--
-- Name: TABLE credit_cards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.credit_cards IS 'Cartões de crédito cadastrados pelo usuário';


--
-- Name: financial_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text NOT NULL,
    bank text NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_unit_id uuid,
    is_recurring boolean DEFAULT false,
    recurring_template_id uuid,
    recurring_status text,
    credit_card text,
    is_installment boolean DEFAULT false,
    installment_number integer,
    total_installments integer,
    installment_group_id uuid,
    needs_review boolean DEFAULT false,
    imported_from text,
    installment_start_month date,
    installment_end_month date,
    CONSTRAINT financial_items_recurring_status_check CHECK ((recurring_status = ANY (ARRAY['pending'::text, 'approved'::text, 'skipped'::text]))),
    CONSTRAINT financial_items_type_check CHECK ((type = ANY (ARRAY['entrada'::text, 'saida'::text])))
);


--
-- Name: COLUMN financial_items.needs_review; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.financial_items.needs_review IS 'Indica se o lançamento foi importado e precisa de revisão manual para categorização';


--
-- Name: COLUMN financial_items.imported_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.financial_items.imported_from IS 'Origem da importação (ex: "PDF - C6 Bank", "CSV - Nubank")';


--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credit_card_id uuid NOT NULL,
    reference_month date NOT NULL,
    invoice_amount numeric(10,2) NOT NULL,
    paid boolean DEFAULT false,
    payment_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE invoice_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.invoice_payments IS 'Pagamentos de faturas de cartão de crédito';


--
-- Name: credit_card_invoices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.credit_card_invoices AS
 SELECT cc.id AS credit_card_id,
    cc.user_id,
    cc.name AS card_name,
    cc.due_day,
    cc.closing_day,
    cc.color,
    (date_trunc('month'::text, (fi.date)::timestamp with time zone))::date AS reference_month,
    count(fi.id) AS total_items,
    count(
        CASE
            WHEN fi.is_recurring THEN 1
            ELSE NULL::integer
        END) AS recurring_items,
    count(
        CASE
            WHEN fi.is_installment THEN 1
            ELSE NULL::integer
        END) AS installment_items,
    COALESCE(sum(fi.amount), (0)::numeric) AS total_amount,
    COALESCE(sum(
        CASE
            WHEN fi.is_recurring THEN fi.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS recurring_amount,
    COALESCE(sum(
        CASE
            WHEN fi.is_installment THEN fi.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS installment_amount,
    COALESCE(ip.paid, false) AS is_paid,
    ip.payment_date,
    ip.notes
   FROM ((public.credit_cards cc
     LEFT JOIN public.financial_items fi ON (((fi.credit_card = cc.name) AND (fi.user_id = cc.user_id) AND (fi.type = 'saida'::text))))
     LEFT JOIN public.invoice_payments ip ON (((ip.credit_card_id = cc.id) AND (ip.reference_month = (date_trunc('month'::text, (fi.date)::timestamp with time zone))::date))))
  WHERE (cc.is_active = true)
  GROUP BY cc.id, cc.user_id, cc.name, cc.due_day, cc.closing_day, cc.color, ((date_trunc('month'::text, (fi.date)::timestamp with time zone))::date), ip.paid, ip.payment_date, ip.notes
  ORDER BY ((date_trunc('month'::text, (fi.date)::timestamp with time zone))::date) DESC NULLS LAST, cc.name;


--
-- Name: financial_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    month date NOT NULL,
    category text NOT NULL,
    total_value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: financial_summary_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_summary_income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    month date NOT NULL,
    source text NOT NULL,
    total_value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investment_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    investment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    bank text,
    description text,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT investment_transactions_type_check CHECK ((type = ANY (ARRAY['aporte'::text, 'retirada'::text])))
);


--
-- Name: investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    initial_amount numeric DEFAULT 0 NOT NULL,
    current_balance numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: não desligamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."não desligamento" (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    campo text DEFAULT 'teste'::text,
    "off/on" boolean DEFAULT false
);


--
-- Name: não desligamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."não desligamento" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."não desligamento_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: recurring_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    value numeric(10,2) NOT NULL,
    category text NOT NULL,
    due_date integer NOT NULL,
    bank text NOT NULL,
    recurring boolean DEFAULT true NOT NULL,
    paid_this_month boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurring_bills_bank_check CHECK (((bank IS NULL) OR (bank = ''::text) OR (bank = ANY (ARRAY['CONTA SIMPLES'::text, 'BRADESCO'::text, 'C6 BANK'::text, 'ASAAS'::text, 'NOMAD'::text])))),
    CONSTRAINT recurring_bills_due_date_check CHECK (((due_date >= 1) AND (due_date <= 31)))
);


--
-- Name: recurring_bills_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_bills_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bill_id uuid NOT NULL,
    month_reference date NOT NULL,
    valor_ajustado numeric,
    pago boolean DEFAULT false NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recurring_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    business_unit_id uuid,
    credit_card text,
    is_active boolean DEFAULT true,
    last_generated_month date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_templates_type_check CHECK ((type = ANY (ARRAY['entrada'::text, 'saida'::text])))
);


--
-- Name: TABLE recurring_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recurring_templates IS 'Templates para gerar automaticamente contas recorrentes a cada mês';


--
-- Name: unit_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_unit_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unit_categories_type_check CHECK ((type = ANY (ARRAY['entrada'::text, 'saida'::text])))
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    onboarding_completed boolean DEFAULT false,
    theme_color text DEFAULT '#f97316'::text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: bank_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_balances (id, user_id, bank_name, initial_balance, created_at, updated_at, baseline_date) FROM stdin;
65a9e5c8-102c-4e33-b8db-de566668ab2f	26bac8f5-5b37-4151-a95c-247251b8556d	NUBANK	2609.81	2025-06-02 20:06:42.775844+00	2025-08-19 21:42:47.764+00	2025-08-19
ae7a1a57-c3cf-4095-8acd-6a6410bfdeca	a3b12ed2-9440-40d9-9293-3c20e778dd74	ASAAS	417.82	2025-05-29 22:25:42.592397+00	2025-10-15 15:38:49.813+00	2025-10-15
a5ed0942-5de7-4637-87af-e269bdcf61d5	a3b12ed2-9440-40d9-9293-3c20e778dd74	BRADESCO	0	2025-05-29 22:25:42.592397+00	2025-10-15 15:38:49.813+00	2025-10-15
91bdbe5d-82fe-4404-8605-609a45e128be	a3b12ed2-9440-40d9-9293-3c20e778dd74	C6 BANK	7028.47	2025-05-29 22:25:42.592397+00	2025-10-15 15:38:49.813+00	2025-10-15
b8060f97-f33e-4124-9558-7acbbad4d257	a3b12ed2-9440-40d9-9293-3c20e778dd74	CONTA SIMPLES	79.12	2025-05-29 22:25:42.592397+00	2025-10-15 15:38:49.813+00	2025-10-15
62626065-e362-49b8-807f-2f7a2a93ea7f	a3b12ed2-9440-40d9-9293-3c20e778dd74	N/A	0	2025-10-15 15:38:37.192403+00	2025-10-15 15:38:49.813+00	2025-10-15
9f127080-3592-45fc-a688-9b5ac4eb7360	a3b12ed2-9440-40d9-9293-3c20e778dd74	NOMAD	355	2025-05-29 22:25:42.592397+00	2025-10-15 15:38:49.813+00	2025-10-15
7cc657c7-19f4-426c-b3cb-60d27dce312d	a3b12ed2-9440-40d9-9293-3c20e778dd74	NUBANK	1655.26	2025-10-15 15:38:37.368165+00	2025-10-15 15:38:49.813+00	2025-10-15
\.


--
-- Data for Name: bill_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_adjustments (id, bill_id, month, adjusted_value, user_id, created_at, updated_at) FROM stdin;
5fa5fbaf-6568-4072-85c0-fea9fb5ee36b	51e4d520-1615-41e9-9eab-22152a293594	2025-06	0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 14:14:48.345276+00	2025-06-01 14:14:48.345276+00
d6ff3746-5d6e-413f-8bf0-1241a9693445	51e4d520-1615-41e9-9eab-22152a293594	2025-08	1290	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 14:20:15.930272+00	2025-06-01 14:20:15.930272+00
94480c63-5f26-49ec-b287-8a9ab7bf0617	413e06fd-3325-4c0e-a71d-ef9351aedcc8	2025-08	1290	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 14:21:25.822134+00	2025-06-01 14:21:25.822134+00
\.


--
-- Data for Name: business_units; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_units (id, name, color, icon, user_id, created_at) FROM stdin;
a0474ded-9032-4ab2-a030-0078a7769bee	Apartamento	#ef4444	home	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
fecf767c-1f75-48d3-bd07-57151156e410	Escritório	#3b82f6	briefcase	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
58fd25af-943d-46bb-9e08-f4a21d511861	Viagens e Lazer	#8b5cf6	plane	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
d6400a44-2141-4281-939a-4ac569776d8f	Vida Esportiva	#10b981	dumbbell	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
ff0a1b5d-7ada-4a3b-9485-5076f779f6d1	Compras Pessoais	#f59e0b	shopping-bag	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
697d8189-00d4-49cb-b801-2e7e4ff69c95	Go On Outdoor	#14b8a6	mountain	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
8c76f32b-0dcc-4fdb-9505-28825d525bf4	Carro	#6366f1	car	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
1155b9a3-afd5-4e6b-b96d-9b87c9afd444	Comida	#ec4899	utensils	26bac8f5-5b37-4151-a95c-247251b8556d	2025-10-12 18:49:21.805541+00
786da91f-5e21-488b-8e08-95f9d3e656a0	Apartamento	#ef4444	home	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
b1acfd71-5320-4cc8-9aae-45664bcdb96e	Escritório	#3b82f6	briefcase	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	Viagens e Lazer	#8b5cf6	plane	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
aa3b9d18-94aa-436f-b437-73af0d14aff9	Vida Esportiva	#10b981	dumbbell	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
d4a8bdf9-d796-44dc-9498-553076c57748	Compras Pessoais	#f59e0b	shopping-bag	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	Go On Outdoor	#14b8a6	mountain	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
42f47fc8-1503-4707-9b73-642aefe4cc6b	Carro	#6366f1	car	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
7869eb2b-eb82-438e-b28b-1db1540bd948	Comida	#ec4899	utensils	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:49:21.805541+00
f988ac81-dd3d-49db-bb82-135068b90a38	Filhos	#f97316	baby	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-25 00:37:12.238269+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, user_id, name, created_at, updated_at) FROM stdin;
f96ce8b8-0dae-4843-adc8-c68963973d83	a3b12ed2-9440-40d9-9293-3c20e778dd74	Apartamento	2025-05-29 23:25:39.205678+00	2025-05-29 23:25:39.205678+00
\.


--
-- Data for Name: credit_card_charges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_card_charges (id, user_id, description, card, value, type, parcelas, observacao, ativo, created_at, updated_at) FROM stdin;
5efc31e7-4e69-4d0c-80a1-f5ea6ea58455	a3b12ed2-9440-40d9-9293-3c20e778dd74	ChatGPT Plus	C6 Pessoal	99.9	recorrente	\N		t	2025-06-01 14:08:47.533957+00	2025-06-01 14:08:47.533957+00
656d6ee5-a106-46f9-a4b7-7c7610b745ba	a3b12ed2-9440-40d9-9293-3c20e778dd74	Pacote Adobe	C6 Pessoal	165	recorrente	\N		t	2025-06-01 14:09:05.534295+00	2025-06-01 14:09:05.534295+00
1d5b2b36-e9c2-4f85-9bd1-266aa8839cc2	a3b12ed2-9440-40d9-9293-3c20e778dd74	Spotify Familia	C6 Pessoal	27.9	recorrente	\N		t	2025-06-01 14:09:20.284741+00	2025-06-01 14:09:20.284741+00
39f97baa-eed4-4a48-bf49-2a6893c625e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	Cloud Apple	C6 Pessoal	4.9	recorrente	\N		t	2025-06-01 14:09:40.171773+00	2025-06-01 14:09:40.171773+00
06e9f54c-b068-4362-91be-e792a8c04d29	a3b12ed2-9440-40d9-9293-3c20e778dd74	TIM - Marcela	C6 Pessoal	66.99	recorrente	\N		t	2025-06-01 14:10:02.123252+00	2025-06-01 14:10:02.123252+00
9d06845d-d558-4f16-a0fa-88e25eb665c1	a3b12ed2-9440-40d9-9293-3c20e778dd74	TIM - Wesley Pessoal	C6 Pessoal	60.99	recorrente	\N		t	2025-06-01 14:10:15.87208+00	2025-06-01 14:10:15.87208+00
04e356e8-4323-43d4-bab0-df1b4376a067	a3b12ed2-9440-40d9-9293-3c20e778dd74	CapCut Marcela	C6 Pessoal	32.9	recorrente	\N		t	2025-06-01 14:11:31.670469+00	2025-06-01 14:11:31.670469+00
96de6c64-e122-4439-890b-49d5367779be	a3b12ed2-9440-40d9-9293-3c20e778dd74	Inscrição La Mision - Marcela	C6 Pessoal	45.05	parcelado	3		t	2025-06-01 14:12:16.912092+00	2025-06-01 14:12:16.912092+00
dace803c-57f0-4952-812c-40831078d91f	a3b12ed2-9440-40d9-9293-3c20e778dd74	Inscrição La Mision - Wesley	C6 Pessoal	75.65	parcelado	3		t	2025-06-01 14:11:52.854139+00	2025-06-01 14:11:52.854139+00
7b141030-3468-48dc-8ac0-273031826607	a3b12ed2-9440-40d9-9293-3c20e778dd74	Claro TV	C6 Pessoal	89.9	recorrente	\N		t	2025-06-01 14:36:13.919353+00	2025-06-01 14:36:13.919353+00
42e30102-f6cd-4d75-b132-634383627bd1	a3b12ed2-9440-40d9-9293-3c20e778dd74	Tratamento PhysioNow	C6 Pessoal	850	parcelado	2		t	2025-06-29 23:01:52.919135+00	2025-06-29 23:01:52.919135+00
b441d8df-379b-42c1-851b-50b054a703f7	a3b12ed2-9440-40d9-9293-3c20e778dd74	Youtube premium	Conta Simples Empresa	26.9	recorrente	\N		t	2025-06-29 23:06:45.068051+00	2025-06-29 23:06:45.068051+00
29b1401c-c023-467d-88e3-a2a4369fdb77	a3b12ed2-9440-40d9-9293-3c20e778dd74	Spotify	C6 Pessoal	27.9	recorrente	\N		t	2025-08-03 22:56:35.747044+00	2025-08-03 22:56:35.747044+00
5f854196-8a2f-4720-bc34-f2703092484b	a3b12ed2-9440-40d9-9293-3c20e778dd74	Airbnb Passa 4 - domingo	C6 Pessoal	250	parcelado	1		t	2025-08-03 22:57:54.279336+00	2025-08-03 22:57:54.279336+00
80a1f7d1-1a9c-4262-b061-4a684aba215b	a3b12ed2-9440-40d9-9293-3c20e778dd74	Passagens La Mision	C6 Pessoal	295.49	parcelado	2		t	2025-08-03 22:58:50.005119+00	2025-08-03 22:58:50.005119+00
fd03b1e8-27e9-493b-addb-6bdc872002a4	a3b12ed2-9440-40d9-9293-3c20e778dd74	Lovable	Conta Simples Empresa	89.55	recorrente	\N		t	2025-06-29 23:07:10.875548+00	2025-06-29 23:07:10.875548+00
6ddb7e5e-f292-4b87-8f4f-5744f71baa70	a3b12ed2-9440-40d9-9293-3c20e778dd74	API Open AI	Conta Simples Empresa	59.67	recorrente	\N		t	2025-08-03 23:01:16.417994+00	2025-08-03 23:01:16.417994+00
25f720af-ab2d-40c7-aaf6-4db0c417e467	a3b12ed2-9440-40d9-9293-3c20e778dd74	Framer Go On Outdoor	Conta Simples Empresa	80.57	recorrente	\N		t	2025-06-01 21:49:15.865746+00	2025-06-01 21:49:15.865746+00
59bd52ea-22e4-40ed-942e-9c60eaf85d9a	a3b12ed2-9440-40d9-9293-3c20e778dd74	Google One	Conta Simples Empresa	96.99	recorrente	\N		t	2025-06-29 23:08:08.415207+00	2025-06-29 23:08:08.415207+00
81d64620-6c0a-4b53-953d-672598df9c1d	a3b12ed2-9440-40d9-9293-3c20e778dd74	Meta ads Go On	Conta Simples Empresa	14.64	parcelado	1		t	2025-06-29 23:05:05.602747+00	2025-06-29 23:05:05.602747+00
\.


--
-- Data for Name: credit_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_cards (id, user_id, name, due_day, closing_day, credit_limit, color, is_active, created_at, updated_at) FROM stdin;
df6e3de1-c1f3-4c44-93be-31e38db2dd80	a3b12ed2-9440-40d9-9293-3c20e778dd74	C6 Bank	15	7	21000.00	#3b82f6	t	2025-10-14 01:46:05.977722+00	2025-10-15 15:06:49.633576+00
10afe38b-ee7b-402d-8fbd-ac1d2c9d0b68	a3b12ed2-9440-40d9-9293-3c20e778dd74	Conta Simples	7	31	1000.00	#10b981	t	2025-10-15 15:07:51.354723+00	2025-10-15 15:07:51.354723+00
\.


--
-- Data for Name: financial_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_items (id, user_id, date, type, description, amount, category, bank, source, created_at, updated_at, business_unit_id, is_recurring, recurring_template_id, recurring_status, credit_card, is_installment, installment_number, total_installments, installment_group_id, needs_review, imported_from, installment_start_month, installment_end_month) FROM stdin;
eb4ef114-922a-416c-bc9b-286b4392bc26	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-30	saida	Aluguel Junho 2025	2893.94	Apartamento	C6 BANK	\N	2025-06-01 12:45:56.722543+00	2025-06-01 12:45:56.722543+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d198c12a-96b4-49fd-860a-c967ec3ac2fc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-02	saida	Costela - Almoço Laura Domingo	97.00	Comida	C6 BANK	\N	2025-06-01 14:59:50.950133+00	2025-06-01 14:59:50.950133+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3beb4adc-fabc-498c-847a-30f10fb4ff90	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-02	entrada	Ajuste Caixa Conta Simples	372.03	Outras receitas	CONTA SIMPLES	\N	2025-06-01 22:13:24.850866+00	2025-06-01 22:13:24.850866+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3bca1e7d-5673-43df-a919-accb41630b02	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Pagamento cartão da empresa	462.13	Escritório	CONTA SIMPLES	\N	2025-06-01 22:20:22.896536+00	2025-06-01 22:20:22.896536+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
272ff99a-19f6-4e6d-a26c-2753db434c2a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-02	saida	Ultra Gaz	190.93	Apartamento	C6 BANK	\N	2025-06-01 22:30:56.69313+00	2025-06-01 22:30:56.69313+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
68ad4289-7659-4f75-b466-6a2cdf0676bc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01	saida	Energia Elétrica Copel	60.87	Apartamento	C6 BANK	\N	2025-06-01 22:32:43.021652+00	2025-06-01 22:32:43.021652+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
17021bf0-afc9-4712-b4ba-14922c867ae2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01	saida	Internet Vivo Apartamento	156.00	Apartamento	C6 BANK	\N	2025-06-01 22:39:49.185204+00	2025-06-01 22:39:49.185204+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
78f84e5b-0053-4e89-b97a-b8b95661e4ce	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-02	saida	Alexa Amazon	429.00	Itens Físicos	C6 BANK	\N	2025-06-02 13:20:19.461366+00	2025-06-02 13:20:19.461366+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8cad90a0-c8d8-4b41-9d36-38ca99d143e5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Decathlon	160.94	Vida esportiva	C6 BANK	\N	2025-06-15 16:04:55.35653+00	2025-06-15 16:04:55.35653+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2047cb96-e1f4-4595-bd36-d1c150d9d42f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-06	saida	cacau show	33.94	Comida	NUBANK	\N	2025-06-15 17:01:30.339114+00	2025-06-15 17:01:30.339114+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5184411d-3f37-416d-8b9f-3c1a5486fc37	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-03	saida	Frete camisetas Go On	211.58	Go On Outdoor	C6 BANK	\N	2025-06-03 12:41:13.960798+00	2025-06-03 12:41:13.960798+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
29fbc574-ab9f-4fc5-89d5-533384f20e24	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-03	saida	Impressão etiquetas 	8.40	Go On Outdoor	C6 BANK	\N	2025-06-03 15:13:19.370485+00	2025-06-03 15:13:19.370485+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5d40602f-0703-4ef7-839d-1e0d8e01c895	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-04	saida	Contabilidade	200.00	Escritório	C6 BANK	\N	2025-06-04 20:57:11.594324+00	2025-06-04 20:57:11.594324+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
edfc35ee-5ff4-4238-a57f-b02023afc4f2	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-06	saida	uber	75.49	Carro	NUBANK	\N	2025-06-15 17:02:37.713268+00	2025-06-15 17:02:37.713268+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c877bd3a-8c0b-4c34-8e64-5a6c987aa7e9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-04	saida	Fisioterapia	314.00	Vida esportiva	C6 BANK	\N	2025-06-04 21:19:35.194076+00	2025-06-04 21:19:35.194076+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
01ba3a16-e221-4c6d-b504-7c4214850406	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-02	saida	Pascal	9.27	Comida	NUBANK	\N	2025-06-04 22:55:38.330734+00	2025-06-04 22:55:38.330734+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e95fa3f5-4417-4f7c-b5e3-b5d059a0e467	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-03	saida	Daju (lençol e toalhas de banho)	294.68	Apartamento	NUBANK	\N	2025-06-04 22:56:35.352409+00	2025-06-04 22:56:35.352409+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8aab324f-6e57-472b-869f-7a08f12caab5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-03	saida	Compras Condor	272.40	Comida	NUBANK	\N	2025-06-04 22:56:57.967325+00	2025-06-04 22:56:57.967325+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6c53a573-c941-44a8-b56c-b8f86804871a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-04	saida	Pascal	18.40	Comida	NUBANK	\N	2025-06-04 22:57:24.980553+00	2025-06-04 22:57:24.980553+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b40024df-492e-4cfe-95d8-a5f30d4ec932	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-04	entrada	Estorno Go On (carta camp + caixinhas)	291.25	Go On Outdoor	NUBANK	\N	2025-06-04 22:58:09.806198+00	2025-06-04 22:58:09.806198+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
72396923-921d-4f36-bcba-22be49da9cad	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-04	entrada	Salário Go On Junho	2500.00	Go On Outdoor	NUBANK	\N	2025-06-04 22:58:37.371003+00	2025-06-04 22:58:37.371003+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2cb5f85d-0080-41a5-b8cd-f401775aeb6a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-04	saida	Morangos Helaine	40.00	Comida	NUBANK	\N	2025-06-04 22:58:58.599438+00	2025-06-04 22:58:58.599438+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f16960c8-b9c6-413c-971d-53eedb557a78	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-04	saida	Lençois Queen Marina Enxovais	428.38	Apartamento	NUBANK	\N	2025-06-04 23:19:30.827321+00	2025-06-04 23:19:30.827321+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5f9edfc3-5dc3-42a3-9241-eac0c868cc0d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-06	saida	Doçura e afeto	55.00	Comida	C6 BANK	\N	2025-06-06 15:00:28.910242+00	2025-06-06 15:00:28.910242+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
173c1d62-e418-484f-8759-cf020ec94607	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-07	saida	Gasolina	167.90	Carro	C6 BANK	\N	2025-06-07 19:02:10.627252+00	2025-06-07 19:02:10.627252+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4f1a1889-ec31-4e84-b766-79b4c6eada78	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Mc donalds 	65.40			\N	2025-06-15 16:03:21.489177+00	2025-06-15 16:08:04.815+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6d618ef8-989c-4cc4-8d73-ca36765bf7e3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	saida	papelaria	6.00	Go On Outdoor	C6 BANK	\N	2025-06-15 16:08:48.719446+00	2025-06-15 16:08:48.719446+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
16133a3b-cad3-4fbd-8d16-0efc24a2a472	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Jogo nathan IOF	1.62	Lazer e ócio	C6 BANK	\N	2025-06-09 14:59:01.096025+00	2025-06-09 14:59:01.096025+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e9925cca-304b-4535-8be1-6e855789dd2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-06	entrada	Saldo jogo nathan de maio	207.90	Outras receitas	C6 BANK	\N	2025-06-09 14:59:41.553167+00	2025-06-09 14:59:41.553167+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
504256ef-fc0b-4f8d-afac-d7732ccf5f65	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-02	entrada	Parcela camera	315.60	Outras receitas	ASAAS	\N	2025-06-09 15:02:28.369759+00	2025-06-09 15:02:28.369759+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
da5792b2-8865-49dd-b6b3-a63afa9903ed	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-03	saida	Taxas do cartão - venda camera patricia	12.63	Itens Físicos	ASAAS	\N	2025-06-09 15:03:07.485645+00	2025-06-09 15:03:07.485645+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
24d80f73-79f3-4f74-9305-a6f46407208a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Mercado mensal marcela	1500.00	Contas mensais	C6 BANK	\N	2025-06-09 15:05:36.307004+00	2025-06-09 15:05:36.307004+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
cc417fc8-6f1d-4bee-a670-8d904116298b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Cartão de crédito c6bank	1151.48	Contas mensais	C6 BANK	\N	2025-06-09 15:06:50.54648+00	2025-06-09 15:06:50.54648+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f9e0e37f-ae68-4a7f-aee0-f79fd77727c8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-04	entrada	Pro Labore Go On - 1 de 3	5903.89		C6 BANK	\N	2025-06-04 20:56:58.494536+00	2025-06-09 15:26:07.329+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
06dd6abf-5411-4f8b-9ec4-3f153100084d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	fone de ouvido qcy	339.80	Itens Físicos	C6 BANK	\N	2025-06-09 16:23:40.599819+00	2025-06-09 16:23:40.599819+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ab6145f2-54fe-4183-9ecc-a176345453f1	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Terapia	480.00	Contas mensais	C6 BANK	\N	2025-06-09 18:32:41.315439+00	2025-06-09 18:32:41.315439+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d655a1bd-96ce-4ee8-ab17-c76964e61fa5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Falcon ferramentas	167.00	Estudos	C6 BANK	\N	2025-06-10 00:03:17.004652+00	2025-06-10 00:03:17.004652+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a785f35e-f521-422b-89db-0024fac1d0f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	saida	correios camisetas go on	40.33	Go On Outdoor	C6 BANK	\N	2025-06-10 17:33:24.433672+00	2025-06-10 17:33:24.433672+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f0defc8a-f9ef-458a-bbd8-20567df0cc25	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	saida	Cabelo 	75.00	Contas mensais	C6 BANK	\N	2025-06-10 20:24:33.634288+00	2025-06-10 20:24:33.634288+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
188d0d56-e6fa-416b-b023-6a827fd934ea	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	saida	Impostos	210.00	Escritório	C6 BANK	\N	2025-06-11 00:21:39.324259+00	2025-06-11 00:21:39.324259+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e06576ea-861b-45dc-9008-ce6d54dc37cc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	saida	Das mei marcela	80.90	Escritório	C6 BANK	\N	2025-06-11 00:24:07.054223+00	2025-06-11 00:24:07.054223+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ff849103-ce9d-4db3-b46d-4999555ec648	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-10	entrada	ajuste de caixa certo c6	74.41	Outras receitas	C6 BANK	\N	2025-06-11 00:32:46.050607+00	2025-06-11 00:32:46.050607+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
08082f09-080b-4b12-8fa5-bb836a842ec0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	estacionamento largo da ordem	20.00	Carro	C6 BANK	\N	2025-06-15 15:59:07.626616+00	2025-06-15 15:59:07.626616+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6cf15cfa-827e-4ef3-93ea-4b5d869701fb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Pantufa marcela	57.00	Itens Físicos	C6 BANK	\N	2025-06-15 16:01:39.336443+00	2025-06-15 16:01:39.336443+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8f72e5ce-ca9a-4202-a7cd-412812cc5cc5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Chawarma Largo da Ordem	57.00	Comida	C6 BANK	\N	2025-06-15 16:02:15.590104+00	2025-06-15 16:02:15.590104+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
be11aebb-b2df-434f-aeca-dfc130b3b18c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Bonsai arvorezinha	70.32	Itens Físicos	C6 BANK	\N	2025-06-15 16:02:34.567342+00	2025-06-15 16:02:34.567342+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a543e2ae-afb2-4185-ad99-197dbae544c2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Acarajé feita praça ucrania	65.00	Comida	C6 BANK	\N	2025-06-15 16:03:58.834859+00	2025-06-15 16:03:58.834859+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1bffe8b6-ada3-4df2-902c-8dbe1fd4e656	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Massa Fresca - macarrão	54.54	Comida	C6 BANK	\N	2025-06-15 16:04:28.421131+00	2025-06-15 16:04:28.421131+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1738aef5-6f26-42c5-965e-d72d9d9c2fdb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09	saida	Maias Pizzaria	114.91	Comida	C6 BANK	\N	2025-06-15 16:26:50.324376+00	2025-06-15 16:26:50.324376+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
416437b0-19f6-4ef0-ad12-0e4943d76028	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	entrada	Pizza Marcela	57.51	Outras receitas	C6 BANK	\N	2025-06-15 16:28:44.190275+00	2025-06-15 16:28:44.190275+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
23c4347c-6d6d-4c94-90ce-7482d651a0df	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-07	saida	carnes mercês	258.43	Comida	NUBANK	\N	2025-06-15 17:03:13.343913+00	2025-06-15 17:03:13.343913+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4f733880-c197-4997-9971-63a68f54a945	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-07	saida	condor	49.67	Comida	NUBANK	\N	2025-06-15 17:03:33.972664+00	2025-06-15 17:03:33.972664+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ec6087d0-8cbd-4cb9-a53e-583e13e9b847	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-07	saida	mega mania	40.00	Itens Físicos	NUBANK	\N	2025-06-15 17:04:00.665051+00	2025-06-15 17:04:00.665051+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1fe900c3-ecb6-406f-b1b7-775c49b4c103	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-09	saida	amil junho	90.00	Contas mensais	NUBANK	\N	2025-06-15 17:04:36.892467+00	2025-06-15 17:04:36.892467+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b309d725-0ca5-4d8f-8b13-97ea3d51cb59	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-09	entrada	Mercado de junho Wesley	1500.00	Outras receitas	NUBANK	\N	2025-06-15 17:05:25.539135+00	2025-06-15 17:05:25.539135+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0c07840e-1c9c-4b90-bd7d-7e91e3d534d1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-09	saida	Pizza Maias	175.00	Comida	NUBANK	\N	2025-06-15 17:05:47.27222+00	2025-06-15 17:05:47.27222+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4be87efc-272d-401c-998d-1c11cc44ed2f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-11	saida	shorts Salomon	85.41	Vida esportiva	NUBANK	\N	2025-06-15 17:06:14.392982+00	2025-06-15 17:06:14.392982+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c37ffd45-79ee-4bf0-a500-877e327886ab	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-11	saida	pão sinaleiro	20.00	Comida	NUBANK	\N	2025-06-15 17:06:40.600561+00	2025-06-15 17:06:40.600561+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b3478f2e-728c-4257-b23e-249ec4caa5ba	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-11	saida	caneta go on	7.90	Go On Outdoor	NUBANK	\N	2025-06-15 17:07:03.385844+00	2025-06-15 17:07:03.385844+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9f39ceea-7f1c-4f86-9709-3cf996d74bfe	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-11	saida	pascal	33.51	Comida	NUBANK	\N	2025-06-15 17:07:26.180181+00	2025-06-15 17:07:26.180181+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
92f1de25-b6a2-4a77-9c9f-aed6de129753	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-12	saida	compras assai junho	829.31	Comida	NUBANK	\N	2025-06-15 17:07:54.670455+00	2025-06-15 17:07:54.670455+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
213d0825-eb05-4464-8937-59140e5ef65e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-13	saida	Mala de bordo	278.38	Itens Físicos	NUBANK	\N	2025-06-15 17:08:33.355789+00	2025-06-15 17:08:33.355789+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8c7b86d1-bb79-4b19-87ad-2cd975c9ca3a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-14	saida	café alcance	20.00	Comida	NUBANK	\N	2025-06-15 17:09:46.694425+00	2025-06-15 17:09:46.694425+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ed533ec1-3b50-4d0a-8239-7d93f8407c30	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-15	saida	esfirras feirinha	25.00	Comida	NUBANK	\N	2025-06-15 17:10:25.281106+00	2025-06-15 17:10:25.281106+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a6ab7200-1613-4d74-8624-ef0546d9d4e3	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-15	saida	compras feirinha do largo	75.00	Itens Físicos	NUBANK	\N	2025-06-15 17:11:00.757389+00	2025-06-15 17:11:00.757389+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f7fda23e-4961-44f5-abb1-c3a02c52e715	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Trena	27.00	Itens Físicos	C6 BANK	\N	2025-06-28 10:11:24.956592+00	2025-06-28 10:11:24.956592+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
deb8fb76-4a3e-4fa9-9473-be84b0b2be53	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Osmo pocket 4	2680.00	Itens Físicos	C6 BANK	\N	2025-06-15 21:52:30.60391+00	2025-06-15 21:52:30.60391+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
86afd7f5-0645-4361-b67a-75a66f23b028	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-15	saida	Micro SD Osmo Pocket	124.02	Itens Físicos	ASAAS	\N	2025-06-15 21:52:52.841865+00	2025-06-15 21:52:52.841865+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
dd1dc0c3-2f76-4871-ae58-f939ab37d4ea	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-16	saida	Ração e petiscos dimi e teti	239.29	Itens Físicos	NUBANK	\N	2025-06-16 20:39:22.284431+00	2025-06-16 20:39:22.284431+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f16717c9-b6c9-4c05-9bca-ab4b2a0a5a28	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-17	entrada	uber go coffee	31.60	Global Vita	NUBANK	\N	2025-06-17 19:13:46.963546+00	2025-06-17 19:13:46.963546+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a8919458-abf7-4dab-bd42-6bc3ac9326d3	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-17	saida	farmácia (gilette, protetor solar)	109.30	Itens Físicos	NUBANK	\N	2025-06-17 19:14:26.301166+00	2025-06-17 19:14:26.301166+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
94a8f4c0-9ffe-46ba-8e7b-fed14b3a4dce	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-17	saida	pascal	79.31	Comida	NUBANK	\N	2025-06-17 19:14:42.11953+00	2025-06-17 19:14:42.11953+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7f30e08d-d9bd-435d-93b0-b185076d00fe	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-18	entrada	Pro labore	5000.00	Go On Outdoor	C6 BANK	\N	2025-06-18 13:38:47.27706+00	2025-06-18 13:38:47.27706+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ae244810-bbdd-4309-a3e0-1f6654423a43	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-18	saida	Starbucka	38.80	Comida	C6 BANK	\N	2025-06-18 13:39:43.675537+00	2025-06-18 13:39:43.675537+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b2ae893d-6c65-47f9-a1a4-8b2bf9e63819	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-18	saida	Uber aeroporto	62.51	Carro	C6 BANK	\N	2025-06-18 13:40:23.130286+00	2025-06-18 13:40:23.130286+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c773b7d4-5f7e-4f46-a588-9988505f5750	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-21	saida	Comida Camp Go On	266.52	Go On Outdoor	C6 BANK	\N	2025-06-21 19:33:50.950425+00	2025-06-21 19:33:50.950425+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
60d6b905-486c-4d41-955a-5a8b00b0712b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-21	saida	Comida Camp (Pessoal)	75.66	Comida	C6 BANK	\N	2025-06-21 19:35:51.757839+00	2025-06-21 19:35:51.757839+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ac259ab0-1cb7-4e8f-a023-aa7b61d9f29c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-21	saida	Mel Natalha	160.00	Comida	C6 BANK	\N	2025-06-21 19:36:23.568388+00	2025-06-21 19:36:23.568388+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f26056a8-4b29-4732-956e-35a23fcba27d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-22	saida	Hambúrguer aeroporto	121.70	Comida	C6 BANK	\N	2025-06-23 00:12:43.521847+00	2025-06-23 00:12:43.521847+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8ec04b4f-af06-4dcb-b127-fbf2ed7d555b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-23	saida	Vivo fibra escritório	119.99	Go On Outdoor	C6 BANK	\N	2025-06-23 13:43:27.257405+00	2025-06-23 13:43:27.257405+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
bd26feef-1de9-4795-8cfe-657174b5ed1f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-23	saida	Frete material Wanderson Salomon	78.07	Go On Outdoor	C6 BANK	\N	2025-06-23 14:24:19.901618+00	2025-06-23 14:24:19.901618+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
448cb918-bbeb-4c23-bed4-ec1f1a5686b5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-18	saida	Doces de leite Serra do Cipó	125.00	Comida	NUBANK	\N	2025-06-23 18:46:07.294124+00	2025-06-23 18:46:07.294124+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
46d69b6f-1f89-4529-bdcd-155c5fd62115	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-18	saida	agua Serra do Cipó - quinta a noite 	5.00	Comida	NUBANK	\N	2025-06-23 18:47:11.794642+00	2025-06-23 18:47:11.794642+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
dd50d0a3-de38-4230-b91b-0ad4e213fe1f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-18	saida	Açaí Serra do Cipó - quarta a noite	69.30			\N	2025-06-23 18:46:47.632815+00	2025-06-23 18:47:21.95+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f2ca622d-302d-4dc3-8452-d19677250b61	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-20	saida	Bala delicia Serra do Cipó	70.00	Comida	NUBANK	\N	2025-06-23 18:48:09.902208+00	2025-06-23 18:48:09.902208+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5244bc2c-262a-400b-a2bc-3bb3df007816	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-19	saida	Picolé Serra do Cipó	23.80	Comida	NUBANK	\N	2025-06-23 18:48:47.801427+00	2025-06-23 18:48:47.801427+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d74be56b-3edb-4ca8-a9a2-b62764691b31	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-20	saida	almoço de sexta paiol 	60.00	Comida	NUBANK	\N	2025-06-23 18:49:20.469584+00	2025-06-23 18:49:20.469584+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
78b7d058-bcb9-4c51-b18b-91e38157edd9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-21	saida	Agua de coco pós 21k Serra do Cipó	36.00	Comida	NUBANK	\N	2025-06-23 18:49:50.621389+00	2025-06-23 18:49:50.621389+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c794cef0-0d44-4e45-972c-8a5fd7fa8199	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-22	saida	Starbucks Aeroporto	50.80	Comida	NUBANK	\N	2025-06-23 18:51:11.925692+00	2025-06-23 18:51:11.925692+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
32445e02-f57a-49f8-8477-8611145f889b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-25	saida	Runner Fix Coach dominio	50.98	Escritório	C6 BANK	\N	2025-06-26 02:38:52.687227+00	2025-06-26 02:38:52.687227+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
dafc8ac2-c404-445b-a3ab-2b50ebf2f3cb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-25	saida	gasolina	150.00	Carro	C6 BANK	\N	2025-06-26 02:39:40.221407+00	2025-06-26 02:39:40.221407+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ef0129ae-6182-478d-af79-a6cd0fed9cba	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-29	saida	Aluguel Junho	2942.74	Apartamento	C6 BANK	\N	2025-06-29 22:58:50.141723+00	2025-06-29 22:58:50.141723+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
493e557b-5267-4c9f-957c-8ff83d0310ca	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-25	entrada	Lucro camp go on	2309.00	Go On Outdoor	C6 BANK	\N	2025-06-26 02:40:40.074368+00	2025-06-26 02:40:40.074368+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6c7ef058-da61-4a83-b79e-87821a2d0270	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-25	entrada	Curso go on academy	1420.38	Hotmart Go On	CONTA SIMPLES	\N	2025-06-26 02:41:53.352595+00	2025-06-26 02:41:53.352595+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
873754d9-c34b-4efd-a019-61134cc13937	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-24	entrada	Salário Global	3500.00	Global Vita	NUBANK	\N	2025-06-27 18:52:37.457363+00	2025-06-27 18:52:37.457363+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
628a7d43-fe58-4138-9535-ba8dbc0e9793	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-24	saida	Uber	31.26	Carro	NUBANK	\N	2025-06-27 18:53:29.017553+00	2025-06-27 18:53:29.017553+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
921ee992-d115-4e63-8218-930df9fed592	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-24	saida	Kit primeiros socorros la missiono + cobertor	60.00	Itens Físicos	NUBANK	\N	2025-06-27 18:54:04.095908+00	2025-06-27 18:54:04.095908+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f89a487e-242a-4360-ba9a-463652f45b93	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-25	saida	uber	13.92	Carro	NUBANK	\N	2025-06-27 18:54:31.45488+00	2025-06-27 18:54:31.45488+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8783234f-7b2e-4bd9-b9cf-c6bc59ef25e7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-25	saida	Cama nova Dimi e Tereza + cobertas e petiscos	380.30	Itens Físicos	NUBANK	\N	2025-06-27 18:55:09.227197+00	2025-06-27 18:55:09.227197+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
143a3661-abd5-4740-b5d9-ef541bd9595f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-25	saida	Bolo limão	26.00	Comida	NUBANK	\N	2025-06-27 18:55:30.15097+00	2025-06-27 18:55:30.15097+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1c3ad6ed-99f1-4949-b159-854cdc4ab97d	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-26	saida	Tapetinho higiênico + Enzimac	264.01	Itens Físicos	NUBANK	\N	2025-06-27 18:56:31.916823+00	2025-06-27 18:56:31.916823+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
96021a7f-07d7-4cea-a7cc-8ceb70f3cb98	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-27	saida	Desodorante	74.57	Itens Físicos	NUBANK	\N	2025-06-27 18:56:57.843227+00	2025-06-27 18:56:57.843227+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7e4fd9e7-6683-4b9e-a340-32b4494b40bf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Curso cssbuy	50.90	Estudos	C6 BANK	\N	2025-06-28 10:08:51.217373+00	2025-06-28 10:08:51.217373+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0897b831-8451-4dcc-a408-5f936555b90a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Pizza 	168.30	Comida	C6 BANK	\N	2025-06-28 10:09:16.175665+00	2025-06-28 10:09:16.175665+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
761166ea-5b3c-4dc6-a1ef-3fd7ef8f0a55	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Conserto aquecedor	234.00	Apartamento	C6 BANK	\N	2025-06-28 10:09:45.6281+00	2025-06-28 10:09:45.6281+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8a46dfa8-9a30-474f-b3b1-b1175d1e56de	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Fretes Go on 	56.79	Go On Outdoor	C6 BANK	\N	2025-06-28 10:10:32.180831+00	2025-06-28 10:10:32.180831+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
60a191a9-94a2-4abf-820a-5897ca6784af	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-28	saida	Cafés festival 	68.96	Comida	C6 BANK	\N	2025-06-28 10:10:59.962234+00	2025-06-28 10:10:59.962234+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a2b8c9a8-42b9-40ba-a33f-f41e9122aab4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-30	saida	Fatura atrasada nextbank	205.00	Contas mensais	C6 BANK	\N	2025-06-30 17:03:54.11735+00	2025-06-30 17:03:54.11735+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ad8b58c7-8113-4071-9175-b5be8e405cfe	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-30	saida	Curso NCR Midtrack	85.00	Estudos	C6 BANK	\N	2025-06-30 17:04:26.201324+00	2025-06-30 17:04:26.201324+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0a089c43-7c77-4a90-b567-f79f3fbfe18c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-30	saida	REEMBOLSO - Banners impressos Go On	206.00	Go On Outdoor	C6 BANK	\N	2025-06-30 18:13:41.638343+00	2025-06-30 18:13:41.638343+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e05e11e9-f129-4207-b818-d31961c29cef	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-30	saida	ajuda pati cerrado	20.00	Lazer e ócio	C6 BANK	\N	2025-06-30 18:24:42.374295+00	2025-06-30 18:24:42.374295+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
08947197-1f51-45d1-9018-fa4c3f868183	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-01	saida	Seguro atleta Go On - BURRICE	875.31	Go On Outdoor	C6 BANK	\N	2025-07-01 20:17:26.087982+00	2025-07-01 20:17:26.087982+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
755f25d8-6c24-40e0-a582-5b11a0f538d4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-01	saida	Carnes mercês	210.76	Comida	C6 BANK	\N	2025-07-01 20:30:48.627633+00	2025-07-01 20:30:48.627633+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
53f327d6-2764-47a5-9a3c-761c6fb0dc9b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-02	saida	Frete Thiago Clemente - DEVOLUÇÃO	18.57	Go On Outdoor	C6 BANK	\N	2025-07-02 14:17:48.842196+00	2025-07-02 14:17:48.842196+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
15066f33-5b4c-4f8c-b61a-3549587f65ee	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-02	saida	Impressão etiqueta Thiago 	4.00	Go On Outdoor	C6 BANK	\N	2025-07-02 14:50:04.054034+00	2025-07-02 14:50:04.054034+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c3828bb2-777d-40cf-a4ce-e122cdbe75dd	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-30	saida	wind flag go on	210.00	Go On Outdoor	NUBANK	\N	2025-07-03 00:28:53.526858+00	2025-07-03 00:28:53.526858+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3f5e93f7-3896-4a81-86f6-b464e2c04001	26bac8f5-5b37-4151-a95c-247251b8556d	2025-06-30	saida	pascal	43.83	Comida		\N	2025-07-03 00:29:29.67668+00	2025-07-03 00:29:29.67668+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
40ac89f4-e511-4ebe-8e4a-4b1dc1e98281	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-01	saida	uber global	51.86	Carro	NUBANK	\N	2025-07-03 00:30:13.826356+00	2025-07-03 00:30:13.826356+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0839bddf-07fa-4057-9c17-3c52d65c87f5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-02	saida	pascal	21.54	Comida	NUBANK	\N	2025-07-03 00:30:49.857916+00	2025-07-03 00:30:49.857916+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1f1f7ac4-c843-43f0-9ed8-f4222bc3451f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04	entrada	Pagamento camera vendida	467.95	Outras receitas	ASAAS	\N	2025-07-04 14:56:42.662164+00	2025-07-04 14:56:42.662164+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9d8a8a0a-e2bc-4619-be80-9e92aa59f029	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04	saida	Condor - óleo e doritos	178.50	Comida	C6 BANK	\N	2025-07-04 14:57:51.483813+00	2025-07-04 14:57:51.483813+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1a426461-67b3-48f3-b23d-0466776791ad	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04	saida	Máquina Virtual n8n	69.99	Escritório	C6 BANK	\N	2025-07-04 16:22:13.785871+00	2025-07-04 16:22:13.785871+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
045f03cd-966a-4720-8858-d15b8f7f08bc	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-07	entrada	salario go on	2500.00	Go On Outdoor	NUBANK	\N	2025-07-07 22:29:28.695589+00	2025-07-07 22:29:28.695589+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c015619d-ac21-44c0-bbf1-f3c1b0c648d7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-07	entrada	ajuda aniver Arthur mãe	100.00	Outras receitas	NUBANK	\N	2025-07-07 22:29:55.891772+00	2025-07-07 22:29:55.891772+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
15484e19-50e9-4429-97e8-35dfb2aedf18	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-06	saida	uber	21.90	Carro	NUBANK	\N	2025-07-07 22:30:26.353804+00	2025-07-07 22:30:26.353804+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a80dff1c-9e9d-45b9-aadb-6cfd33e02459	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-06	saida	compras condor	77.71	Comida	NUBANK	\N	2025-07-07 22:30:49.011507+00	2025-07-07 22:30:49.011507+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9177a9fc-14e1-4e26-8c37-d7b7e8479986	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-06	saida	manga longa 15k	63.20	Itens Físicos	NUBANK	\N	2025-07-07 22:31:14.439196+00	2025-07-07 22:31:14.439196+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
24d6623c-404c-4291-aac0-2c6487eec4a7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-05	saida	quentão festa do arthur	68.00	Comida	NUBANK	\N	2025-07-07 22:31:44.5266+00	2025-07-07 22:31:44.5266+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c2f291fc-3b7a-4884-96aa-f9f38a815701	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-05	saida	uber	14.93	Carro	NUBANK	\N	2025-07-07 22:32:04.883537+00	2025-07-07 22:32:04.883537+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b3c8d86d-ea89-45d3-a9e2-44b17719ee8f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-05	saida	esfirras	83.75	Comida	NUBANK	\N	2025-07-07 22:32:30.969874+00	2025-07-07 22:32:30.969874+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fa7370f4-69bb-4bea-8f73-3b72eef3e31d	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-04	saida	lactodama	68.17	Comida	NUBANK	\N	2025-07-07 22:33:49.677696+00	2025-07-07 22:33:49.677696+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3c42656f-1e36-4518-89d2-0777aed244c1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-04	saida	compras SuperDia	719.90			\N	2025-07-07 22:33:01.497838+00	2025-07-07 22:34:44.813+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
85353440-e77f-4b48-8489-9907f912aaa0	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-03	saida	uber	13.96	Carro	NUBANK	\N	2025-07-07 22:35:11.862914+00	2025-07-07 22:35:11.862914+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c0619992-e834-430e-9c57-74c9d804987c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07	saida	Terapia	480.00	Contas mensais	C6 BANK	\N	2025-07-07 22:35:23.944429+00	2025-07-07 22:35:23.944429+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c3f8d738-71b5-40fc-93cf-9f921bdb5898	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-03	saida	corte de cabelo	190.00	Lazer e ócio	NUBANK	\N	2025-07-07 22:35:45.842543+00	2025-07-07 22:35:45.842543+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d22ac743-990b-46f8-98b7-47c8278e8cc5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-06	saida	Fotos 15K de Santa	40.56	Vida esportiva	C6 BANK	\N	2025-07-07 22:36:08.736861+00	2025-07-07 22:36:08.736861+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
621fc2c5-6b6e-40c9-82df-41adbb788303	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-03	saida	decoração festa do arthur	96.90	Itens Físicos	NUBANK	\N	2025-07-07 22:36:16.116824+00	2025-07-07 22:36:16.116824+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9e4c511c-d551-4eaf-bae7-947e75e37f70	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-06	saida	Café com tulão 15K de Santa	39.74	Comida	C6 BANK	\N	2025-07-07 22:36:30.610923+00	2025-07-07 22:36:30.610923+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
78ca2817-91dd-4ba9-9204-01305d6bee90	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-03	saida	uber	13.99	Carro	NUBANK	\N	2025-07-07 22:36:33.502939+00	2025-07-07 22:36:33.502939+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f5d1a886-7d7d-4a85-900b-00e8a1592399	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-04	saida	bomba de chocolate	14.90	Comida	NUBANK	\N	2025-07-07 22:37:01.642599+00	2025-07-07 22:37:01.642599+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8c428cf3-dd61-47a9-bd45-8be598d6919a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-04	saida	pascal	14.98	Comida	NUBANK	\N	2025-07-07 22:37:30.657169+00	2025-07-07 22:37:30.657169+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
aaed5d85-6aaa-4faa-aefe-435ca229c6b6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-05	saida	Treino campua + Tucum	183.20	Vida esportiva	C6 BANK	\N	2025-07-07 22:38:42.401937+00	2025-07-07 22:38:42.401937+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
78f862eb-2033-4672-9611-194040bef592	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07	saida	Contabilidade	200.00	Escritório	C6 BANK	\N	2025-07-07 22:42:05.604635+00	2025-07-07 22:42:05.604635+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0db654f5-d0fa-4887-82d4-501476583669	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07	saida	vivo fibra	156.00	Apartamento	C6 BANK	\N	2025-07-07 22:42:25.636899+00	2025-07-07 22:42:25.636899+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a074d38d-e044-4a98-aab3-a2cd1a0cf626	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07	saida	Ultra Gaz	227.42	Apartamento	ASAAS	\N	2025-07-07 22:44:00.092524+00	2025-07-07 22:44:00.092524+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d4c7002a-8bf4-4721-b5a1-87d7bf93b865	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08	saida	Mouse Logitech	261.90	Itens Físicos	C6 BANK	\N	2025-07-08 21:52:51.129117+00	2025-07-08 21:52:51.129117+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5c857f5c-b180-4c94-aa08-075f39f23793	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08	saida	Mercado mensal	1530.00	Contas mensais	C6 BANK	\N	2025-07-08 21:54:56.880601+00	2025-07-08 21:54:56.880601+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5942a928-c459-4e01-9eaf-027c94da72b2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08	entrada	Pro labore 1 - Wesley	5416.00	Go On Outdoor	C6 BANK	\N	2025-07-08 21:55:29.67094+00	2025-07-08 21:55:29.67094+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d5587e86-68b5-4417-b6b6-3c7490acc9f2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08	saida	Fisioterpia vanessa	314.00	Vida esportiva	C6 BANK	\N	2025-07-08 21:56:57.344382+00	2025-07-08 21:56:57.344382+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2816d4fc-af65-47b0-a533-af9a8161b4f5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08	saida	Cartão c6 bank	1699.00	Contas mensais	C6 BANK	\N	2025-07-08 21:59:35.716857+00	2025-07-08 21:59:35.716857+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
36a40e6a-8042-4305-b1aa-6a6f39b5c636	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-08	saida	uber	18.93	Carro	NUBANK	\N	2025-07-09 00:32:28.724082+00	2025-07-09 00:32:28.724082+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
99b09ff7-762b-4604-891e-7e3be8018fb6	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-08	entrada	mercado do mes wesley	1530.00	Outras receitas	NUBANK	\N	2025-07-09 00:32:53.593293+00	2025-07-09 00:32:53.593293+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
46bd321d-bc70-41a4-a461-4069a8ce0e85	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-09	saida	pao de mel Rafinha	36.00	Comida	NUBANK	\N	2025-07-09 16:59:46.184558+00	2025-07-09 16:59:46.184558+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4326d932-4ff3-4173-9282-35bfb2c63da2	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-09	saida	Bastão Expedition	767.78	Vida esportiva	NUBANK	\N	2025-07-09 17:00:15.571219+00	2025-07-09 17:00:15.571219+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
95069236-64ea-44e7-b05b-2be7d9939a4f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-10	saida	Impostos	210.00	Escritório	C6 BANK	\N	2025-07-10 13:56:33.408201+00	2025-07-10 13:56:33.408201+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
dbabfaab-29e0-43a7-bf08-6d3cf39c7613	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-10	saida	carnes merces	2.85	Comida	C6 BANK	\N	2025-07-10 13:57:04.814762+00	2025-07-10 13:57:04.814762+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9fe21a2e-86f5-4cd8-a824-a0e980b25199	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-10	saida	Pomada de cabelo	77.15	Lazer e ócio	C6 BANK	\N	2025-07-10 13:59:36.344589+00	2025-07-10 13:59:36.344589+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d1eca6c2-aa78-4172-9112-bf7d02f59581	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-11	saida	Uber flyers - Bagre	13.43	Go On Outdoor	C6 BANK	\N	2025-07-12 01:16:36.044939+00	2025-07-12 01:16:36.044939+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
844aacd7-dc94-4348-81dd-0b61d310cb2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-11	saida	Livro de colorir sinaleiro	10.00	Itens Físicos	C6 BANK	\N	2025-07-12 01:16:54.762132+00	2025-07-12 01:16:54.762132+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fdef9580-e2c2-4581-9d5c-d7fe85caf620	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-11	saida	saldo para next bank	14.72	Escritório	C6 BANK	\N	2025-07-12 01:17:19.321361+00	2025-07-12 01:17:19.321361+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7290a7d3-614a-4e9a-97a9-b36af889ce25	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-09	saida	Uber	7.33	Carro	NUBANK	\N	2025-07-13 14:42:57.335105+00	2025-07-13 14:42:57.335105+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b67780df-c2df-4e97-a686-dd799b6aec05	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-09	saida	Carnes mercês	150.00	Comida	NUBANK	\N	2025-07-13 14:43:21.55549+00	2025-07-13 14:43:21.55549+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
df2929b4-5d0e-42fa-8367-bbd7dfde8007	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-10	saida	Ração Dimi e Tereza	171.08	Itens Físicos	NUBANK	\N	2025-07-13 14:44:02.999383+00	2025-07-13 14:44:02.999383+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5147e1b6-ec03-4721-8564-cd3cf7287f4a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-10	saida	Whey MaisMu	253.70	Comida	NUBANK	\N	2025-07-13 14:45:08.174698+00	2025-07-13 14:45:08.174698+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5c83d577-732e-4cfc-95ab-bffe54089f44	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-13	saida	costela	136.00	Comida	NUBANK	\N	2025-07-13 16:06:29.105677+00	2025-07-13 16:06:29.105677+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1f5759fd-487d-441f-915d-b852704a8bbc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-13	saida	Pancio pizzaria vista alegre	168.60	Comida	C6 BANK	\N	2025-07-14 00:01:40.189739+00	2025-07-14 00:01:40.189739+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fff0f2a6-704f-4ebf-81de-6b523ee2dd7b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-13	saida	Pastel salto boa vista	112.50	Vida esportiva	C6 BANK	\N	2025-07-14 00:02:00.501374+00	2025-07-14 00:02:00.501374+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
68e195f1-08e2-43fb-8539-5f9a7aef8d8c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-13	saida	Gasolina	172.39	Carro	C6 BANK	\N	2025-07-14 00:02:16.92165+00	2025-07-14 00:02:16.92165+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
af67a264-108b-4c97-b70d-fb35f218e235	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-13	entrada	saldo next	109.86	Outras receitas	C6 BANK	\N	2025-07-14 00:02:46.339727+00	2025-07-14 00:02:46.339727+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
97cf396d-f392-4202-9101-eb528e8462d8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-14	saida	Bateria carro	479.00	Carro	C6 BANK	\N	2025-07-14 15:00:50.13326+00	2025-07-14 15:00:50.13326+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
15fadf8d-88fa-49bb-bb7c-6c6d775505b8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-15	saida	Banquetas	139.92	Go On Outdoor	C6 BANK	\N	2025-07-15 17:12:54.706988+00	2025-07-15 17:12:54.706988+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5850dcf0-babc-46fa-9d28-1188eea3a3a9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	caixas de envio go on	18.55	Go On Outdoor	NUBANK	\N	2025-07-15 18:17:01.870319+00	2025-07-15 18:17:01.870319+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d1d63d6f-b54f-467d-b7e9-d0c497091f78	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	Flask Salomon Wesley	249.90	Itens Físicos	NUBANK	\N	2025-07-15 18:17:41.997289+00	2025-07-15 18:17:41.997289+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a51e69f7-dfff-4e9c-91bd-de3952b4c853	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	morangos	40.00	Comida	NUBANK	\N	2025-07-15 18:17:58.507216+00	2025-07-15 18:17:58.507216+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
92dcdb66-2df8-4ab7-b91d-0f08089acdaa	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	Uber	65.02	Carro	NUBANK	\N	2025-07-15 18:18:33.399691+00	2025-07-15 18:18:33.399691+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
111bf5bb-4f78-4ff6-8b65-1f41f86d8859	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	livro Uma Vida com Propósitos	44.35	Itens Físicos	NUBANK	\N	2025-07-15 18:18:54.086438+00	2025-07-15 18:18:54.086438+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
03d27d8a-bbf9-4f14-af26-3cfbfc1c4d22	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	posto matulão com tulão	82.90	Comida	C6 BANK	\N	2025-07-17 22:45:30.140949+00	2025-07-17 22:45:30.140949+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a1fb042c-bb7a-429d-8c19-8c57dc8b80f4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	pedágio perdidos quinta	5.70	Carro	C6 BANK	\N	2025-07-17 22:45:51.159481+00	2025-07-17 22:45:51.159481+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
51c7b33e-d38c-404e-9e0f-3c8647aaad78	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	café razera	8.80	Comida	C6 BANK	\N	2025-07-17 22:46:08.040183+00	2025-07-17 22:46:08.040183+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2f813e67-2bf9-4bf1-b423-c19e8f0f1830	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	Salgados pós corte cabelo	27.40	Comida	C6 BANK	\N	2025-07-17 22:46:44.003802+00	2025-07-17 22:46:44.003802+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
27738e9a-f3a4-42f5-a479-1f27d1c85266	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	corte de cabelo	75.00	Contas mensais	C6 BANK	\N	2025-07-17 22:46:55.657728+00	2025-07-17 22:46:55.657728+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
513e91ce-2216-41b6-a8b0-3e809e401088	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	saida	cookies corte de cabelo	15.00	Comida	C6 BANK	\N	2025-07-17 22:47:23.359597+00	2025-07-17 22:47:23.359597+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
43814fec-1519-42a5-a9bd-7ad8998c328f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	entrada	Pro Labore parte 2	5000.00	Go On Outdoor	C6 BANK	\N	2025-07-17 22:47:40.82669+00	2025-07-17 22:47:40.82669+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a9398d53-d9c6-4cb1-b9f9-5db1b93a7945	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	entrada	mês de trabalho global	4500.00	Global Vita	ASAAS	\N	2025-07-17 22:47:55.966815+00	2025-07-17 22:47:55.966815+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3ba732c0-0420-44c2-b9ca-9ce887f7ecbc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17	entrada	Parcela camera + coros	276.00	Outras receitas	CONTA SIMPLES	\N	2025-07-17 22:49:47.861206+00	2025-07-17 22:49:47.861206+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a41dbe70-1916-45a8-97a2-67469de764ae	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-18	saida	Rosca Pascal 	25.80	Comida	C6 BANK	\N	2025-07-18 18:58:55.559396+00	2025-07-18 18:58:55.559396+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
29a0d63a-576c-4c0c-9a50-daf8718d4c65	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-21	saida	Gasolina - Ida Vó Nina	120.00	Carro	C6 BANK	\N	2025-07-21 16:48:57.239933+00	2025-07-21 16:48:57.239933+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
527ed0d1-0de8-4bba-9109-8f79c733b267	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-21	saida	Bolos - Ultra dos Perdidos	97.80	Go On Outdoor	C6 BANK	\N	2025-07-21 16:49:22.340834+00	2025-07-21 16:49:22.340834+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0c648d52-3b67-4d76-bf22-20ca47312023	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-21	saida	Camiseta - Ultra dos Perdidos	89.90	Vida esportiva	C6 BANK	\N	2025-07-21 16:50:21.346905+00	2025-07-21 16:50:21.346905+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
805ab964-6ab0-4900-83ec-218180bb56fc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-21	saida	Gelo - Ultra dos Perdidos	34.00	Go On Outdoor	C6 BANK	\N	2025-07-21 16:51:19.646945+00	2025-07-21 16:51:19.646945+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a820932d-f75f-4026-9913-3a88ba0435e1	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-31	saida	Pilha	10.00	Itens Físicos	C6 BANK	\N	2025-07-31 20:19:18.956596+00	2025-07-31 20:19:18.956596+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c8ff7058-4445-4128-a32d-e6c5c8517a90	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-21	saida	Gasolina - Ultra dos Perdidos	194.65	Carro	C6 BANK	\N	2025-07-21 16:54:15.794282+00	2025-07-21 16:54:15.794282+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a582c61d-ef0c-4696-82df-e173d7e901b1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	Livro Amazon	44.35	Itens Físicos	NUBANK	\N	2025-07-22 18:32:43.993776+00	2025-07-22 18:32:43.993776+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
86c9902e-4818-42e6-8215-fe5a6ae2639f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-15	saida	comida Wesley	56.22	Comida	NUBANK	\N	2025-07-22 18:33:15.885441+00	2025-07-22 18:33:15.885441+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
47489ec6-de72-4be7-9736-f457a1d8638e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-16	saida	Rifa Davi	40.00	Vida esportiva	NUBANK	\N	2025-07-22 18:33:46.98334+00	2025-07-22 18:33:46.98334+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fffc6a03-9e78-4909-9f52-cfa720d1178a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-16	saida	pascal	53.49	Comida	NUBANK	\N	2025-07-22 18:34:08.430299+00	2025-07-22 18:34:08.430299+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a625475a-c63e-4a91-ab43-1dac302ee679	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-16	saida	bolo cenoura	35.00	Comida	NUBANK	\N	2025-07-22 18:34:34.35617+00	2025-07-22 18:34:34.35617+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0f3e9b25-e12d-4f64-a1e4-03180dee8f6c	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-18	saida	Petiscos Dimi e Teti	80.80	Itens Físicos	NUBANK	\N	2025-07-22 18:35:02.310556+00	2025-07-22 18:35:02.310556+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
43b61e4e-9a89-4522-916f-555ea9489a9f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-18	saida	Cacau Show	67.95	Comida	NUBANK	\N	2025-07-22 18:35:21.112964+00	2025-07-22 18:35:21.112964+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fd89bce6-d3d3-419a-aafe-cc1d9eda3e3e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-18	saida	Vacari	17.30	Comida	NUBANK	\N	2025-07-22 18:35:44.021722+00	2025-07-22 18:35:44.021722+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c9b5dd94-6007-4212-bce8-a410f3eb8ed0	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-18	saida	Frutas Perdidos	39.00	Go On Outdoor	NUBANK	\N	2025-07-22 18:36:37.543355+00	2025-07-22 18:36:37.543355+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ee4bd56d-ccda-4559-b203-3f6d7408a52a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-19	saida	geleia de morango perdidos	25.00	Comida	NUBANK	\N	2025-07-22 18:36:53.00453+00	2025-07-22 18:36:53.00453+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d01aedd0-e49d-42e7-baf0-8d33258a656c	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-19	saida	hambúrguer perdidos	35.00	Comida	NUBANK	\N	2025-07-22 18:37:13.453592+00	2025-07-22 18:37:13.453592+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8b6a677b-e03c-4254-847d-d82363dcd3c2	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-19	saida	camiseta perdidos	89.90	Itens Físicos	NUBANK	\N	2025-07-22 18:37:35.522953+00	2025-07-22 18:37:35.522953+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
33cdbc4a-d093-4de3-8851-d673dace9eb4	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-22	entrada	Diaria 15K de Santa	250.00	Global Vita	NUBANK	\N	2025-07-22 18:37:52.553887+00	2025-07-22 18:37:52.553887+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ec9cbb35-ea11-4bc0-98b7-f085d888ce11	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-22	saida	Lavagem de carro	100.00	Carro	C6 BANK	\N	2025-07-23 17:50:36.028479+00	2025-07-23 17:50:36.028479+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1b1d8b4e-b139-417c-912c-7421f5c3c9ac	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-22	saida	Café de Máquina	78.96	Comida	C6 BANK	\N	2025-07-23 18:03:44.867916+00	2025-07-23 18:03:44.867916+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fcaf205f-bf29-4d2e-b2e2-550b2f81022b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-23	saida	Acelerador de Átomos	22.00	Contas mensais	C6 BANK	\N	2025-07-23 18:04:23.600652+00	2025-07-23 18:04:23.600652+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
380cf6cb-0e5d-49b7-920c-d0f474fd8c0c	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-23	saida	Naked	124.53	Comida	NUBANK	\N	2025-07-23 19:31:07.541233+00	2025-07-23 19:31:07.541233+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
cf38a400-136d-42e9-8eac-e1aa3463f04b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-22	saida	Pizza Maias	136.91	Comida	NUBANK	\N	2025-07-23 19:31:35.714886+00	2025-07-23 19:31:35.714886+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
afd57683-f508-4fd4-a170-627a6eec2d94	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-23	saida	Esfirra para jantar	55.46	Comida	C6 BANK	\N	2025-07-24 00:18:02.124536+00	2025-07-24 00:18:02.124536+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ae24a6f5-c585-4db0-8dc7-2f77d0c6ca92	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-23	saida	Compras no mercado	764.94	Contas mensais	C6 BANK	\N	2025-07-24 00:18:38.348507+00	2025-07-24 00:18:38.348507+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4213adc9-38b5-44f6-8acf-bc35a98d745a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-24	entrada	Salário global	3200.00	Global Vita	NUBANK	\N	2025-07-24 13:15:11.420924+00	2025-07-24 13:15:11.420924+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8bf2ccf4-d35f-495e-919f-21eb33fd64e7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-24	saida	Plano de Saúde - UNIMED JULHO/2025	451.00	Contas mensais	NUBANK	\N	2025-07-24 18:56:09.892368+00	2025-07-24 18:56:09.892368+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
aed81460-37a2-4db8-b40e-58eb3debf76b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-24	saida	Aluguel	2957.34	Apartamento	C6 BANK	\N	2025-07-24 23:18:28.413965+00	2025-07-24 23:18:28.413965+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b43d95f0-aabd-4c32-81a0-d27ad6d89189	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-25	saida	Óleo para o carro	89.59	Carro	C6 BANK	\N	2025-07-25 12:39:15.357676+00	2025-07-25 12:39:15.357676+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ce20afec-5f22-4533-b603-f215e08428ef	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-25	saida	Conjunto fitness COVER	173.39	Vida esportiva	NUBANK	\N	2025-07-25 17:57:47.794719+00	2025-07-25 17:57:47.794719+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
807ac22f-8ba4-408b-83e3-a0d74fb3a43a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-25	saida	Gasolina	150.00	Carro	C6 BANK	\N	2025-07-25 21:25:36.325497+00	2025-07-25 21:25:36.325497+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9293e131-b15a-40a6-a0fc-599ee12610ca	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-28	saida	Velas de carro	98.80	Carro	C6 BANK	\N	2025-07-28 22:21:39.960135+00	2025-07-28 22:21:39.960135+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5d20e37f-9191-49b2-904c-2881b601da1e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-26	saida	Treino no Araçatuba	51.40	Vida Esportiva	C6 BANK	\N	2025-07-28 22:22:51.017571+00	2025-07-28 22:22:51.017571+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
381f7336-6dbe-4239-b318-f15ef366a5c5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-26	saida	agua com gas Araçatuba	5.00	Comida	NUBANK	\N	2025-07-29 20:37:42.884387+00	2025-07-29 20:37:42.884387+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3ad3a055-3337-42d1-9491-1c82961d9708	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-31	saida	Dominio playwise	39.99	Escritório	C6 BANK	\N	2025-07-31 16:45:04.539505+00	2025-07-31 16:45:04.539505+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5a22a84b-ed83-4685-adc8-5a36e2b7c031	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-31	saida	Festval - Pão ciabata e pilhas polar	72.95	Comida	C6 BANK	\N	2025-07-31 16:45:37.660602+00	2025-07-31 16:45:37.660602+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
11c2970f-40c4-4368-ac59-7ab8d68a9dfa	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-31	saida	moletom asics dia dos pais	136.14	Itens Físicos	C6 BANK	\N	2025-07-31 16:46:10.03272+00	2025-07-31 16:46:10.03272+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2044800b-ad10-493e-ac19-130224891231	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-31	saida	quiver NTK marcela alta montanha	82.56	Vida esportiva	C6 BANK	\N	2025-07-31 16:46:32.932935+00	2025-07-31 16:46:32.932935+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d1baa025-016b-4bbc-945a-9a459e248db2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-01	saida	Gasolina	137.99	Carro	C6 BANK	\N	2025-08-01 21:52:52.260434+00	2025-08-01 21:52:52.260434+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
16836ac4-882b-494e-81a4-8b69d461e663	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-03	saida	Amil Agosto	90.00	Contas mensais	NUBANK	\N	2025-08-03 17:56:42.506305+00	2025-08-03 17:56:42.506305+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c3890453-4f57-44be-923f-cc5e698e9cc1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-03	saida	Protetor Solar	64.39	Itens Físicos	NUBANK	\N	2025-08-03 17:57:31.898161+00	2025-08-03 17:57:31.898161+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f6954ca7-334f-4a7f-aa4f-70277475a89c	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-03	saida	Bolsa Viagem Arthur	159.90	Itens Físicos	NUBANK	\N	2025-08-03 17:57:57.375369+00	2025-08-03 17:57:57.375369+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
358ddc1e-4004-4793-a250-7dfa7228b9e4	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-03	saida	Pascal	57.17	Comida	NUBANK	\N	2025-08-03 17:58:18.360291+00	2025-08-03 17:58:18.360291+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c6dddd65-f570-447e-a0b4-e0cf1de8d45b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-02	saida	Isotonico e Snickers	32.85	Comida	NUBANK	\N	2025-08-03 17:58:44.830355+00	2025-08-03 17:58:44.830355+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
add5cac0-c5fb-4d10-931d-5a724b0ddf92	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-01	saida	Carnes Merces	205.74	Comida	NUBANK	\N	2025-08-03 17:59:07.7838+00	2025-08-03 17:59:07.7838+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f00db0d2-fb30-4caa-9b80-01d326d95a31	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-29	saida	Mombora	209.61	Vida esportiva	NUBANK	\N	2025-08-03 17:59:58.099555+00	2025-08-03 17:59:58.099555+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7774f42f-21d7-4716-b6c1-58333165626f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-31	saida	Agua de coco Barigui	9.00	Comida	NUBANK	\N	2025-08-03 18:00:18.873275+00	2025-08-03 18:00:18.873275+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
789b54c0-f3ac-4232-a1ee-344b4eb0d82d	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-31	saida	Pascal	28.78	Comida	NUBANK	\N	2025-08-03 18:00:41.701338+00	2025-08-03 18:00:41.701338+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
73e256f3-9230-4e32-a006-df182a679d47	26bac8f5-5b37-4151-a95c-247251b8556d	2025-07-31	saida	Pantufa do Pai (dia dos pais)	104.59	Itens Físicos	NUBANK	\N	2025-08-03 18:01:10.506511+00	2025-08-03 18:01:10.506511+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f8ebd0d4-07e7-4077-b675-4d437d4849c0	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-01	saida	Almoço Tabaq	121.40	Comida	NUBANK	\N	2025-08-03 18:01:35.09454+00	2025-08-03 18:01:35.09454+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
874debce-46ba-4ad3-bb0a-c2ec5b4e9809	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Cartão empresa	406.92	Escritório	CONTA SIMPLES	\N	2025-08-03 22:06:25.176521+00	2025-08-03 22:06:25.176521+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
174a81fa-9d0a-4e17-8757-c75a34174faa	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Copel	74.88	Apartamento	ASAAS	\N	2025-08-03 22:20:55.547413+00	2025-08-03 22:20:55.547413+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f64d8462-e800-4917-abf3-492795c24189	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	UltraGaz	195.83	Apartamento	ASAAS	\N	2025-08-03 22:24:30.311536+00	2025-08-03 22:24:30.311536+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
acb37d88-55d4-4524-8336-3c91e4c208b8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Cartão c6 bank	1908.78	Contas mensais	ASAAS	\N	2025-08-03 22:26:18.6023+00	2025-08-03 22:26:18.6023+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9d054ef2-f968-41fa-bd99-13750d474ee2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	contabilidade	200.00	Escritório	ASAAS	\N	2025-08-03 22:30:53.053307+00	2025-08-03 22:30:53.053307+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
85237765-8696-41ec-8867-8b266f1c1501	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Terapia	480.00	Contas mensais	ASAAS	\N	2025-08-03 22:35:34.739105+00	2025-08-03 22:35:34.739105+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0ada250a-c3cb-4a4e-859c-1286ce5421e9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Das mei marcela	80.90	Escritório	ASAAS	\N	2025-08-03 22:39:23.159223+00	2025-08-03 22:39:23.159223+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5c493707-6ae5-4ab2-b33c-1584b5b27751	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Mercado mensal	1000.00	Contas mensais	ASAAS	\N	2025-08-03 22:40:52.857323+00	2025-08-03 22:40:52.857323+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
941af8ba-002c-4d22-8696-027e0e23c53d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Vivo fibra casa	156.00	Apartamento	ASAAS	\N	2025-08-03 22:42:14.831777+00	2025-08-03 22:42:14.831777+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9852e58c-ee8a-4913-bcfa-49e9099b8a56	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03	saida	Fisioterapia vanessa	314.00	Vida esportiva	ASAAS	\N	2025-08-03 22:43:32.939631+00	2025-08-03 22:43:32.939631+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
cf559e47-f997-4729-99ad-ca95a088092e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-04	saida	curso prepração fisica	111.00	Estudos	ASAAS	\N	2025-08-04 16:23:28.368629+00	2025-08-04 16:23:28.368629+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
56f7c389-29ee-4ac8-85a4-0b1d22c06822	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-03	entrada	mercado agosto	1000.00	Outras receitas	NUBANK	\N	2025-08-06 16:59:23.239513+00	2025-08-06 16:59:23.239513+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
911171d1-712a-4fc1-871e-c2c7a901c13e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-05	saida	granolas	81.25	Comida	NUBANK	\N	2025-08-06 16:59:49.649371+00	2025-08-06 16:59:49.649371+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0406a517-ba08-4539-906f-587ef2530e0c	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-06	entrada	salario go on	2500.00	Go On Outdoor	NUBANK	\N	2025-08-06 17:00:03.938847+00	2025-08-06 17:00:03.938847+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9a7d42d9-ab22-4008-a069-1568285c6698	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-06	saida	bolo fubá	26.00	Comida	NUBANK	\N	2025-08-06 17:00:21.558359+00	2025-08-06 17:00:21.558359+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1aa2b1e3-3aaf-4784-8547-ececb01e7905	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	entrada	Pro labore 1 - go on	5000.00	Go On Outdoor	C6 BANK	\N	2025-08-06 23:25:03.530159+00	2025-08-06 23:25:03.530159+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c491e10b-c843-4f31-9fc4-4f01a94e3e0e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	entrada	Site yago - falta 500	1000.00	Outras receitas	C6 BANK	\N	2025-08-06 23:25:26.858598+00	2025-08-06 23:25:26.858598+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d32e92ec-ca9b-4aec-b7bc-ab4eaee6cf8e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	saida	Condor	118.98	Comida	C6 BANK	\N	2025-08-06 23:44:26.808626+00	2025-08-06 23:44:26.808626+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
dd6079a6-7271-4b15-997c-35757bddbc49	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	saida	cabelo	75.00	Contas mensais	C6 BANK	\N	2025-08-06 23:44:43.704213+00	2025-08-06 23:44:43.704213+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
27a00ee4-0acc-4553-9a3a-3b3a6b632ac8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	saida	vacari - palmito	33.20	Comida	C6 BANK	\N	2025-08-06 23:45:16.52608+00	2025-08-06 23:45:16.52608+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d618971b-5a2e-46f7-b959-e2916275bfe3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-06	saida	Aporte em investimento: Reserva C6 Bank	1000.00	Investimentos	C6 BANK	investimento	2025-08-06 23:47:49.88077+00	2025-08-06 23:47:49.88077+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
12b00b55-5d8a-44fd-ad00-3d9729d8b446	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-09	saida	Farmácia	9.95	Vida Esportiva	C6 BANK	\N	2025-08-09 21:04:20.297134+00	2025-08-09 21:04:20.297134+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
bb1dd7f4-81ff-490a-ba81-f03bf9dec015	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-06	saida	espetinhos food	77.99	Comida	NUBANK	\N	2025-08-11 13:24:10.768199+00	2025-08-11 13:24:10.768199+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0d0335e8-6f59-4928-879f-8e9af6b05d4f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-07	saida	pascal	44.44	Comida	NUBANK	\N	2025-08-11 13:24:28.950987+00	2025-08-11 13:24:28.950987+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ff953af3-0d33-4d09-9182-826994cac3f8	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-08	saida	coxinha food	43.18	Comida	NUBANK	\N	2025-08-11 13:24:51.731782+00	2025-08-11 13:24:51.731782+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
76a8ffc4-8ea0-43ed-be05-8a4501938ceb	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-08	saida	dedetização 15.08	180.00	Apartamento	NUBANK	\N	2025-08-11 13:25:26.926424+00	2025-08-11 13:25:26.926424+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3964cf1d-bea7-4d08-a10e-5e81ed28e859	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-09	saida	doçura e afeto	82.00	Comida	NUBANK	\N	2025-08-11 13:25:46.527384+00	2025-08-11 13:25:46.527384+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8442b62f-2892-4d81-89ef-887382a99ba6	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-11	saida	exame de sangue - selenio	48.00	Vida esportiva	NUBANK	\N	2025-08-11 13:26:23.639233+00	2025-08-11 13:26:23.639233+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7eaa699f-dea2-4955-8c0c-113da4c2107d	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-11	saida	festival	44.46	Comida	NUBANK	\N	2025-08-11 13:26:38.929126+00	2025-08-11 13:26:38.929126+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d56a840b-5b8e-43e3-a28d-5a9e277f6e04	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-11	saida	Uber volta exame de sangue	15.08	Carro	NUBANK	\N	2025-08-11 13:27:14.344277+00	2025-08-11 13:27:14.344277+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
76341952-03dc-4054-94b8-8cd093e36dfa	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-11	saida	Ração e petiscos 	220.95	Itens Físicos	NUBANK	\N	2025-08-11 13:27:51.962641+00	2025-08-11 13:27:51.962641+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
72fbb194-d3b2-4023-93b5-22ba015888b7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Cartão de crédito	239.90	Contas mensais	C6 BANK	\N	2025-08-13 07:51:54.901561+00	2025-08-13 07:51:54.901561+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2a142a80-85b9-4fb3-9f0a-b6f088f59685	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Repasse Diogo	800.00	Go On Outdoor	C6 BANK	\N	2025-08-13 07:52:29.953058+00	2025-08-13 07:52:29.953058+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
68d089ec-e7bd-432b-9553-c287024e9105	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Gasolina	150.00	Carro	C6 BANK	\N	2025-08-13 07:53:03.585165+00	2025-08-13 07:53:03.585165+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e98f39ba-00a9-44c2-b772-22b455438eeb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Festival	30.36	Comida	C6 BANK	\N	2025-08-13 07:54:40.506843+00	2025-08-13 07:54:40.506843+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e5ec0e49-fc99-49fb-8d46-0a82e5c5d86b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Isotônico P4	45.74	Vida Esportiva	C6 BANK	\N	2025-08-13 20:49:31.468697+00	2025-08-13 20:49:31.468697+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7286baa0-0847-46b6-b502-0fe838312afb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-13	saida	Camiseta La Mision P4	134.10	Vida Esportiva	C6 BANK	\N	2025-08-13 20:50:37.41918+00	2025-08-13 20:50:37.41918+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a26c7c74-30f9-4435-856c-c1fffee9024d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Pousada Tia ana P4	1290.00	Vida esportiva	C6 BANK	\N	2025-08-19 14:54:42.479893+00	2025-08-19 14:54:42.479893+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ae945e29-d109-4f51-8f0c-9935ad3614e2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Uber ida P4	51.80	Vida esportiva	C6 BANK	\N	2025-08-19 14:51:43.327653+00	2025-08-19 14:51:43.327653+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6834d719-ac6a-4e82-ad41-fe7e2c63cebc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	uber volta p4	66.75	Vida esportiva	C6 BANK	\N	2025-08-19 14:52:02.482687+00	2025-08-19 14:52:02.482687+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
cbfff350-a945-4c5c-aa5e-c32f886c5c3d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Pizza Hut guarulhos	88.70	Vida esportiva	C6 BANK	\N	2025-08-19 14:52:20.683488+00	2025-08-19 14:52:20.683488+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
cc2903dc-2658-4523-ac41-18f03454b968	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	carro alugado P4	905.31	Vida esportiva	C6 BANK	\N	2025-08-19 14:52:45.711891+00	2025-08-19 14:52:45.711891+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f456efcd-9d5c-4b70-b6c2-9c4594b059dd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Pizza Hut guarulhos P4	88.70	Vida esportiva	C6 BANK	\N	2025-08-19 14:53:07.957264+00	2025-08-19 14:53:07.957264+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6835e3b8-ca30-4a6e-92fc-b2b9de486329	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Etanol carro alugado P4	132.03	Vida esportiva	C6 BANK	\N	2025-08-19 14:53:36.35757+00	2025-08-19 14:53:36.35757+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d3785a3e-525c-4295-a28f-744f491e8e6e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Café da manhã itanhandu segunda P4	24.00	Vida esportiva	C6 BANK	\N	2025-08-19 14:54:03.865472+00	2025-08-19 14:54:03.865472+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8b6210c2-7bc0-4c15-b9aa-c31a35d7ea42	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Café P4	47.90	Vida esportiva	C6 BANK	\N	2025-08-19 14:54:25.19669+00	2025-08-19 14:54:25.19669+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a5d43ccd-c39d-43fd-ad93-6c5b9cc66478	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Mochila Salomon P4	719.92	Vida esportiva	C6 BANK	\N	2025-08-19 14:55:04.559552+00	2025-08-19 14:55:04.559552+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
03329a48-eefa-4326-8c6c-7388f06e2a8d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	água farmacia P4	15.80	Vida esportiva	C6 BANK	\N	2025-08-19 14:55:28.756085+00	2025-08-19 14:55:28.756085+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c773c6d6-cdb9-48a2-9aff-20863d09a53d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Janta itanhandu P4	68.00	Vida esportiva	C6 BANK	\N	2025-08-19 14:55:56.622685+00	2025-08-19 14:55:56.622685+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4b2489af-b74e-4fa0-95f5-21e0b5246178	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Isotonico pre prova P4	45.74	Vida esportiva	C6 BANK	\N	2025-08-19 14:56:18.526242+00	2025-08-19 14:56:18.526242+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ac3a1ecd-c766-4c96-b5a6-d2b2eeaad2f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-19	saida	Camiseta preta La Mision P4	134.10	Vida esportiva	C6 BANK	\N	2025-08-19 14:56:37.962124+00	2025-08-19 14:56:37.962124+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
21c9cdbf-d5aa-4dce-84ca-077577aa27e1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-12	saida	Nissei	97.80	Itens Físicos	NUBANK	\N	2025-08-19 21:24:48.647074+00	2025-08-19 21:24:48.647074+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1dbd0864-e246-4b95-a20e-e221f5e4f4c1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-12	saida	Pascal	73.29	Comida	NUBANK	\N	2025-08-19 21:25:10.335561+00	2025-08-19 21:25:10.335561+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8268a844-5144-41ac-b33d-2813f160c7fe	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	Café aeroporto ida para passa quatro	56.80	Comida	NUBANK	\N	2025-08-19 21:25:47.973559+00	2025-08-19 21:25:47.973559+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ae86e8c6-9466-499c-a3fd-9f2aec9adb4b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	Almoço Frango Assado	149.50	Comida	NUBANK	\N	2025-08-19 21:26:12.999373+00	2025-08-19 21:26:12.999373+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f54051f2-cfa1-4f59-b42c-8b95fd7e59d9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	Camisetas la misión promoçao	80.00	Vida esportiva	NUBANK	\N	2025-08-19 21:26:36.28444+00	2025-08-19 21:26:36.28444+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4d7b8d57-1a7a-456b-ad8b-94e315adeaee	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	comida la mision	27.00	Comida	NUBANK	\N	2025-08-19 21:27:21.596151+00	2025-08-19 21:27:21.596151+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
801d2e31-c630-4860-9841-bfe6748732ed	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	comida la mision	63.25	Comida	NUBANK	\N	2025-08-19 21:27:41.443854+00	2025-08-19 21:27:41.443854+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5ff597f6-ab12-4b1f-a96d-799c37de4676	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-14	saida	comida la mision	40.00	Comida	NUBANK	\N	2025-08-19 21:28:06.411888+00	2025-08-19 21:28:06.411888+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ffe10ddb-69aa-4f53-ae4d-437966f9054e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-14	saida	comida la mision	76.67	Comida	NUBANK	\N	2025-08-19 21:28:26.06233+00	2025-08-19 21:28:26.06233+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0e905103-ce98-44f9-994c-057a48454875	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-13	saida	comida la mision	30.00	Comida	NUBANK	\N	2025-08-19 21:28:57.230491+00	2025-08-19 21:28:57.230491+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
6e0213cb-8fce-4495-aa46-7b38c44dd872	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-14	saida	doce de leite la misión	123.00	Comida	NUBANK	\N	2025-08-19 21:29:30.308168+00	2025-08-19 21:29:30.308168+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7b704dae-45b6-4053-aff2-90a38c0074d7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-14	saida	comida la mision	13.00	Comida	NUBANK	\N	2025-08-19 21:29:46.273908+00	2025-08-19 21:29:46.273908+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fc4862f0-281d-4d24-914e-ee08734634c6	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-14	saida	comida la mision	20.00	Comida	NUBANK	\N	2025-08-19 21:30:08.483185+00	2025-08-19 21:30:08.483185+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1e2843d4-2c08-4ec0-9d3c-04a1a766c036	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	5.97	Comida	NUBANK	\N	2025-08-19 21:30:30.701006+00	2025-08-19 21:30:30.701006+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2a8b8490-1299-4542-a37d-06dd5f8a0aeb	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	96.96	Comida	NUBANK	\N	2025-08-19 21:30:48.646331+00	2025-08-19 21:30:48.646331+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fb0426a4-a134-4f9f-91a2-d8d9bd2327f5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	10.00	Comida	NUBANK	\N	2025-08-19 21:31:18.472449+00	2025-08-19 21:31:18.472449+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
77b4da2b-fdb8-4bf6-b58f-6d85fd3ea54b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	16.00	Comida	NUBANK	\N	2025-08-19 21:31:34.422723+00	2025-08-19 21:31:34.422723+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3632ffce-0ee1-4e61-8b48-72fcf42c81f5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	8.00	Comida	NUBANK	\N	2025-08-19 21:31:48.672928+00	2025-08-19 21:31:48.672928+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
bd3a1243-e7ca-4475-80e8-8ebc07d6c4b3	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-15	saida	comida la mision	90.00	Comida	NUBANK	\N	2025-08-19 21:32:12.320715+00	2025-08-19 21:32:12.320715+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ae4472db-657f-4f40-b3a1-2f0fb25e5fc0	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	trança la misión	35.00	Vida esportiva	NUBANK	\N	2025-08-19 21:32:38.601572+00	2025-08-19 21:32:38.601572+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9230a6df-2654-4b26-8c89-6f5955ac2633	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	comida la mision	15.00	Comida	NUBANK	\N	2025-08-19 21:33:02.037126+00	2025-08-19 21:33:02.037126+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1151b914-2fb6-47cf-9a09-c000d68c2336	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	comida la mision	4.00	Comida	NUBANK	\N	2025-08-19 21:33:21.269178+00	2025-08-19 21:33:21.269178+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
29c44560-a884-49a5-b014-50f069f9c2d5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	comida la mision	22.00	Comida	NUBANK	\N	2025-08-19 21:33:37.020229+00	2025-08-19 21:33:37.020229+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
48d2243a-3227-4ee5-9087-87ff6c3dfcb9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	comida la mision	132.00	Comida	NUBANK	\N	2025-08-19 21:34:01.212943+00	2025-08-19 21:34:01.212943+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1e935df2-5770-4ec3-b9ec-ec23b4aaf70b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-16	saida	comida la mision	25.00	Comida	NUBANK	\N	2025-08-19 21:34:18.651348+00	2025-08-19 21:34:18.651348+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
49b502b5-8e1b-42e8-84f5-d525f8bd239b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-17	saida	comida la mision	39.00	Comida	NUBANK	\N	2025-08-19 21:37:34.908544+00	2025-08-19 21:37:34.908544+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b221eb82-cca8-45f6-abd5-72299dfc0afb	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-17	saida	comida la mision	80.10	Comida	NUBANK	\N	2025-08-19 21:37:56.348777+00	2025-08-19 21:37:56.348777+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
752ad330-d675-4b5f-b427-e1a3e316f9b5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-17	saida	comida la mision	40.00	Comida	NUBANK	\N	2025-08-19 21:38:22.83671+00	2025-08-19 21:38:22.83671+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5bcb6899-6eea-4234-8104-292b39080cc1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-17	saida	fotos la misión	124.50	Vida esportiva	NUBANK	\N	2025-08-19 21:39:09.713217+00	2025-08-19 21:39:09.713217+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9fd99648-8711-41f0-b307-9d22e4d9cd5e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-17	saida	comida la mision	104.50	Comida	NUBANK	\N	2025-08-19 21:39:40.35615+00	2025-08-19 21:39:40.35615+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
638f57e9-8834-420d-ab27-38aae9cc7928	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-18	saida	comida la mision	50.00	Comida	NUBANK	\N	2025-08-19 21:40:05.88565+00	2025-08-19 21:40:05.88565+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
01849779-f7d7-4725-925a-0111a0057888	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-19	saida	Unimed Agosto	501.19	Contas mensais	NUBANK	\N	2025-08-19 21:40:56.890842+00	2025-08-19 21:40:56.890842+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
31820431-5de8-4c2e-b074-b5da81682f1b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-19	saida	estacionamento aeroporto	33.00	Lazer e ócio	NUBANK	\N	2025-08-19 21:41:27.41429+00	2025-08-19 21:41:27.41429+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3fdb861a-e471-46d7-98d4-aebd0e99f8b9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-08-19	entrada	reembolso mãe	63.00	Outras receitas	NUBANK	\N	2025-08-19 21:41:43.765033+00	2025-08-19 21:41:43.765033+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
78fcdf26-eb22-41d4-a304-aef2345a345d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-22	entrada	pro labore	5160.00	Go On Outdoor	C6 BANK	\N	2025-08-22 23:23:06.244739+00	2025-08-22 23:23:06.244739+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d6c61c66-b04c-4abc-aabf-6cc269d942ab	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-22	entrada	presente mae e sogra niver	250.00	Outras receitas	C6 BANK	\N	2025-08-22 23:23:30.325209+00	2025-08-22 23:23:30.325209+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
677d3a6b-f588-4d4d-a90a-01fa0c67b47f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-22	saida	Remédio marcela colica	73.80	Apartamento	C6 BANK	\N	2025-08-22 23:24:03.974517+00	2025-08-22 23:24:03.974517+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e0cc2fee-2767-489e-92b8-dd8e3c9ea5d1	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-22	entrada	camera e coros vendido	429.00	Outras receitas	ASAAS	\N	2025-08-22 23:26:00.664306+00	2025-08-22 23:26:00.664306+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ec6318d5-cda3-46e8-9413-052e3ca6f248	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-26	saida	Chocolates Solange	68.66	Itens Físicos	C6 BANK	\N	2025-08-26 17:43:04.288653+00	2025-08-26 17:43:04.288653+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
33713593-28d8-45a0-80d0-e510557affb7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-26	saida	Exame de sangue	177.00	Vida Esportiva	C6 BANK	\N	2025-08-26 17:43:34.083139+00	2025-08-26 17:43:34.083139+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ec2f0c04-88d2-4856-9103-fd3ca0d41107	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-26	saida	Aluguel setembro	3119.89	Apartamento	C6 BANK	\N	2025-08-26 22:22:48.704748+00	2025-08-26 22:22:48.704748+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
344eab8d-347b-48b7-ae01-5b4bb7787728	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-28	saida	Entradas Salto Boa Vista	159.80	Vida Esportiva	C6 BANK	\N	2025-08-28 15:05:18.940425+00	2025-08-28 15:05:18.940425+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
bad91247-04e7-458b-ae6c-ea02c6ab50ab	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-30	saida	Imposto	503.81	Escritório	ASAAS	\N	2025-08-30 14:19:14.696586+00	2025-08-30 14:19:14.696586+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
655fea07-0599-4318-af31-572a58df64e4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-29	saida	Jogo cap	116.09	Lazer e ócio	C6 BANK	\N	2025-09-02 15:02:47.602878+00	2025-09-02 15:02:47.602878+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2c6f741f-0ee8-4012-b437-d7efc0d3e9a7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-02	saida	Macarrão drive trhu	65.80	Comida	C6 BANK	\N	2025-09-02 15:03:21.945524+00	2025-09-02 15:03:21.945524+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
21176b67-8be0-46bd-8020-c96e6a02c22b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-02	saida	Livro Charlie	60.34	Estudos	C6 BANK	\N	2025-09-02 15:04:54.362359+00	2025-09-02 15:04:54.362359+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
e8f58138-7e6c-4d4c-bf1b-fc1f2b933a68	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-02	saida	inscrição discover trail	312.12	Vida esportiva	C6 BANK	\N	2025-09-02 23:23:19.088152+00	2025-09-02 23:23:19.088152+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
59ca1f9b-c2b4-41d5-9b64-e796fca9f483	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-02	saida	Primeira parcela nutri - tati cavalli	530.64	Vida esportiva	C6 BANK	\N	2025-09-02 23:25:24.155365+00	2025-09-02 23:25:24.155365+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1a1a7948-692f-43ad-8ae7-85005a6a9240	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04	saida	Aporte em investimento: Reserva C6 Bank	500.00	Investimentos	C6 BANK	investimento	2025-09-04 13:32:21.795534+00	2025-09-04 13:32:21.795534+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5afa3db7-bb4a-4646-8eb3-861917159d2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	francecinha portugal	145.00	Comida	C6 BANK	\N	2025-09-11 17:21:49.528121+00	2025-09-11 17:21:49.528121+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
2b4c31c8-b230-4392-bb25-8183456e72c7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	salgados condor	48.00	Comida	C6 BANK	\N	2025-09-11 17:22:10.571218+00	2025-09-11 17:22:10.571218+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
517f1141-6f6f-4f72-8053-66639ec378e7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	corte de cabelo	75.00	Contas mensais	C6 BANK	\N	2025-09-11 17:22:22.569817+00	2025-09-11 17:22:22.569817+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a7fe0514-ac15-4211-a4db-e6ade537016d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	Mel natalha	405.89	Comida	C6 BANK	\N	2025-09-11 17:22:37.869589+00	2025-09-11 17:22:37.869589+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a4b4dfb8-61c4-41d4-a75b-ec6b1c89534a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	vitaminas nutri	142.00	Vida esportiva	C6 BANK	\N	2025-09-11 17:23:01.733186+00	2025-09-11 17:23:01.733186+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
c772f4df-b151-4d85-9aca-8b266a997135	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	churros laura e biel	54.00	Lazer e ócio	C6 BANK	\N	2025-09-11 17:23:34.053484+00	2025-09-11 17:23:34.053484+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7e9e3423-cab6-4803-9e69-ade4a1866424	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	kinder parque laura e biel	179.80	Lazer e ócio	C6 BANK	\N	2025-09-11 17:23:47.561044+00	2025-09-11 17:23:47.561044+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b9aa4baa-0199-4b0a-9cfd-3b94cf74518d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	Cartão de crédito	393.02	Contas mensais	C6 BANK	\N	2025-09-11 17:26:45.008284+00	2025-09-11 17:26:45.008284+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5d3830c2-3a9c-4e9c-b29d-4488333504a2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	contbilidade	200.00	Escritório	C6 BANK	\N	2025-09-11 17:28:54.507669+00	2025-09-11 17:28:54.507669+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
169d895c-0c84-4199-a0bb-e2768191ed5e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	copel	65.99	Apartamento	C6 BANK	\N	2025-09-11 17:29:12.646256+00	2025-09-11 17:29:12.646256+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
91b2bea4-84b4-49b4-af62-263864d9374e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	Das mei marcela	80.90	Escritório	C6 BANK	\N	2025-09-11 17:29:29.473549+00	2025-09-11 17:29:29.473549+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
883e84d0-3ff5-459b-8fa7-325e0278f8ff	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	fisio vanessa	349.00	Vida esportiva	C6 BANK	\N	2025-09-11 17:29:45.887928+00	2025-09-11 17:29:45.887928+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
bfb06d5c-8406-415f-af6d-919ea9037db2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	gas ultragaz	189.29	Apartamento	C6 BANK	\N	2025-09-11 17:30:05.53322+00	2025-09-11 17:30:05.53322+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9784c9f0-8991-48b7-813a-b36ff7aa378e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	Projeto falcon	297.00	Estudos	C6 BANK	\N	2025-09-11 17:30:35.472667+00	2025-09-11 17:30:35.472667+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1cc90e66-3c88-4c51-bec6-0d327b933d83	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	terapia	480.00	Contas mensais	C6 BANK	\N	2025-09-11 17:30:57.423142+00	2025-09-11 17:30:57.423142+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
20f5200c-bcab-44b7-b330-c2a673d5143f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	vivo fibra	156.00	Apartamento	C6 BANK	\N	2025-09-11 17:31:09.185539+00	2025-09-11 17:31:09.185539+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
8e8d0ae8-b65e-497c-8d84-c5dd58b4a723	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	entrada	pro labore 1	5100.00	Go On Outdoor	C6 BANK	\N	2025-09-11 17:31:30.635914+00	2025-09-11 17:31:30.635914+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a8828a9e-5767-4f48-b51e-cc2838c1bf2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	entrada	part 2 YAGO SITE	500.00	Outras receitas	C6 BANK	\N	2025-09-11 17:31:52.32861+00	2025-09-11 17:31:52.32861+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
12077a67-bd5f-4ad8-9533-29ec7c5e0ce0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11	saida	Mercado marcela	1000.00	Apartamento	C6 BANK	\N	2025-09-11 17:34:33.106345+00	2025-09-11 17:34:33.106345+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
1bc68549-6d56-4e0b-9f18-feb15484e288	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	entrada	saldo camisetas go on	1000.00	Go On Outdoor	C6 BANK	\N	2025-09-30 22:44:49.843806+00	2025-09-30 22:44:49.843806+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
fcbccbea-f66d-4cf2-b2ce-0937aae20181	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	inscrição mãe run the pink	53.00	Lazer e ócio	C6 BANK	\N	2025-09-30 22:45:12.17555+00	2025-09-30 22:45:12.17555+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
da41394a-11be-48e4-984a-f82596a9b83b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	2º parcela tati cavalli	432.00	Vida esportiva	C6 BANK	\N	2025-09-30 22:45:31.944363+00	2025-09-30 22:45:31.944363+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3aacb8b9-4b8f-4ad6-8be7-caddeb5dffe3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	almoço festval	63.11	Comida	C6 BANK	\N	2025-09-30 22:45:54.412153+00	2025-09-30 22:45:54.412153+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f8da85ef-e0e2-4991-82f7-8a25272a315f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	chocolate luizinho aniversário	56.70	Itens Físicos	C6 BANK	\N	2025-09-30 22:46:25.571998+00	2025-09-30 22:46:25.571998+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b2e6d1dc-4d0b-4bb2-ae39-905566709288	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	pizza maias jantar	120.00	Comida	C6 BANK	\N	2025-09-30 22:46:47.033741+00	2025-09-30 22:46:47.033741+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d34d5003-5ed7-4f99-85fe-985b1a931007	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	frete camisetas wanda	19.83	Go On Outdoor	C6 BANK	\N	2025-09-30 22:47:10.547818+00	2025-09-30 22:47:10.547818+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4b4efaeb-6949-432c-9a54-e1951e688868	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	dominio marcelaheiden.com.br	39.99	Escritório	C6 BANK	\N	2025-09-30 22:47:41.19016+00	2025-09-30 22:47:41.19016+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
020349e2-3332-4b2b-843c-b11c58ccb64d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	frete cssbuy roupas	100.00	Itens Físicos	C6 BANK	\N	2025-09-30 22:48:09.052857+00	2025-09-30 22:48:09.052857+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d6b400d6-ac1d-4e4d-a988-daba793ad367	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	Brownies	69.49	Comida	C6 BANK	\N	2025-09-30 22:48:32.009107+00	2025-09-30 22:48:32.009107+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a61d7621-99b4-4eec-93af-1c912e3b10cd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	queijo festval	42.18	Comida	C6 BANK	\N	2025-09-30 22:49:02.010693+00	2025-09-30 22:49:02.010693+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
a6a7d2f2-f7e3-418e-9f8b-6119aaff6270	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	acelerador de atomos c6 bank	22.00	Contas mensais	C6 BANK	\N	2025-09-30 22:49:20.888078+00	2025-09-30 22:49:20.888078+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
88553edb-90c6-4cac-8ba6-88fd40a63f94	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	rodizio pizza pantia pena	168.60	Comida	C6 BANK	\N	2025-09-30 22:49:44.48317+00	2025-09-30 22:49:44.48317+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
4d66afdf-17d6-4396-9ffd-46f4a816d463	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	mantimentos casa festval	161.10	Comida	C6 BANK	\N	2025-09-30 22:51:23.071483+00	2025-09-30 22:51:23.071483+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
69172f62-3a78-441e-9a49-be14486b7634	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	equipamentos osmo aliexpress	184.07	Escritório	C6 BANK	\N	2025-09-30 22:51:58.183756+00	2025-09-30 22:51:58.183756+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
183d7318-76a4-45ad-b69d-b3250d80347f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	frete camisetas aluno rio grande do norte	29.41	Go On Outdoor	C6 BANK	\N	2025-09-30 22:52:38.354135+00	2025-09-30 22:52:38.354135+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3696c80d-6be3-4404-9adc-f9c00a496895	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	gasolina	150.00	Carro	C6 BANK	\N	2025-09-30 22:52:57.059402+00	2025-09-30 22:52:57.059402+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
d00e2260-26d6-4960-aae6-8a3dff3bc696	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	entrada	pro labore 2 go on	5000.00	Go On Outdoor	C6 BANK	\N	2025-09-30 22:53:59.137401+00	2025-09-30 22:53:59.137401+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
edcc17a3-eb38-47db-8426-f3d7cd3a0492	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-30	saida	Aluguel	2964.02	Apartamento	C6 BANK	\N	2025-09-30 22:59:06.647109+00	2025-09-30 22:59:06.647109+00	\N	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
0508f07d-a8dd-47b8-a29c-292b9dc659e5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-13	saida	Cirurgia Tereza	350.00	Tereza e Dimitri	N/A	\N	2025-10-13 17:35:19.991125+00	2025-10-13 17:35:19.991125+00	786da91f-5e21-488b-8e08-95f9d3e656a0	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7045b18c-d203-4110-ac6d-0237d2229420	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-13	saida	Bermuda Run More - Natal mãe	150.00	Presentes	N/A	\N	2025-10-13 17:35:40.311108+00	2025-10-13 17:35:40.311108+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
482bdd14-8093-47a5-a4f8-ccb687c460a9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-13	saida	Gás com adicional do relógio novo	314.08	Gás	N/A	\N	2025-10-13 17:59:52.303422+00	2025-10-13 17:59:52.303422+00	786da91f-5e21-488b-8e08-95f9d3e656a0	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
419e39be-11d6-4d5c-93b6-9ecf4adb1daa	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-13	saida	Feijoada sábado	120.00	Restaurante	N/A	\N	2025-10-13 19:03:56.527109+00	2025-10-13 19:03:56.527109+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
aa5d0806-6d1f-4afd-9ebe-7f1a92b44fc7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-13	saida	barrinhas treinão alta montanha	69.50	Feira	N/A	\N	2025-10-13 19:04:34.34392+00	2025-10-13 19:04:34.34392+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
487748ff-5790-4dbc-8aa3-233fd3dd1c7c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	barrinha alta montanha	14.00	Snacks	C6 BANK	\N	2025-10-06 00:14:00.235782+00	2025-10-14 01:21:51.197+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
483e0be4-1cfe-49ae-9790-6996d278dffd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	gelzinho + Meia compress sport	401.87	Equipamentos	C6 BANK	\N	2025-10-06 00:14:45.30808+00	2025-10-14 01:22:06.209+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b2521cea-8690-4c94-aee2-f280f16b833a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	pote chope - parmegiana para 3	187.00	Restaurante	C6 BANK	\N	2025-10-06 00:15:05.047919+00	2025-10-14 01:22:26.709+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
84f53b6b-8c9f-4b76-97c0-4f8bcd3b6a67	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	estacionamento procorrer	24.00	Estacionamento	C6 BANK	\N	2025-10-06 00:15:20.241176+00	2025-10-14 01:22:36.075+00	42f47fc8-1503-4707-9b73-642aefe4cc6b	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
11ea8ecd-b9fd-4cac-adb9-663b3616ace0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	zdm prime para Marcela	147.00	Cursos/formações	C6 BANK	\N	2025-10-06 00:15:57.275752+00	2025-10-14 01:22:58.125+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
03cef4ec-6991-4fdd-940a-7cfdea4870c7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	contabilidade vanessa	200.00	Serviço de terceiro	C6 BANK	\N	2025-10-06 00:41:34.562185+00	2025-10-15 19:06:01.326+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	9c89a160-ed4e-406c-b8f3-001f970eaf20	approved	\N	f	\N	\N	\N	f	\N	\N	\N
e8a61144-0933-4181-a870-d882179e0d86	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	fisioterapia vanessa	314.00	Fisioterapia	C6 BANK	\N	2025-10-06 00:41:46.188454+00	2025-10-14 01:37:38.108+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	t	73ae9ae5-c333-4776-8b72-a5b415167f08	approved	\N	f	\N	\N	\N	f	\N	\N	\N
bd1c4666-6172-4893-80ab-5a094dc5ef6e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	energia elétrica	88.84	Luz	C6 BANK	\N	2025-10-06 00:27:12.656544+00	2025-10-15 19:10:43.627+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	2fcbd1d1-03cd-467c-9b0c-a92ad72406c9	approved	\N	f	\N	\N	\N	f	\N	\N	\N
ba291550-eb6e-47c1-be18-10e5cdc79de5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	Vivo fibra	156.00	Internet	C6 BANK	\N	2025-10-06 00:21:00.995682+00	2025-10-15 19:10:49.692+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	774ef7af-761c-4fa4-a32c-463278ec581f	approved	\N	f	\N	\N	\N	f	\N	\N	\N
9b11f472-3cde-42ee-b93c-5fb6e4d71958	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	Terapia	480.00	Serviços pessoais	C6 BANK	\N	2025-10-06 00:41:15.545687+00	2025-10-15 19:11:00.126+00	d4a8bdf9-d796-44dc-9498-553076c57748	t	527b7990-fbdc-4e13-8af9-68b3dfc9d1c0	approved	\N	f	\N	\N	\N	f	\N	\N	\N
bfbcfc66-0dd9-408e-bb48-deb7b19831c0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	das mei marcela	80.90	Impostos	C6 BANK	\N	2025-10-06 00:42:15.418981+00	2025-10-15 19:11:07.775+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	63c185d4-aaf9-4e10-9606-b0c80733a0a6	approved	\N	f	\N	\N	\N	f	\N	\N	\N
d595b75a-9129-4445-aeb2-bb966ace59f7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	saida	Opção B - Petiscaria mãe	74.50	Restaurante	C6 Bank	\N	2025-10-06 00:16:17.403241+00	2025-10-06 00:16:17.403241+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
50263288-5a38-45fa-93a4-8efdbce7e3dd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-09	saida	Gelzinho tati 226	278.10	Suplementos	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:05:02.633+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
606c1a27-2100-4dbb-99b8-515e97e8848c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-08	saida	Café expresso	9.90	Padaria	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:05:18.483+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
0ba0e8c9-8134-4cc4-961c-d79ef8b1caf3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-09	saida	Gasolina	200.00	Combustível	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:05:33.367+00	42f47fc8-1503-4707-9b73-642aefe4cc6b	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
bbe0bb7d-1823-436b-b263-b31127b1d4c9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-08	saida	Corte de cabelo	75.00	Estética	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:06:20.084+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
862f7a8d-9314-4155-9bb0-1b9e73369514	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Frete camiseta Adriana Nalesso	17.93	Logística	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:07:11.187+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
0ab289dd-5950-47f2-95d9-dcc64cc5bfd6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	entrada	Pro labore 1 - go on	5000.00	Pró-labore	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:07:46.921+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
f170bd90-e4b1-46fe-addb-4a79fc05ee9b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Compras mercado mensal	1300.00	Mercado mensal	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:08:14.637+00	786da91f-5e21-488b-8e08-95f9d3e656a0	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
bea3ea4b-d792-453f-b460-eccc5fc172f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	Impostos	224.57	Impostos	N/A	recurring_auto	2025-10-13 23:34:36.85123+00	2025-10-14 01:23:10.392+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	4cbf520a-a45a-477d-ad6a-f9a88586840e	approved	\N	f	\N	\N	\N	f	\N	\N	\N
11d9db9d-1126-4bdb-aeae-2b4be5cb8e21	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	entrada	Pix estornado	80.90	Reembolsos	C6 Bank	\N	2025-10-14 01:03:43.928805+00	2025-10-14 01:23:19.492+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	f	\N	\N	\N	f	\N	\N	\N	f	PDF - C6 Bank	\N	\N
05fd7958-8dc4-4241-aefa-93101be71cb8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-05	entrada	Marcela - procorrer gelzinho	110.00	Reembolsos	C6 BANK	\N	2025-10-06 00:15:40.961602+00	2025-10-14 01:27:48.338+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
893da062-3d3f-4923-9eb6-77c70f20bc03	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Framer - Go On + Marcela	156.39	Software	Conta Simples	\N	2025-10-15 15:22:18.132631+00	2025-10-15 15:22:18.132631+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	64275d42-0f14-44b3-8989-39a730746538	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
da526bef-3b2d-4b6c-86c5-c66706fac0a5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	IOF - Framer, Claude, Lovable,	15.55	Software	Conta Simples	\N	2025-10-15 15:20:25.59723+00	2025-10-15 15:22:32.735+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	93b23af7-3aeb-461a-9e14-150c363db030	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
5e304a4b-4c81-4da9-aab4-d4b608d3caf4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Lovable	137.55	Software	Conta Simples	\N	2025-10-15 15:23:12.942934+00	2025-10-15 15:23:12.942934+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	d39168fd-5482-4a93-adc5-15314af682fb	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
5fd72b09-b6de-43f8-ad5f-a0d4c78ed31b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	API Anthropic	89.42	AI	Conta Simples	\N	2025-10-15 15:25:29.885736+00	2025-10-15 15:25:29.885736+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	f	\N	\N	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
d8363cbe-13e8-4a4a-8524-515fe7cce75d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Google Drive + Gemini PRO	96.99	Software	Conta Simples	\N	2025-10-15 15:27:05.613744+00	2025-10-15 15:27:05.613744+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	28ba1367-14dc-45d8-b59f-c2ad942c5db2	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
b5017d90-1444-4150-b0b2-246b5a0b9d47	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Hostinger N8n	69.99	Software	Conta Simples	\N	2025-10-15 15:27:30.481246+00	2025-10-15 15:27:30.481246+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	19d71c59-7801-4a59-abb6-9762cc06046f	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
c6bc18e9-5291-4383-8876-10facafd7c91	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-07	saida	Youtube Premium	26.90	Software	Conta Simples	\N	2025-10-15 15:27:56.177824+00	2025-10-15 15:27:56.177824+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	b0d1d815-e0fc-40b4-af81-5e0e902d57e6	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
9455de53-f513-4a0d-800f-cc0184013ea3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-15	entrada	Pro labore 2	5117.83	Pró-labore	N/A	\N	2025-10-15 15:36:12.409708+00	2025-10-15 15:36:12.409708+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
9d2bfaf6-5097-4faf-8c7c-ad2ec71663a6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	Assinatura Claude AI	110.00	AI	Conta Simples	recurring_auto	2025-10-15 15:35:41.637112+00	2025-10-15 15:35:41.637112+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	d29cc3fb-1df2-408f-9548-33bacfb36f82	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
7c165de0-f443-453e-8e17-a7edd02b1c50	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	Gemini PRO Marcela	12.50	AI	Conta Simples	recurring_auto	2025-10-15 15:35:41.637112+00	2025-10-15 15:35:41.637112+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	9844b858-bb9d-45eb-9c8e-35222813eecc	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
23ecb07e-348e-4cc9-9467-9a5e5ee4a67e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	inlead marketing	97.00	Software	Conta Simples	recurring_auto	2025-10-15 15:35:41.637112+00	2025-10-15 15:35:41.637112+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	61eeadcf-2234-44eb-bb36-025d11d72c3a	approved	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
ba5d69c8-e454-4ea5-89be-86958231a30e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-15	saida	Imposto importação CSSBUY	175.00	Roupas	N/A	\N	2025-10-15 17:39:44.696674+00	2025-10-15 17:39:44.696674+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
f0bd5ad9-e799-4acd-beb0-c0ffe03ea018	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-16	saida	Renovação 1password	196.00	Software	N/A	\N	2025-10-16 16:38:15.875109+00	2025-10-16 16:38:15.875109+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
48d59f09-6127-4daf-baee-ba91805fcb50	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	acelerar c6 bank	22.00	Cobranças	N/A	\N	2025-10-23 15:17:47.579995+00	2025-10-23 15:17:47.579995+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	76682739-4de5-4d96-9cb5-6326eb9463a3	approved	\N	f	\N	\N	\N	f	\N	\N	\N
5be62e73-9e73-4acd-a8ec-9dc96f6db9c7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Frete camisetas Danilo Fernandes	74.03	Logística	N/A	\N	2025-10-23 15:18:18.221527+00	2025-10-23 15:18:18.221527+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
35a1251f-7ae9-4ad8-9842-734c519b94c0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Renovação 1password	150.00	Software	N/A	\N	2025-10-23 15:18:59.490147+00	2025-10-23 15:18:59.490147+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
7beabfa8-22a2-444c-8615-8f7fc6a036e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Nootrópicos oficial Pharma	285.78	Suplementos	N/A	\N	2025-10-23 15:19:32.06394+00	2025-10-23 15:19:32.06394+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
678d8b28-3781-48d9-b0c8-5ce564a2152a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Seguro anual palio	139.41	Seguro	N/A	\N	2025-10-23 15:20:41.353596+00	2025-10-23 15:20:41.353596+00	42f47fc8-1503-4707-9b73-642aefe4cc6b	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
483bd5ad-e300-416e-a14c-fece9c901d45	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Vivo fibra go on outdoor	122.57	Despesas Operacionais	N/A	\N	2025-10-23 15:22:50.797582+00	2025-10-23 15:22:50.797582+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
b615bdfd-68a2-40ef-9eea-5b34ce20fad0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Aluguel Galvão Imóveis	2764.63	Aluguel	N/A	\N	2025-10-23 15:24:55.308907+00	2025-10-23 15:24:55.308907+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	5dfdf037-3476-4445-bae9-8f6f79125aa7	approved	\N	f	\N	\N	\N	f	\N	\N	\N
2b557058-fd67-448f-b0c6-70b1bebbb563	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-02	saida	Fone Airpods 4 (2/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	2	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
10541d36-c341-40d1-8519-05531df58f57	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-01-02	saida	Fone Airpods 4 (3/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	3	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
b850a0b2-96ff-4a6b-9925-d86d1eca1435	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-02-02	saida	Fone Airpods 4 (4/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	4	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
ed759c6f-410e-4b23-b631-64a122cea18a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-03-02	saida	Fone Airpods 4 (5/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	5	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
5a5b11d1-4cde-41a3-8151-c0c2fc5dff10	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-04-02	saida	Fone Airpods 4 (6/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	6	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
7267886d-03fa-49cc-beca-c9bf7cd5eb27	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-05-02	saida	Fone Airpods 4 (7/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	7	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
18759d06-64ef-4e9e-b622-1cade4c47f2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-06-02	saida	Fone Airpods 4 (8/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	8	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
a203259f-3097-4718-8297-f66bf05aaa03	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-07-02	saida	Fone Airpods 4 (9/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	9	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
0808518e-cf36-4d23-8f79-18409671e40b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-08-02	saida	Fone Airpods 4 (10/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	10	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
f5b49f51-5432-446b-ae86-e337d277b012	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-09-02	saida	Fone Airpods 4 (11/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	11	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
ef3fbaa4-bf09-4b14-a077-824f8f47f179	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-10-02	saida	Fone Airpods 4 (12/12)	134.25	Acessórios	C6 Bank	installment	2025-10-24 00:56:52.810793+00	2025-10-24 00:56:52.810793+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	C6 Bank	t	12	12	83ceb7cd-10a9-4482-98d2-9ac155e277e6	f	\N	\N	\N
a262516a-2b5f-4e39-8540-f72051835fb4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	acelerar c6 bank	22.00	Cobranças	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	76682739-4de5-4d96-9cb5-6326eb9463a3	pending	\N	f	\N	\N	\N	f	\N	\N	\N
928c0645-4e9f-401a-9f35-6286066d07ef	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Aluguel Galvão Imóveis	2764.63	Aluguel	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	5dfdf037-3476-4445-bae9-8f6f79125aa7	pending	\N	f	\N	\N	\N	f	\N	\N	\N
6bb599a8-c6ab-4168-89a3-6abf5ab1c0e7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Pacote adobe 	189.00	Software	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	1ba02edc-da6b-4e1b-be7f-2db4feadf7d7	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
f419fa24-f82b-44b5-bb21-8a8b23b73ad2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Pacote adobe 	189.00	Software	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	f1f8cb54-d219-4bd5-bee6-8f26c1790d01	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
1bc4980e-ddaf-4e8c-bb28-d6118dea8c2a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Pacote adobe 	189.00	Software	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	7fe42e72-2004-424e-a900-b3352e8f5de4	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
4269e7bb-1873-4de3-8d05-e78e9fefbdae	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Impostos	224.57	Impostos	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	4cbf520a-a45a-477d-ad6a-f9a88586840e	pending	\N	f	\N	\N	\N	f	\N	\N	\N
eda9b56f-614e-4645-aa5e-256c8c83e018	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Impostos	224.57	Impostos	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	83b6e195-5015-4f28-8738-2833773b6374	pending	\N	f	\N	\N	\N	f	\N	\N	\N
f6145ca8-4f4c-40ec-b50b-1324a0e66896	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	fisioterapia vanessa	314.00	Fisioterapia	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	t	73ae9ae5-c333-4776-8b72-a5b415167f08	pending	\N	f	\N	\N	\N	f	\N	\N	\N
40dd3ced-786a-4241-8e1f-c113ded72465	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	IOF - Framer, Claude, Lovable,	15.55	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	93b23af7-3aeb-461a-9e14-150c363db030	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
df89c2ef-39f8-4767-9710-af2bfd0de37f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Framer - Go On + Marcela	156.39	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	64275d42-0f14-44b3-8989-39a730746538	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
9e1a3272-eea3-4feb-817f-9b0087bc5e2c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Lovable	137.55	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	d39168fd-5482-4a93-adc5-15314af682fb	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
e2f27399-c6bc-42e7-9232-6aab08424ba9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Assinatura Claude AI	110.00	AI	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	d29cc3fb-1df2-408f-9548-33bacfb36f82	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
dda2ed0d-d571-4318-9d48-85878e5585a4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Google Drive + Gemini PRO	96.99	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	28ba1367-14dc-45d8-b59f-c2ad942c5db2	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
af9fb707-376a-477f-a573-ff7be99bd622	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Hostinger N8n	69.99	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	19d71c59-7801-4a59-abb6-9762cc06046f	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
ed8df0fe-7f72-4691-88ca-439de71c82a7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Youtube Premium	26.90	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	b0d1d815-e0fc-40b4-af81-5e0e902d57e6	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
6f8667cd-053d-409a-9879-fa79aa2c05f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	inlead marketing	97.00	Software	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	61eeadcf-2234-44eb-bb36-025d11d72c3a	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
acf85eec-7d92-4053-a2ba-459af9bc6056	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Gemini PRO Marcela	12.50	AI	Conta Simples	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	9844b858-bb9d-45eb-9c8e-35222813eecc	pending	Conta Simples	f	\N	\N	\N	f	\N	\N	\N
86d71adc-d928-450e-a6ac-fa3f43608041	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	contabilidade vanessa	200.00	Serviço de terceiro	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	9c89a160-ed4e-406c-b8f3-001f970eaf20	pending	\N	f	\N	\N	\N	f	\N	\N	\N
9e67dc75-65d8-4e1a-8fbd-f58e94d1d00d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	energia elétrica	88.84	Luz	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	2fcbd1d1-03cd-467c-9b0c-a92ad72406c9	pending	\N	f	\N	\N	\N	f	\N	\N	\N
377fd7dc-9774-4e57-b7fb-21380cbac7b8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Vivo fibra	156.00	Internet	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	786da91f-5e21-488b-8e08-95f9d3e656a0	t	774ef7af-761c-4fa4-a32c-463278ec581f	pending	\N	f	\N	\N	\N	f	\N	\N	\N
4c5a90bc-898c-4c35-a062-f9fb1257fae3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Terapia	480.00	Serviços pessoais	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	d4a8bdf9-d796-44dc-9498-553076c57748	t	527b7990-fbdc-4e13-8af9-68b3dfc9d1c0	pending	\N	f	\N	\N	\N	f	\N	\N	\N
94a2fa4a-aa15-4632-ac2a-db394f48decc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	das mei marcela	80.90	Impostos	N/A	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	63c185d4-aaf9-4e10-9606-b0c80733a0a6	pending	\N	f	\N	\N	\N	f	\N	\N	\N
a5fa487a-f283-4a68-8576-1bd8d34b68ac	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Spotify	31.90	Serviços pessoais	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	d4a8bdf9-d796-44dc-9498-553076c57748	t	f022ce69-9424-4095-8f14-c0848fba0f7d	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
3862f236-807f-457a-ab09-f504b8f02bc6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	TV Meli +	78.80	Serviços pessoais	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	d4a8bdf9-d796-44dc-9498-553076c57748	t	743754ed-2494-4d98-90ae-698a1e2b6e73	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
9f0dec62-61df-4587-a9b2-a3d1737565fc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Assinatura ChatGPT Plus	99.90	AI	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	c0330cd2-25e9-4416-b086-d51016c9e6e6	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
d09c4638-c2fe-46bd-b531-06f4c567db4a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Apple cloud	5.90	Software	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	6783c41f-806b-43b0-8707-03267972e7e5	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
38daa484-687a-4281-aa9a-c0619f6d3b44	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-01	saida	Beeper WhatsApp	49.90	Software	C6 Bank	recurring_auto	2025-10-24 01:01:45.469698+00	2025-10-24 01:01:45.469698+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	5bc3f497-8eaf-4863-93a2-1646b1c9bb62	pending	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
ea0c57e5-87e4-4f73-a798-000388875174	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-02	saida	Airbnb Pedra do Bau (2/4)	435.26	Hospedagem	C6 Bank	installment	2025-10-24 01:05:13.308824+00	2025-10-24 01:05:13.308824+00	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	f	\N	\N	C6 Bank	t	2	4	e88cd921-714b-4721-8078-890007b68c42	f	\N	\N	\N
689f9a44-0987-434d-8397-f2c380c37f73	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-01-02	saida	Airbnb Pedra do Bau (3/4)	435.26	Hospedagem	C6 Bank	installment	2025-10-24 01:05:13.308824+00	2025-10-24 01:05:13.308824+00	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	f	\N	\N	C6 Bank	t	3	4	e88cd921-714b-4721-8078-890007b68c42	f	\N	\N	\N
181f818d-d73c-4966-8bd9-cd0f82b84542	a3b12ed2-9440-40d9-9293-3c20e778dd74	2026-02-02	saida	Airbnb Pedra do Bau (4/4)	435.26	Hospedagem	C6 Bank	installment	2025-10-24 01:05:13.308824+00	2025-10-24 01:05:13.308824+00	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	f	\N	\N	C6 Bank	t	4	4	e88cd921-714b-4721-8078-890007b68c42	f	\N	\N	\N
306f3191-7194-4fed-b70d-7fc23df85cd0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-12-23	saida	Inscrição Indomit Pedra do Bau (3/3)	281.91	Ingressos	C6 Bank	installment	2025-10-24 01:06:26.220049+00	2025-10-24 01:06:26.220049+00	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	f	\N	\N	C6 Bank	t	3	3	b2ad096a-8e10-4ac1-ae0f-861c456b3485	f	\N	\N	\N
1fbc660a-a455-4d51-92de-91d9dc07eb01	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	TIM - Wesley e Marcela	127.98	Serviços pessoais	C6 Bank	recurring_auto	2025-10-24 01:04:20.33414+00	2025-10-24 01:04:20.33414+00	d4a8bdf9-d796-44dc-9498-553076c57748	t	c0a00223-4c9f-45f2-a14f-401dbf3d4702	approved	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
53400fe5-b6d4-4a04-8da7-f4fdce7c759a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-01	saida	Adapta Org	99.00	AI	C6 Bank	recurring_auto	2025-10-24 01:08:09.192838+00	2025-10-24 01:08:09.192838+00	b1acfd71-5320-4cc8-9aae-45664bcdb96e	t	a618be46-d313-417c-8f1c-753be895d511	approved	C6 Bank	f	\N	\N	\N	f	\N	\N	\N
3f158670-6fe0-4daa-9372-b8e8deefda1a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23	saida	Inscrição Indomit Pedra do Bau (1/3)	281.91	Ingressos	C6 Bank	installment	2025-10-24 01:06:26.220049+00	2025-10-24 01:06:26.220049+00	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	f	\N	\N	C6 Bank	t	1	1	b2ad096a-8e10-4ac1-ae0f-861c456b3485	f	\N	\N	\N
776af8df-dda2-4663-8df9-e4382d229a9a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	inscrição araçatuba half marathon	279.40	Competições	C6 Bank	manual	2025-11-07 00:06:37.323407+00	2025-11-07 00:06:37.323407+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
ec4940b9-4d93-48ae-a04e-818ef61edb08	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Bolo aniversário pai	113.00	Presentes	C6 Bank	manual	2025-11-07 00:14:12.71214+00	2025-11-07 00:14:12.71214+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
3e77c940-d2e8-49b6-9935-5aeb363e7b7d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Livros novos	199.80	Livros	C6 Bank	manual	2025-11-07 00:14:42.136924+00	2025-11-07 00:14:42.136924+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
55ab28ef-772a-48a8-aab8-d228b063359a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Papel + Fita (Caixinhas Go On)	37.49	Logística	C6 Bank	manual	2025-11-07 00:15:08.026007+00	2025-11-07 00:15:08.026007+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
318a13bc-d2ae-4202-b679-74a51d9a4c35	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Frete bonés alunos	37.66	Logística	C6 Bank	manual	2025-11-07 00:15:35.914333+00	2025-11-07 00:15:35.914333+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
898ec006-f854-4ca5-83e6-ab0069f44942	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Roupas CSS Buy	306.76	Roupas	C6 Bank	manual	2025-11-07 00:15:57.924589+00	2025-11-07 00:15:57.924589+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
73483d50-fcbb-4357-bef9-e63896ce9a03	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06	saida	Macarrão	61.80	Delivery	C6 Bank	manual	2025-11-07 00:16:20.463213+00	2025-11-07 00:16:20.463213+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
da26dbd3-612b-40a3-a1f4-6168b783fe10	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	frete roupas cssbuy	191.00	Roupas	C6 Bank	manual	2025-11-11 22:36:09.081543+00	2025-11-11 22:36:09.081543+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
393a816c-f083-4400-ba4c-b9780e960365	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	renovação mfit	215.90	Despesas Operacionais	C6 Bank	manual	2025-11-11 22:36:35.056516+00	2025-11-11 22:36:35.056516+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
080a0989-bbb0-419d-bc81-bf79e7c72bcf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	pizza mãe maykols campo largo	141.50	Restaurante	C6 Bank	manual	2025-11-11 22:37:03.190559+00	2025-11-11 22:37:03.190559+00	7869eb2b-eb82-438e-b28b-1db1540bd948	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
36d61b37-87ad-42ce-9fb0-72aae7249bd8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	corte de cabelo	82.00	Estética	C6 Bank	manual	2025-11-11 22:37:20.758228+00	2025-11-11 22:37:20.758228+00	d4a8bdf9-d796-44dc-9498-553076c57748	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
5bdf9e90-c17b-4ed6-a14c-d16eacc5610e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	suplementos capsula	149.50	Suplementos	C6 Bank	manual	2025-11-11 22:38:01.291076+00	2025-11-11 22:38:01.291076+00	aa3b9d18-94aa-436f-b437-73af0d14aff9	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
26032032-6ea1-46c7-9858-ff32b01f5f7e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-11	saida	Dominio goonacademy	89.98	Marketing	C6 Bank	manual	2025-11-11 22:38:52.178478+00	2025-11-11 22:38:52.178478+00	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	f	\N	\N	\N	f	\N	\N	\N	f	\N	\N	\N
\.


--
-- Data for Name: financial_summary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_summary (id, user_id, month, category, total_value, created_at, updated_at) FROM stdin;
41bd2252-330a-4a02-873e-bf902032d1c4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Apartamento	2331.59	2025-05-31 14:16:03.727061+00	2025-05-31 14:16:03.727061+00
b8d9e989-4ad5-4247-9c4c-a177809a4af3	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Escritório	6271.66	2025-05-31 14:16:03.845512+00	2025-05-31 14:16:03.845512+00
de016b89-2ae3-4df6-b469-1d5532361bbd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Contas mensais	2008.1	2025-05-31 14:16:03.948218+00	2025-05-31 14:16:03.948218+00
770b2673-d2e3-4634-aa39-376fb1d11455	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Estudos	30	2025-05-31 14:16:04.063206+00	2025-05-31 14:16:04.063206+00
7da4be97-809f-480c-98b7-19e91dc4b040	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Lazer e ócio	338.56	2025-05-31 14:16:04.184357+00	2025-05-31 14:16:04.184357+00
0e0c6dfa-bace-491e-a020-8f549f380513	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Comida	757.54	2025-05-31 14:16:04.298358+00	2025-05-31 14:16:04.298358+00
64501d63-81af-4716-90da-aa70096d85c0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Tráfego Pago	15	2025-05-31 14:16:04.412916+00	2025-05-31 14:16:04.412916+00
de04375e-ad16-49c9-85d8-d92a23547819	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Vida esportiva	376.3	2025-05-31 14:16:04.504007+00	2025-05-31 14:16:04.504007+00
3058a510-55d4-48b0-a0a8-79560ade5b6e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Carro	2294.96	2025-05-31 14:16:04.709293+00	2025-05-31 14:16:04.709293+00
8436ce01-6ba3-427f-9188-b0c2a5ca3369	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Apartamento	2793.12	2025-05-31 14:16:04.810679+00	2025-05-31 14:16:04.810679+00
5082998c-4ce3-4e59-9b0c-6ec61997f322	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Escritório	10294.68	2025-05-31 14:16:04.922718+00	2025-05-31 14:16:04.922718+00
3a5ccf43-f883-4d7e-a12a-607bc54c2a16	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Contas mensais	1632.4	2025-05-31 14:16:05.053872+00	2025-05-31 14:16:05.053872+00
a65dab21-149d-4ce9-87a8-9644aa3e7c89	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Estudos	977	2025-05-31 14:16:05.177941+00	2025-05-31 14:16:05.177941+00
e36a1840-ac1c-492f-a5bb-7b7469c19b6c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Lazer e ócio	400.88	2025-05-31 14:16:05.284404+00	2025-05-31 14:16:05.284404+00
0c9eb428-aac0-4440-b10a-b6b19fc09f82	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Comida	861	2025-05-31 14:16:05.391597+00	2025-05-31 14:16:05.391597+00
d257b6cd-5823-4e9f-8baf-064c339cfacf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Vida esportiva	1633.26	2025-05-31 14:16:05.500221+00	2025-05-31 14:16:05.500221+00
8750b4e7-47d0-4174-8755-148870c2f7be	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Carro	1519.16	2025-05-31 14:16:05.718217+00	2025-05-31 14:16:05.718217+00
b5a30315-7b8d-4c26-8f21-7734c0f50ed8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Apartamento	2644.39	2025-05-31 14:16:05.831873+00	2025-05-31 14:16:05.831873+00
fe7f5b04-4f7f-4817-844c-dd1651b5dcc9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Escritório	4963	2025-05-31 14:16:05.932251+00	2025-05-31 14:16:05.932251+00
2a6b5c78-44b3-4991-a941-e517a2fdc43b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Contas mensais	1633.49	2025-05-31 14:16:06.048233+00	2025-05-31 14:16:06.048233+00
da4549ec-26e9-417a-ba81-add8a86af0e2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Estudos	364	2025-05-31 14:16:06.151526+00	2025-05-31 14:16:06.151526+00
7c46194e-c2f8-47eb-8cbe-209ffce18693	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Lazer e ócio	1904.09	2025-05-31 14:16:06.253709+00	2025-05-31 14:16:06.253709+00
bf682d48-838d-427f-addb-ff47e69a9a3d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Comida	602.94	2025-05-31 14:16:06.347758+00	2025-05-31 14:16:06.347758+00
82a604c3-2cfe-485e-97b2-b6bf77e1443c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Vida esportiva	1356.45	2025-05-31 14:16:06.449523+00	2025-05-31 14:16:06.449523+00
b0255387-f04a-45e2-b8f1-e79c80bab1a2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Carro	1142.16	2025-05-31 14:16:06.554067+00	2025-05-31 14:16:06.554067+00
f713c710-643d-424b-a09f-0e6751febedd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Apartamento	2998.35	2025-05-31 14:16:06.664467+00	2025-05-31 14:16:06.664467+00
2a6407cf-3f62-4cdd-9fb8-bb4974ec1121	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Escritório	5673.68	2025-05-31 14:16:06.768663+00	2025-05-31 14:16:06.768663+00
6fe0bc9f-b8cc-4631-9ac0-cc97edd7cc66	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Contas mensais	1307.43	2025-05-31 14:16:06.875275+00	2025-05-31 14:16:06.875275+00
8b7f35d2-6c76-4dc7-bd47-c9e7e0474cc7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Lazer e ócio	420	2025-05-31 14:16:06.974718+00	2025-05-31 14:16:06.974718+00
6752e73e-76dd-49e1-8e08-9b8aab917931	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Comida	541.2	2025-05-31 14:16:07.068799+00	2025-05-31 14:16:07.068799+00
99e6f971-71b6-4036-8f6f-617b627194f7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Vida esportiva	2801	2025-05-31 14:16:07.177981+00	2025-05-31 14:16:07.177981+00
b3d9bdc3-4a3a-44ce-ac91-d43e77481fd6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Carro	774	2025-05-31 14:16:07.287241+00	2025-05-31 14:16:07.287241+00
b3ce0dbf-6d9a-4281-8cdd-adecb28db53d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Apartamento	2923.05	2025-05-31 14:16:07.403875+00	2025-05-31 14:16:07.403875+00
4312cbcf-9b06-4fcf-8340-94d8c2d9453a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Escritório	4678.6	2025-05-31 14:16:07.504812+00	2025-05-31 14:16:07.504812+00
4bc1460a-aa36-4e89-a656-a89fbe1a81f1	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Contas mensais	1798.28	2025-05-31 14:16:07.607481+00	2025-05-31 14:16:07.607481+00
7d512025-3a6e-4ec7-a3fb-52da8cc39b76	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Estudos	189	2025-05-31 14:16:07.742678+00	2025-05-31 14:16:07.742678+00
9fe5c9ac-8c53-4b40-80ac-ac15ad14fbdb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Lazer e ócio	219	2025-05-31 14:16:07.850029+00	2025-05-31 14:16:07.850029+00
114e2943-827a-4f95-bc9e-27f2ec2d65f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Comida	497.9	2025-05-31 14:16:07.983162+00	2025-05-31 14:16:07.983162+00
b1102a28-1440-4fc0-ae9b-2f39c2ba9678	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Vida esportiva	639	2025-05-31 14:16:08.084924+00	2025-05-31 14:16:08.084924+00
dc89a398-3202-4fe7-a220-0a400ccb20ea	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Carro	280	2025-05-31 14:16:08.208678+00	2025-05-31 14:16:08.208678+00
a2b37092-d2eb-4bde-9e4e-07b344a4b6ed	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Apartamento	6049.31	2025-05-31 14:16:08.311025+00	2025-05-31 14:16:08.311025+00
e0c0c87b-3b5e-4392-bc4d-9835bcefe1b6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Escritório	2251.65	2025-05-31 14:16:08.428839+00	2025-05-31 14:16:08.428839+00
cb4122b7-d98f-4f01-8596-e6d34275f31d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Contas mensais	4621.97	2025-05-31 14:16:08.539227+00	2025-05-31 14:16:08.539227+00
de8fa85d-22f4-491b-8ecb-0dad204bcbfe	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Estudos	741	2025-05-31 14:16:08.645818+00	2025-05-31 14:16:08.645818+00
1dd8f23c-4bb8-4298-856c-479e76fafe67	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Lazer e ócio	2620	2025-05-31 14:16:08.746381+00	2025-05-31 14:16:08.746381+00
9f3be574-e2cd-4934-a109-8cdf545c7cb6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Comida	1003.93	2025-05-31 14:16:08.857078+00	2025-05-31 14:16:08.857078+00
1296d0b4-215b-455f-a52a-9b7360aa3a3b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Tráfego Pago	90	2025-05-31 14:16:08.950046+00	2025-05-31 14:16:08.950046+00
0462d87b-cf01-489e-8f51-c6917fd09b56	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Vida esportiva	2498.46	2025-05-31 14:16:09.045559+00	2025-05-31 14:16:09.045559+00
3e314f26-f4a8-4eab-8869-d70f3746156a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Carro	455.9	2025-05-31 14:16:09.244747+00	2025-05-31 14:16:09.244747+00
f6f37e57-7623-4f46-aa2f-4173da2ca281	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Apartamento	8879.65	2025-05-31 14:16:09.348577+00	2025-05-31 14:16:09.348577+00
f36a064c-a360-4141-bf2f-420995ca7ec2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Escritório	3028.93	2025-05-31 14:16:09.4624+00	2025-05-31 14:16:09.4624+00
d246bf03-9e96-4dc9-afc4-59c303e50a10	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Contas mensais	2861.6	2025-05-31 14:16:09.569965+00	2025-05-31 14:16:09.569965+00
bd95602f-6d20-4a49-bd05-0d1e25818ebc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Estudos	105	2025-05-31 14:16:09.664878+00	2025-05-31 14:16:09.664878+00
854ef5bc-b969-4ef2-9831-297f12993c93	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Lazer e ócio	2046.92	2025-05-31 14:16:09.770647+00	2025-05-31 14:16:09.770647+00
9738a9a7-42f3-4c2c-8843-972e24918d2d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Comida	747	2025-05-31 14:16:09.879043+00	2025-05-31 14:16:09.879043+00
534e4f35-3859-44b2-b7c3-5e15b207b583	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Tráfego Pago	1464.98	2025-05-31 14:16:09.981219+00	2025-05-31 14:16:09.981219+00
214712c8-08bb-4e73-8576-c3f2761a4112	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Carro	315	2025-05-31 14:16:10.202495+00	2025-05-31 14:16:10.202495+00
5c062827-f700-495f-a1bd-98e73bc0320d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Apartamento	6049.31	2025-05-31 14:16:10.3108+00	2025-05-31 14:16:10.3108+00
bf63e8c0-66e7-4c36-acd0-979ec5b34438	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Escritório	2251.65	2025-05-31 14:16:10.414281+00	2025-05-31 14:16:10.414281+00
3d66021c-b10c-4ef4-bbd8-843297a4e90d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Contas mensais	4621.97	2025-05-31 14:16:10.523824+00	2025-05-31 14:16:10.523824+00
5b2b441d-5e2c-484b-ad80-e0fb88469e82	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Estudos	741	2025-05-31 14:16:10.636947+00	2025-05-31 14:16:10.636947+00
2979a278-0803-45f8-a283-2299a589ba0e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Lazer e ócio	2620	2025-05-31 14:16:10.861679+00	2025-05-31 14:16:10.861679+00
6c826287-9d83-4f22-bd68-7a301b4c6a2a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Comida	1003.93	2025-05-31 14:16:10.955447+00	2025-05-31 14:16:10.955447+00
3c2d89be-7eb5-4f7d-9155-02e8037028ba	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Tráfego Pago	90	2025-05-31 14:16:11.057589+00	2025-05-31 14:16:11.057589+00
2038101a-fb22-45a5-a150-bed4dcd646e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Vida esportiva	2498.46	2025-05-31 14:16:11.165261+00	2025-05-31 14:16:11.165261+00
b9861fde-60b6-4a45-b5b0-97134efbbbe6	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Carro	455.9	2025-05-31 14:16:11.371387+00	2025-05-31 14:16:11.371387+00
175d7f04-c34d-4c67-b304-58ac74967056	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Apartamento	3530.42	2025-05-31 14:16:11.473338+00	2025-05-31 14:16:11.473338+00
4e392d1c-99e5-4e1c-89e3-0c55e55c6c93	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Escritório	9983.78	2025-05-31 14:16:11.585824+00	2025-05-31 14:16:11.585824+00
362cff4a-b258-4479-9075-91e8b3d22daf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Contas mensais	4284.2	2025-05-31 14:16:11.689838+00	2025-05-31 14:16:11.689838+00
bcb9d62d-3dc3-4e6d-ac83-9f7f91abc728	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Estudos	126	2025-05-31 14:16:11.79162+00	2025-05-31 14:16:11.79162+00
ce4b8b23-454b-4261-92af-8b278526fb0f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Lazer e ócio	2616	2025-05-31 14:16:11.901925+00	2025-05-31 14:16:11.901925+00
014e1c42-d8c5-4a11-8478-dc03706f6c20	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Comida	822.25	2025-05-31 14:16:12.013175+00	2025-05-31 14:16:12.013175+00
1f974941-6b5f-4f06-ad8f-304243eb24f5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Vida esportiva	1624.86	2025-05-31 14:16:12.121477+00	2025-05-31 14:16:12.121477+00
ff30aa4a-00b9-447c-84ca-ecb739ed7879	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Carro	2848.07	2025-05-31 14:16:12.226953+00	2025-05-31 14:16:12.226953+00
10c2c298-cd1d-4e8f-a4ce-9860e9330275	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Apartamento	3458.52	2025-05-31 14:16:12.342051+00	2025-05-31 14:16:12.342051+00
709248c6-9852-4a3e-afa3-d36684a50abd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Escritório	1648.03	2025-05-31 14:16:12.449289+00	2025-05-31 14:16:12.449289+00
26a7010b-2f14-4cb4-8624-9ab557c59783	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Vida esportiva	773.21	2025-05-31 14:16:13.010634+00	2025-05-31 14:16:13.010634+00
17304dec-31b7-4e87-a192-ae58996574cb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Contas mensais	3366.92	2025-05-31 14:16:13.562889+00	2025-05-31 14:16:13.562889+00
dedd783a-9d3f-4114-894c-1223e8adaa91	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Go On Outdoor	861.48	2025-05-31 14:16:14.082605+00	2025-05-31 14:16:14.082605+00
8e868819-81d1-4c8b-af95-9183337f0e9b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Lazer e ócio	424.18	2025-05-31 14:16:14.601023+00	2025-05-31 14:16:14.601023+00
ca406a7a-22c1-475b-af50-c2f370aab323	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Contas mensais	4397.49	2025-05-31 14:16:12.556831+00	2025-05-31 14:16:12.556831+00
b3df4f74-6f44-4273-b753-231503b12e09	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Go On Outdoor	118	2025-05-31 14:16:13.133004+00	2025-05-31 14:16:13.133004+00
528f6d9a-794a-4c84-9436-62eec69a7acd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Estudos	97	2025-05-31 14:16:13.666648+00	2025-05-31 14:16:13.666648+00
262d5b32-d031-40a7-bfd1-728e83e7047c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Carro	3293.84	2025-05-31 14:16:14.185293+00	2025-05-31 14:16:14.185293+00
937c08c7-9979-420e-8831-bb53ca859a7c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Comida	464.83	2025-05-31 14:16:14.707786+00	2025-05-31 14:16:14.707786+00
ca2131f9-d80f-4698-9f5f-43d56bbfe46c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Estudos	410.99	2025-05-31 14:16:12.659053+00	2025-05-31 14:16:12.659053+00
645eff41-5877-481d-b779-ede06ebc6ccd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Carro	1260.38	2025-05-31 14:16:13.238889+00	2025-05-31 14:16:13.238889+00
b856d906-b54d-4bf9-9cb8-81e0cac85178	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Lazer e ócio	3172.82	2025-05-31 14:16:13.763167+00	2025-05-31 14:16:13.763167+00
c2e85678-6e22-49e4-9d9c-1a5180d80723	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Apartamento	393.09	2025-05-31 14:16:14.2795+00	2025-05-31 14:16:14.2795+00
255d9e39-755d-4515-a130-280a74f97abf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Vida esportiva	5842.13	2025-05-31 14:16:14.81467+00	2025-05-31 14:16:14.81467+00
20d541fd-4dfc-4447-965d-850a11c21b63	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Lazer e ócio	804.86	2025-05-31 14:16:12.790333+00	2025-05-31 14:16:12.790333+00
770f601f-8991-460d-ad5f-b335a5a098c2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Apartamento	3235.52	2025-05-31 14:16:13.341849+00	2025-05-31 14:16:13.341849+00
a53b39f2-12d3-47b2-bc4a-b7324f8fc592	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Comida	564.63	2025-05-31 14:16:13.870079+00	2025-05-31 14:16:13.870079+00
fce0e6ef-4434-4ef6-8db4-d6da5892e3c4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Escritório	1291.79	2025-05-31 14:16:14.381504+00	2025-05-31 14:16:14.381504+00
88562522-c610-445d-9e75-5e13dbf51d2f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Go On Outdoor	451.95	2025-05-31 14:16:14.914707+00	2025-05-31 14:16:14.914707+00
f6a2f3cd-6896-47b3-a3b6-7d3c54ae5dba	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Comida	862.7	2025-05-31 14:16:12.905545+00	2025-05-31 14:16:12.905545+00
0f1ae604-e7a7-4ecc-b89c-136219c5ac46	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Escritório	1995.54	2025-05-31 14:16:13.458333+00	2025-05-31 14:16:13.458333+00
52a33267-0c1a-4f06-9a2f-53f8394acdec	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Vida esportiva	3709.83	2025-05-31 14:16:13.974835+00	2025-05-31 14:16:13.974835+00
bfcec7b9-b385-4bb1-bad9-bb394d008648	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Contas mensais	3768.86	2025-05-31 14:16:14.486902+00	2025-05-31 14:16:14.486902+00
cb119fec-0eab-4894-a86c-d2a2d5e44011	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Carro	488.62	2025-05-31 14:16:15.014263+00	2025-05-31 14:16:15.014263+00
67e2a187-f9f5-4cdd-9a6b-315b6e5ee8f5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Produto Online	296.86	2025-05-31 14:43:09.239082+00	2025-05-31 14:43:09.239082+00
d41ef3f7-8f1c-4441-b76c-dede6ab27f56	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Global Vita	590	2025-05-31 14:43:09.412134+00	2025-05-31 14:43:09.412134+00
0a9ee19b-6f45-4025-a586-5156ef3142b3	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Comida	2160.7	2025-06-02 19:55:41.803664+00	2025-06-02 19:55:41.803664+00
0ef5b134-a938-424f-809d-bfee0eeeae17	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Apartamento	58	2025-06-02 19:55:41.977989+00	2025-06-02 19:55:41.977989+00
e3b15f21-4635-4383-a0b5-a55b0cecd585	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Dimitri	1244.12	2025-06-02 19:55:42.139108+00	2025-06-02 19:55:42.139108+00
7d34a0ed-45e5-4f5a-998f-1fd274eefa3b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Vida Esportiva	346.84	2025-06-02 19:55:42.289686+00	2025-06-02 19:55:42.289686+00
ad83b241-a74d-4acb-b04f-3020b81b6888	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Lazer e ócio	259.11	2025-06-02 19:55:42.4521+00	2025-06-02 19:55:42.4521+00
19f46605-a75a-4f0e-910e-161bb3003aa4	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Estudos	111	2025-06-02 19:55:42.611924+00	2025-06-02 19:55:42.611924+00
70aa16cc-f636-4db2-8ac3-7fc82f8f8f00	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Cuidados pessoais	1388.64	2025-06-02 19:55:42.7548+00	2025-06-02 19:55:42.7548+00
09db0171-712c-472e-988c-c9033892b79b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Comida	2069.91	2025-06-02 19:55:42.926932+00	2025-06-02 19:55:42.926932+00
c0e1190a-e599-46dc-8c73-f91935a7fc98	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Dimitri	767.69	2025-06-02 19:55:43.076074+00	2025-06-02 19:55:43.076074+00
6f171ced-2b39-4b78-ac41-4df782f0bfa1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Vida Esportiva	127.88	2025-06-02 19:55:43.219346+00	2025-06-02 19:55:43.219346+00
986cd1f8-8ce1-4543-97d7-256f8ea17110	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Lazer e ócio	369.2	2025-06-02 19:55:43.360968+00	2025-06-02 19:55:43.360968+00
a61e1be7-e6d8-43d4-a0bb-54569594031f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Estudos	52.9	2025-06-02 19:55:43.503059+00	2025-06-02 19:55:43.503059+00
6e1ea4d7-3b16-40fa-a57a-82989c245ea7	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Cuidados pessoais	1068.95	2025-06-02 19:55:43.635776+00	2025-06-02 19:55:43.635776+00
b0db4cb7-9af5-4f50-b8a5-41648031ec64	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Comida	3226.45	2025-06-02 19:55:43.789164+00	2025-06-02 19:55:43.789164+00
85b8adf7-8544-494b-917c-7708587f8331	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Dimitri	883.3	2025-06-02 19:55:43.997167+00	2025-06-02 19:55:43.997167+00
05ac1fd3-7e99-4afd-9fec-3bcd1447f065	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Vida Esportiva	437.79	2025-06-02 19:55:44.12805+00	2025-06-02 19:55:44.12805+00
5b51f8d0-88cd-43f4-bbbf-6d07de9f0d91	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Comida	2350.73	2025-06-02 19:55:44.579542+00	2025-06-02 19:55:44.579542+00
7c736543-a672-4522-8925-a80d7aec5ef9	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Lazer e ócio	89.86	2025-06-02 19:55:44.279913+00	2025-06-02 19:55:44.279913+00
0f756e69-0dd2-4771-8fda-951a067c86a5	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Dimitri	315.23	2025-06-02 19:55:44.843113+00	2025-06-02 19:55:44.843113+00
791e5ab9-383e-49dd-bc65-137f0cc94365	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Cuidados pessoais	3507.13	2025-06-02 19:55:45.412191+00	2025-06-02 19:55:45.412191+00
c00629b3-245f-4aeb-b068-536b8bf9327f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Dimitri	703.03	2025-06-02 19:55:45.928282+00	2025-06-02 19:55:45.928282+00
7358404d-fb87-43fe-9417-605b2d8ce1e6	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Cuidados pessoais	3519.21	2025-06-02 19:55:44.427383+00	2025-06-02 19:55:44.427383+00
de89cca8-6f41-49aa-96f8-71a9ea78b111	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Vida Esportiva	519.38	2025-06-02 19:55:44.97236+00	2025-06-02 19:55:44.97236+00
90cb525c-b848-4ebc-bc66-56c394627d7e	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Viagens	1151.46	2025-06-02 19:55:45.529264+00	2025-06-02 19:55:45.529264+00
7efce2b5-e7a5-4165-b93d-4809a78b7f0f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Vida Esportiva	248.82	2025-06-02 19:55:46.079041+00	2025-06-02 19:55:46.079041+00
e155d362-0315-471f-bebe-a76431a6d1d3	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Apartamento	24	2025-06-02 19:55:44.709247+00	2025-06-02 19:55:44.709247+00
ae85cf27-6eca-4850-b52f-f45445096e80	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Estudos	149.8	2025-06-02 19:55:45.260632+00	2025-06-02 19:55:45.260632+00
a9733a55-2160-4ff4-8571-9d699d9f80ee	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Apartamento	4350	2025-06-02 19:55:45.802713+00	2025-06-02 19:55:45.802713+00
d16451df-e042-43aa-b30a-0d9f202351d1	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Cuidados pessoais	823.19	2025-06-02 19:55:46.355258+00	2025-06-02 19:55:46.355258+00
9c5ee614-62ec-4fb0-b9ef-bfed8860261d	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Lazer e ócio	1639.35	2025-06-02 19:55:45.102147+00	2025-06-02 19:55:45.102147+00
557d9baa-ec27-46cd-a831-df953640ea3a	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Comida	2965.5	2025-06-02 19:55:45.669717+00	2025-06-02 19:55:45.669717+00
d640d029-efdb-4873-b3d7-b00828ed93de	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Lazer e ócio	366.55	2025-06-02 19:55:46.210004+00	2025-06-02 19:55:46.210004+00
\.


--
-- Data for Name: financial_summary_income; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_summary_income (id, user_id, month, source, total_value, created_at, updated_at) FROM stdin;
22e16629-0427-4110-bab1-2d67879f60cb	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Go On Outdoor	4000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c5530ae9-3fea-4561-bf52-d755f1695159	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Global Vita	5926.8	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
dfd5faa5-a72b-427e-81ac-7cef287768c7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
0d201def-ab93-48a6-b24f-f9b029beedc4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
9765f474-c878-4406-8335-aedb6cafd522	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
190d9c03-a7b4-43e1-b3d6-9fdd54262d86	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Cabana Cedro	500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
92968d4c-f19e-405a-a37e-668a7f2f3864	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Hotmart Go On	1508	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
5ced52d4-4704-4527-825c-bc38f104e25b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-06-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c6d52b12-ffad-4b19-b8db-f57c44906e68	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Go On Outdoor	5000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
170b58cd-c21b-4dea-9248-c0b51782f9a0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
081ccaa4-76c4-43e8-9701-097b511902d4	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
a7215d6e-6e09-4c86-b151-d6d2ab4af8fe	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
d96fc05e-3db6-4026-ac1b-94d31182b9e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
2256029f-dab6-4136-b5eb-8dd1a64053ce	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Cabana Cedro	500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
fb4f4822-41ba-4ec9-9a45-490e3ea32d55	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Hotmart Go On	533	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
b3e9d409-5ef3-41e0-9851-83f941f71d1f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-07-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c5ab6b19-a7c4-45c7-aaae-495e87683977	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Go On Outdoor	5000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
dd2a63c8-d781-4cfc-b63b-db729f9eecfc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Global Vita	4700	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c606ddf1-e837-4177-ada2-b5db9da1e77f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
beda35fd-e6d6-4628-9efe-7c88aaf0baf2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
05f955f4-d226-44df-8324-4ddb5f31fa43	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
1ffb0cc2-72ff-456a-add7-913a8ac60e49	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-08-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
f7eb66b9-498f-4aa3-8202-19da7e7d276c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Go On Outdoor	5000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
8a77d0c7-7c6e-4da5-8c4e-cf71e1eae5bf	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
48f80075-d350-414a-b153-8caa3370a6e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
7d0fbedb-901b-4eba-a3ab-1f45e6d5135e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
52be9baf-ebd8-4c87-9210-324f85ba4f3a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
272c1c83-1162-4885-97ca-f3bb1cd16f86	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-09-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
5f3b2852-cb32-40dd-bcc6-3c7b08fe60b7	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Go On Outdoor	5000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
875d62b0-3a7f-4c90-aaa6-75756049387b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
1c9253b1-4b5d-4a98-9440-393547126752	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
1406763d-eae7-40bf-a93b-88461e475b48	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
dd3eb09d-885d-4bea-bee5-1fbf0265ee56	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
fd504bfa-6272-4543-9583-b24da8dd168b	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-10-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
487f5c20-7153-4c35-aad4-c63e04a9c0a5	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Go On Outdoor	6000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
d30b8e39-45a3-4103-a8e4-0f7171c5c15d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Global Vita	8000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
347c02dd-bc2f-4c49-b071-f4de63793c1f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
b44802bc-561d-4c4d-86dc-0c3a191c9598	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c9c3cbfc-ec90-4446-bf6a-ed494c3034d9	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Brasilio Wille	600	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
58f58eb5-6aba-4dd7-90c3-071cdbfd29b2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Stripe/assinaturas	189.67	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
2e6287d8-35e1-4bd6-8e7f-37b4d02412ed	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-11-01	Outras receitas	350	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
e3282318-6278-48db-97cd-dcdf13c81166	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Go On Outdoor	7000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
8ee46c02-ff6c-4d0a-b266-f58b06067aa0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Global Vita	12500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
b8d49723-bbfc-49d4-841e-88b3c1d4965f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Rumo Fitness	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
ceafa4d2-3dde-4824-8d74-4d5579e957b2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2024-12-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
841e9f58-46b9-4cbf-a1dd-a9a0c718bf5c	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Go On Outdoor	7000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
22cd048b-09a4-48e1-9359-7195fd6060c8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Global Vita	17000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
56c21ac2-d153-45b7-857f-592d02027a78	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Rumo Fitness	1500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
f7b0acf7-1ede-4720-87f5-6cd277075518	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Future Fitness	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
13e4494b-7ff9-470d-a561-9ea77f3a6ab2	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Halterego	1500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
602aa9f3-0e9f-40f9-a9ec-5eee519f7d40	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-01-01	Outras receitas	15	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
ad3fb6af-6272-4168-b0f0-856507c2b297	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Go On Outdoor	9000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
da397c47-fa83-4c2e-a9b8-303c73310788	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
a267ccef-c79e-4ead-ba15-62d435a822a0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Halterego	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
e765ae18-391d-4c85-8229-2f179219ef1e	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-02-01	Outras receitas	3437.41	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
8b85e772-b504-4a85-a1de-b2c88f15fc5a	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Go On Outdoor	10000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
b144d96c-aa22-42bc-9560-ed67a44a0c05	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
db160383-afa9-492d-9a77-9a24b8cfbaa0	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Halterego	3000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
653affe3-2fee-44a4-982e-cd4bd08ef152	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-03-01	Outras receitas	1500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
979c334c-3050-439d-a1d2-0c20073e49ff	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Go On Outdoor	10000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
6baad3c0-7409-42ee-913f-1e7432558fbd	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Global Vita	4500	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
c37665bf-825d-46a5-a775-83d8a6704fdc	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Halterego	2000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
afb0a0d4-8811-4f54-bc54-a95e6ca64702	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Outras receitas	4100	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
0ab051f4-c3e2-4e7b-ad9c-ecde8d90f2c8	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-04-01	Produto Online	296.86	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
346daa77-f8fe-414f-bd32-3513c1e814be	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Go On Outdoor	10000	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
2b1f24dd-e366-4146-9fe5-48eb4305e24d	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-05-01	Global Vita	590	2025-05-31 14:51:38.076007+00	2025-05-31 14:51:38.076007+00
116124e8-ad9e-475b-b5af-8bc6aeab5d54	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Global Vita	3500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
51c661e6-5f47-4719-9788-db0246971a38	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Go On Outdoor	1500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
06e64b7c-2c92-4a03-8706-571910dcb29b	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Wesley	2000	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
34af4e34-7eac-4a3f-9476-992c663b2700	26bac8f5-5b37-4151-a95c-247251b8556d	2025-01-01	Outras receitas	250	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
5f28bcf0-4f87-4e4b-98da-9754ed8e5314	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Global Vita	3500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
38587b3a-1b5e-401b-9121-bc07f22d8682	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Go On Outdoor	1500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
94d7727d-5db0-4f8f-956f-403ef3cfd475	26bac8f5-5b37-4151-a95c-247251b8556d	2025-02-01	Wesley	2200	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
546b7ed5-d271-4bf9-940a-2957ab228831	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Global Vita	4938	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
26624741-6aef-47df-82cf-b40359da6519	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Go On Outdoor	1500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
d2a4fba5-1015-49c2-be6a-163eb956c7ef	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Wesley	339	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
bea6319b-2fc7-462f-b2ba-4e8c0881a540	26bac8f5-5b37-4151-a95c-247251b8556d	2025-03-01	Outras receitas	438	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
3d55fb41-8e32-405c-b1e8-f5825ddb596f	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Global Vita	3625	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
c5911175-c840-4d19-afc5-547930e6b436	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Go On Outdoor	2500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
fdc984b1-1654-406d-81ed-465bfe14b160	26bac8f5-5b37-4151-a95c-247251b8556d	2025-04-01	Wesley	2000	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
57f12bc5-aa7b-4de0-9c0a-c3bd86786a96	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Global Vita	4150	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
d804fee9-0b0e-4ffb-b999-64f503e6b8ec	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Go On Outdoor	2500	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
afa2650a-7be4-4af9-8c92-06ee0e290e19	26bac8f5-5b37-4151-a95c-247251b8556d	2025-05-01	Wesley	2000	2025-06-02 19:58:57.878317+00	2025-06-02 19:58:57.878317+00
\.


--
-- Data for Name: investment_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investment_categories (id, name, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: investment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investment_transactions (id, investment_id, user_id, type, amount, bank, description, date, created_at) FROM stdin;
8e0bbc95-ca41-483a-a2e2-a6a180c459aa	f8e32660-820b-401e-9cff-14c18ef3ea31	a3b12ed2-9440-40d9-9293-3c20e778dd74	aporte	1000	C6 BANK		2025-08-06	2025-08-06 23:47:49.666311+00
f0a5bfc5-3f9f-4eb5-9d8a-e81393ea807c	f8e32660-820b-401e-9cff-14c18ef3ea31	a3b12ed2-9440-40d9-9293-3c20e778dd74	aporte	500	C6 BANK	CDB c6 pós fixado 6 meses	2025-09-04	2025-09-04 13:32:21.423278+00
\.


--
-- Data for Name: investments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investments (id, user_id, name, category, initial_amount, current_balance, created_at, updated_at) FROM stdin;
604e7b32-15ed-4491-ba45-e454417d41d9	a3b12ed2-9440-40d9-9293-3c20e778dd74	Reserva Carro	Reserva Carro	1840.39	1840.39	2025-05-30 00:17:57.091148+00	2025-05-30 00:17:57.091148+00
ea249724-78ff-41c2-943f-665667b23d4a	a3b12ed2-9440-40d9-9293-3c20e778dd74	Reserva Casa Nova	Reserva Casa Nova	0	0	2025-05-30 00:18:19.166103+00	2025-05-30 00:18:19.166103+00
b794e75e-7296-4d00-80e1-c71a60d8d9a2	a3b12ed2-9440-40d9-9293-3c20e778dd74	Reserva Go On	Fundo Go On Outdoor	242.83	242.83	2025-06-29 23:14:52.11657+00	2025-06-29 23:14:52.11657+00
2ec25a29-7c4e-401f-87c9-14e326519eb2	a3b12ed2-9440-40d9-9293-3c20e778dd74	Reserva de emergência	Reserva de Emergência	1074	1074	2025-06-29 23:15:18.361277+00	2025-06-29 23:15:18.361277+00
f8e32660-820b-401e-9cff-14c18ef3ea31	a3b12ed2-9440-40d9-9293-3c20e778dd74	Reserva C6 Bank	Renda Fixa c6 bank	35372.7	36872.7	2025-05-30 00:19:24.118736+00	2025-05-30 00:19:24.118736+00
\.


--
-- Data for Name: invoice_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_payments (id, user_id, credit_card_id, reference_month, invoice_amount, paid, payment_date, notes, created_at, updated_at) FROM stdin;
5e533da4-956b-4b0d-93d1-4676067d400c	a3b12ed2-9440-40d9-9293-3c20e778dd74	10afe38b-ee7b-402d-8fbd-ac1d2c9d0b68	2025-10-01	812.29	t	2025-10-15	\N	2025-10-15 19:07:06.907813+00	2025-10-15 19:07:06.907813+00
\.


--
-- Data for Name: não desligamento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."não desligamento" (id, created_at, campo, "off/on") FROM stdin;
2	2025-07-21 20:36:40.302462+00	teste	t
3	2025-07-27 03:00:22.147843+00	teste	t
4	2025-08-03 03:00:24.048771+00	teste	t
5	2025-08-10 03:00:34.113355+00	teste	t
6	2025-08-17 03:00:53.507686+00	teste	t
7	2025-08-24 03:00:37.861119+00	teste	t
8	2025-08-31 03:00:07.276381+00	teste	t
9	2025-09-07 03:00:30.373321+00	teste	t
10	2025-09-14 03:00:19.986567+00	teste	t
11	2025-09-21 03:00:13.60475+00	teste	t
12	2025-09-28 03:00:33.922118+00	teste	t
13	2025-10-05 03:00:58.411406+00	teste	t
14	2025-10-12 03:00:57.069936+00	teste	t
15	2025-10-19 03:00:57.04244+00	teste	t
16	2025-10-26 03:00:55.901217+00	teste	t
1	2025-07-21 20:23:31.864478+00	teste	t
17	2025-11-09 03:01:01.056192+00	teste	t
\.


--
-- Data for Name: recurring_bills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recurring_bills (id, user_id, name, value, category, due_date, bank, recurring, paid_this_month, created_at, updated_at) FROM stdin;
b80e4d88-4d6b-47ab-858d-ea22c08ce641	a3b12ed2-9440-40d9-9293-3c20e778dd74	UltraGáz	190.93	Apartamento	15		t	f	2025-06-01 14:01:41.307671+00	2025-06-01 14:01:41.307671+00
34040e9e-c624-472d-aafb-5ff2b79fb713	a3b12ed2-9440-40d9-9293-3c20e778dd74	Das Mei Marcela	80.90	Escritório	20		t	f	2025-06-01 14:02:02.22124+00	2025-06-01 14:02:02.22124+00
bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	a3b12ed2-9440-40d9-9293-3c20e778dd74	Energia Elétrica	60.87	Apartamento	16		t	f	2025-06-01 14:03:07.555568+00	2025-06-01 14:03:07.555568+00
dd82dc32-0e26-46de-a013-228be13b7a6a	a3b12ed2-9440-40d9-9293-3c20e778dd74	Terapia	480.00	Contas mensais	20		t	f	2025-06-01 14:06:13.634705+00	2025-06-01 14:06:13.634705+00
64a421cf-bb8c-4331-9acd-d4805f78d1ce	a3b12ed2-9440-40d9-9293-3c20e778dd74	Aluguel Apartamento	2950.00	Apartamento	30		t	f	2025-06-01 14:06:45.111398+00	2025-06-01 14:06:45.111398+00
dcaa4a42-e10f-491c-9b55-dba1b4937c04	a3b12ed2-9440-40d9-9293-3c20e778dd74	Corte de cabelo	75.00	Contas mensais	10		t	f	2025-06-01 14:03:27.847618+00	2025-06-01 14:03:27.847618+00
e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	a3b12ed2-9440-40d9-9293-3c20e778dd74	Fisioterapia Vanessa	314.00	Vida esportiva	10		t	f	2025-06-01 14:03:59.18259+00	2025-06-01 14:03:59.18259+00
6b19691d-65e2-4f82-9e00-c00d0ba07c81	a3b12ed2-9440-40d9-9293-3c20e778dd74	Contabilidade	200.00	Escritório	5		t	f	2025-06-01 14:01:07.446749+00	2025-06-01 14:01:07.446749+00
df427d1a-4565-4caf-9c6c-6b65c01c27e8	a3b12ed2-9440-40d9-9293-3c20e778dd74	Cartão de crédito Conta Simples	462.13	Escritório	9	CONTA SIMPLES	t	t	2025-06-01 21:47:13.610566+00	2025-06-01 21:47:13.610566+00
086b5054-806f-4a8c-9ccb-5ecc7a464ab0	a3b12ed2-9440-40d9-9293-3c20e778dd74	Internet Vivo - Apartamento	150.00	Apartamento	10		t	f	2025-06-01 14:03:43.673843+00	2025-06-01 14:03:43.673843+00
c079b1b8-8fde-46c5-9898-cd49e22f57da	a3b12ed2-9440-40d9-9293-3c20e778dd74	Mercado Marcela	1500.00	Contas mensais	15		t	f	2025-06-01 13:51:12.69532+00	2025-06-01 13:51:12.69532+00
8f0b5c90-210c-4f07-995e-7a0114241499	a3b12ed2-9440-40d9-9293-3c20e778dd74	Cartão de crédito C6 Bank	1908.78	Contas mensais	16		t	f	2025-06-01 14:08:24.758166+00	2025-06-01 14:08:24.758166+00
21955436-b252-4a3f-93e2-718ef06b81cd	a3b12ed2-9440-40d9-9293-3c20e778dd74	Investimento bolsa	500.00	Escritório	5	C6 BANK	t	f	2025-09-04 13:27:16.272673+00	2025-09-04 13:27:16.272673+00
2d378e93-d1f3-4752-90d9-cbba0f59a3ba	a3b12ed2-9440-40d9-9293-3c20e778dd74	Impostos	224.57	Escritório	20		t	f	2025-06-01 14:05:54.734097+00	2025-06-01 14:05:54.734097+00
\.


--
-- Data for Name: recurring_bills_instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recurring_bills_instances (id, bill_id, month_reference, valor_ajustado, pago, user_id, created_at, updated_at) FROM stdin;
75be4df7-45d5-4785-952a-c516c3393979	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 22:28:44.243929+00	2025-06-01 22:28:44.243929+00
455319bc-afcc-4bac-8bc7-6fd4c827a226	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 22:30:29.20225+00	2025-06-01 22:30:29.20225+00
d7cf857e-c5f7-4e50-9080-8dccf9d8a5c0	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 22:32:57.557831+00	2025-06-01 22:32:57.557831+00
0e71d47c-27e4-444b-b1c1-3ac70fd5db28	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-08-01	1000	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:36:52.888579+00	2025-08-03 22:36:52.888579+00
873c07be-a8dd-4435-889a-bf2d2d202e6e	dcaa4a42-e10f-491c-9b55-dba1b4937c04	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 12:58:15.687548+00	2025-09-04 12:58:15.687548+00
3ff2e3d4-4a6f-43c4-9019-b1bad4b34384	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-06-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-01 22:34:50.837186+00	2025-06-01 22:34:50.837186+00
d8168138-8eec-4378-82c2-b1a77662a4e4	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-04 20:57:14.638526+00	2025-06-04 20:57:14.638526+00
a34c1036-27c3-4d9f-8ea1-0dbeece2f778	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-04 21:19:22.96851+00	2025-06-04 21:19:22.96851+00
c20e6a91-237e-4acb-b59c-4483e9271df0	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09 15:05:02.826974+00	2025-06-09 15:05:02.826974+00
e66aef6c-ff58-4d5c-9b5b-b76a57ebce2f	8f0b5c90-210c-4f07-995e-7a0114241499	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09 15:06:27.330476+00	2025-06-09 15:06:27.330476+00
44ef0875-1fc1-4894-9a86-07af90eb6085	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-09 18:32:51.35761+00	2025-06-09 18:32:51.35761+00
a0c8dda5-f357-47c1-ae13-74a2244b62d8	dcaa4a42-e10f-491c-9b55-dba1b4937c04	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-11 00:21:44.573563+00	2025-06-11 00:21:44.573563+00
82354f40-3861-4061-a045-039c1494b77f	2d378e93-d1f3-4752-90d9-cbba0f59a3ba	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-11 00:22:03.596443+00	2025-06-11 00:22:03.596443+00
d6017657-3abb-4442-bb63-2dc61f8e5b71	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-06-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-11 00:23:53.214068+00	2025-06-11 00:23:53.214068+00
0b1c58e1-5869-458f-be1b-5f35f705409e	64a421cf-bb8c-4331-9acd-d4805f78d1ce	2025-06-01	2942.74	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-29 22:56:55.780282+00	2025-06-29 22:56:55.780282+00
3523f9c9-cd0d-462d-9cb3-84bfd69b2022	2d378e93-d1f3-4752-90d9-cbba0f59a3ba	2025-08-01	400	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:33:27.576353+00	2025-08-03 22:33:27.576353+00
0065572c-231e-4913-b082-7430b0acdba4	64a421cf-bb8c-4331-9acd-d4805f78d1ce	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 12:58:22.074503+00	2025-09-04 12:58:22.074503+00
9658c921-1f1f-421f-8f77-4fcaa5ffa0ce	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-07-01	663.51	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-29 23:16:51.254043+00	2025-06-29 23:16:51.254043+00
56956e33-bf0f-4164-8f00-41a8cb502224	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07 22:39:16.315173+00	2025-07-07 22:39:16.315173+00
05f56d88-0a1b-4e7b-b43f-723a48788e4b	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07 22:39:50.804686+00	2025-07-07 22:39:50.804686+00
28a3162f-0136-4538-8fb3-7ce35eb6ce6f	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-07-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04 15:23:40.74046+00	2025-07-04 15:23:40.74046+00
c67d0738-349d-42cf-ba3a-5ed3a57331d3	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-07-01	227.42	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04 15:05:11.082013+00	2025-07-04 15:05:11.082013+00
f017d213-63fc-46d3-81e6-dde82234c4fa	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-07-01	71.51	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-04 15:04:54.562122+00	2025-07-04 15:04:54.562122+00
4f6e106b-f3ed-4547-92b3-1331408a4cc5	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07 22:46:28.818243+00	2025-07-07 22:46:28.818243+00
e3feccb1-a500-4e55-a042-98c175397705	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-09-01	362.9	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:01:32.591016+00	2025-09-04 13:01:32.591016+00
59eaae63-3198-4aca-bd11-2b66848b40fe	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-07-01	1500	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-07 22:47:35.266206+00	2025-07-07 22:47:35.266206+00
3a8178c3-dcf7-4381-bda1-887976acc64f	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-08 21:57:50.202911+00	2025-07-08 21:57:50.202911+00
049448a7-f86e-4d83-8f7a-5e2ead75aec7	8f0b5c90-210c-4f07-995e-7a0114241499	2025-07-01	1699	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-06-29 23:17:16.052932+00	2025-06-29 23:17:16.052932+00
22b37eff-de73-45be-9857-490637ee0682	2d378e93-d1f3-4752-90d9-cbba0f59a3ba	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-10 13:57:17.431008+00	2025-07-10 13:57:17.431008+00
efc1b836-abf0-4a1e-8e5e-ecb975c06825	dcaa4a42-e10f-491c-9b55-dba1b4937c04	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-17 22:50:11.799131+00	2025-07-17 22:50:11.799131+00
b2463869-8f9d-4393-8f31-3bea5280bf97	64a421cf-bb8c-4331-9acd-d4805f78d1ce	2025-07-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-07-28 22:20:42.784414+00	2025-07-28 22:20:42.784414+00
9b7af72d-76c4-43e1-bcaa-fbec8bc26bf4	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-09-01	0	f	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:03:43.641513+00	2025-09-04 13:03:43.641513+00
2eb1b38c-1fe1-4048-ac86-eb4bef8933e2	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-08-01	406.92	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:04:58.138236+00	2025-08-03 22:04:58.138236+00
0bc812b7-9b45-4cb7-840e-2683631ee483	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-08-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:09:28.526385+00	2025-08-03 22:09:28.526385+00
16ee0c5e-5ca7-4a73-aad6-8a90e2223902	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-08-01	74.88	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:19:18.85477+00	2025-08-03 22:19:18.85477+00
05f782fa-8358-4ca2-929a-a5c778c1dbf7	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-08-01	195.83	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:14:26.121223+00	2025-08-03 22:14:26.121223+00
37563e8a-437d-4a23-9761-6b5ea24fd356	8f0b5c90-210c-4f07-995e-7a0114241499	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:25:55.105294+00	2025-08-03 22:25:55.105294+00
7298e960-306c-4f96-90c6-5baa004726b8	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:30:39.21264+00	2025-08-03 22:30:39.21264+00
847655f3-dcc3-4702-980a-8dd260efff0f	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:32:46.933778+00	2025-08-03 22:32:46.933778+00
f19e0ab8-9d36-4d3e-92aa-9523f0fb418f	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:35:16.284224+00	2025-08-03 22:35:16.284224+00
bb14bc41-f8ba-4ea5-8c9f-3664b14d0fc3	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-08-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-08-03 22:39:00.966637+00	2025-08-03 22:39:00.966637+00
b2ac418a-3308-4153-bd47-2e017ffd4d4f	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-09-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:09:21.531494+00	2025-09-04 13:09:21.531494+00
666eafd1-470d-4ee9-b980-de8df7c0028b	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-09-01	189.29	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:02:59.214181+00	2025-09-04 13:02:59.214181+00
132ef4dd-8f06-4558-8c0c-e006b6d9139d	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-09-01	65.99	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:04:42.141677+00	2025-09-04 13:04:42.141677+00
d6568253-d087-4732-bc1f-67a368aab03a	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:16:08.564044+00	2025-09-04 13:16:08.564044+00
9c52d123-b8f6-4805-8ed8-2b6b71e29801	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:17:20.948865+00	2025-09-04 13:17:20.948865+00
45f3e45f-dc9a-4039-ac93-70ee791fe4ce	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:19:15.104321+00	2025-09-04 13:19:15.104321+00
e7e45274-ee96-4a74-85de-0791b99d4c8c	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-09-01	349	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:19:30.864354+00	2025-09-04 13:19:30.864354+00
3b13a840-a68a-42c8-97a1-04de19c68f7a	21955436-b252-4a3f-93e2-718ef06b81cd	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11 17:24:17.481931+00	2025-09-11 17:24:17.481931+00
01cf217f-b34b-4f4f-a065-a30a84254bce	dcaa4a42-e10f-491c-9b55-dba1b4937c04	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-11 17:24:21.762395+00	2025-09-11 17:24:21.762395+00
289f9c02-4a8d-446e-907e-ebaefa1f33d5	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:32:13.418039+00	2025-10-06 00:32:13.418039+00
a85b4dff-e87a-4858-ab44-4c74842dda02	8f0b5c90-210c-4f07-995e-7a0114241499	2025-09-01	393.02	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-09-04 13:05:26.157025+00	2025-09-04 13:05:26.157025+00
22de2aea-9386-4921-8360-8b409f32dab7	64a421cf-bb8c-4331-9acd-d4805f78d1ce	2025-09-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:16:26.380072+00	2025-10-06 00:16:26.380072+00
9722e976-d56f-4587-a147-2acdac59d845	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-10-01	564.1	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:17:22.528118+00	2025-10-06 00:17:22.528118+00
a1275684-ff16-4f6f-a927-a66d78a0f989	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-10-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:19:46.152546+00	2025-10-06 00:19:46.152546+00
6de81e8a-7637-4bab-b6db-8d289230ccef	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-10-01	88.84	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:26:54.745546+00	2025-10-06 00:26:54.745546+00
fb51ab6a-de1a-4462-aedc-c611f8f6f89a	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:30:49.257434+00	2025-10-06 00:30:49.257434+00
b58f3e2a-ba98-4cff-a949-263f6a7d2c72	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:36:35.680456+00	2025-10-06 00:36:35.680456+00
99c751b7-220b-4f6a-b5a9-69df4866baaa	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:40:45.398128+00	2025-10-06 00:40:45.398128+00
566b9785-b19e-4ea9-9bf7-23f6acf4a5c6	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-10-01	1300	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:52:28.914645+00	2025-10-12 18:52:28.914645+00
ac6fdc6e-210a-4940-942a-1824086b4683	dcaa4a42-e10f-491c-9b55-dba1b4937c04	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-12 18:52:37.574292+00	2025-10-12 18:52:37.574292+00
830db0f8-6a7d-4d65-8285-bf0c97af89bf	8f0b5c90-210c-4f07-995e-7a0114241499	2025-10-01	1057.92	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:29:15.615297+00	2025-10-06 00:29:15.615297+00
9fb1c3d3-92ee-4c6c-bc5f-926dbedbbf42	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-10-01	314.08	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-06 00:24:51.62815+00	2025-10-06 00:24:51.62815+00
5e521103-b9d3-4a38-a65c-2d49febcc22e	2d378e93-d1f3-4752-90d9-cbba0f59a3ba	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-15 15:39:02.234389+00	2025-10-15 15:39:02.234389+00
066c7130-b04c-44ef-af3b-b82aae25d25c	64a421cf-bb8c-4331-9acd-d4805f78d1ce	2025-10-01	2764.63	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23 15:24:26.326785+00	2025-10-23 15:24:26.326785+00
3ff5b026-8e63-4fb8-9b20-0ac436c3646f	21955436-b252-4a3f-93e2-718ef06b81cd	2025-10-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-10-23 15:23:32.793317+00	2025-10-23 15:23:32.793317+00
fa3f13a3-cbd8-4a78-8856-b380f46bf71a	6b19691d-65e2-4f82-9e00-c00d0ba07c81	2025-11-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:44:03.407388+00	2025-11-06 22:44:03.407388+00
19a59d70-be53-4f5b-8ebc-c98934c917bc	8f0b5c90-210c-4f07-995e-7a0114241499	2025-11-01	2526.26	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:44:59.293691+00	2025-11-06 22:44:59.293691+00
8bfa711e-7108-4c08-ac33-2109d0d35161	e3bf0ea4-f4bd-4354-b24a-135e1c0bf70a	2025-11-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:47:35.213089+00	2025-11-06 22:47:35.213089+00
40aeba1a-e957-4e53-a6e5-8c37469e68d0	086b5054-806f-4a8c-9ccb-5ecc7a464ab0	2025-11-01	156	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:48:37.060676+00	2025-11-06 22:48:37.060676+00
a843bac7-64d7-4a16-9be9-dfd51ba635f6	b80e4d88-4d6b-47ab-858d-ea22c08ce641	2025-11-01	306.55	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:51:31.024213+00	2025-11-06 22:51:31.024213+00
69f1317a-64b8-4b76-904c-808d4e8af59a	bc5553ec-2b9d-4120-a0f5-0b0b0a7830ef	2025-11-01	77.5	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:52:23.509819+00	2025-11-06 22:52:23.509819+00
9c83625a-acd8-4eb1-a803-916ca7f11072	dd82dc32-0e26-46de-a013-228be13b7a6a	2025-11-01	520	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:53:55.949499+00	2025-11-06 22:53:55.949499+00
81fb09ca-ed8e-480f-8620-e0cf4940616e	34040e9e-c624-472d-aafb-5ff2b79fb713	2025-11-01	\N	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:59:31.51877+00	2025-11-06 22:59:31.51877+00
77e4192c-f65a-4565-9a22-a070220621c9	df427d1a-4565-4caf-9c6c-6b65c01c27e8	2025-11-01	500	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 17:51:03.431182+00	2025-11-06 17:51:03.431182+00
42fb5b7d-7392-419f-889f-02d0901b1f14	21955436-b252-4a3f-93e2-718ef06b81cd	2025-11-01	1000	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 22:44:01.538702+00	2025-11-06 22:44:01.538702+00
15893c60-a00f-4504-ba04-a1b1bed5007f	c079b1b8-8fde-46c5-9898-cd49e22f57da	2025-11-01	1000	t	a3b12ed2-9440-40d9-9293-3c20e778dd74	2025-11-06 23:05:08.348494+00	2025-11-06 23:05:08.348494+00
\.


--
-- Data for Name: recurring_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recurring_templates (id, user_id, type, amount, description, category, business_unit_id, credit_card, is_active, last_generated_month, created_at, updated_at) FROM stdin;
76682739-4de5-4d96-9cb5-6326eb9463a3	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	22.00	acelerar c6 bank	Cobranças	b1acfd71-5320-4cc8-9aae-45664bcdb96e	\N	t	2025-12-01	2025-10-23 15:17:47.463721+00	2025-10-24 01:01:45.469698+00
5dfdf037-3476-4445-bae9-8f6f79125aa7	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	2764.63	Aluguel Galvão Imóveis	Aluguel	786da91f-5e21-488b-8e08-95f9d3e656a0	\N	t	2025-12-01	2025-10-23 15:24:55.245169+00	2025-10-24 01:01:45.469698+00
1ba02edc-da6b-4e1b-be7f-2db4feadf7d7	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	189.00	Pacote adobe 	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 00:48:29.460169+00	2025-10-24 01:01:45.469698+00
f1f8cb54-d219-4bd5-bee6-8f26c1790d01	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	189.00	Pacote adobe 	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 00:48:31.928337+00	2025-10-24 01:01:45.469698+00
7fe42e72-2004-424e-a900-b3352e8f5de4	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	189.00	Pacote adobe 	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 00:48:41.165402+00	2025-10-24 01:01:45.469698+00
4cbf520a-a45a-477d-ad6a-f9a88586840e	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	224.57	Impostos	Impostos	b1acfd71-5320-4cc8-9aae-45664bcdb96e	\N	t	2025-12-01	2025-10-13 19:05:40.436248+00	2025-10-24 01:01:45.469698+00
83b6e195-5015-4f28-8738-2833773b6374	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	224.57	Impostos	Impostos	b1acfd71-5320-4cc8-9aae-45664bcdb96e	\N	t	2025-12-01	2025-10-13 19:05:53.4757+00	2025-10-24 01:01:45.469698+00
73ae9ae5-c333-4776-8b72-a5b415167f08	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	314.00	fisioterapia vanessa	Fisioterapia	aa3b9d18-94aa-436f-b437-73af0d14aff9	\N	t	2025-12-01	2025-10-14 01:37:38.249926+00	2025-10-24 01:01:45.469698+00
93b23af7-3aeb-461a-9e14-150c363db030	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	15.55	IOF - Framer, Claude, Lovable,	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:20:25.436852+00	2025-10-24 01:01:45.469698+00
64275d42-0f14-44b3-8989-39a730746538	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	156.39	Framer - Go On + Marcela	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:22:18.047101+00	2025-10-24 01:01:45.469698+00
d39168fd-5482-4a93-adc5-15314af682fb	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	137.55	Lovable	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:23:12.86438+00	2025-10-24 01:01:45.469698+00
d29cc3fb-1df2-408f-9548-33bacfb36f82	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	110.00	Assinatura Claude AI	AI	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:26:03.257168+00	2025-10-24 01:01:45.469698+00
28ba1367-14dc-45d8-b59f-c2ad942c5db2	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	96.99	Google Drive + Gemini PRO	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:27:05.55222+00	2025-10-24 01:01:45.469698+00
19d71c59-7801-4a59-abb6-9762cc06046f	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	69.99	Hostinger N8n	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:27:30.434789+00	2025-10-24 01:01:45.469698+00
b0d1d815-e0fc-40b4-af81-5e0e902d57e6	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	26.90	Youtube Premium	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:27:56.131512+00	2025-10-24 01:01:45.469698+00
61eeadcf-2234-44eb-bb36-025d11d72c3a	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	97.00	inlead marketing	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:30:18.213309+00	2025-10-24 01:01:45.469698+00
9844b858-bb9d-45eb-9c8e-35222813eecc	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	12.50	Gemini PRO Marcela	AI	b1acfd71-5320-4cc8-9aae-45664bcdb96e	Conta Simples	t	2025-12-01	2025-10-15 15:30:42.337453+00	2025-10-24 01:01:45.469698+00
9c89a160-ed4e-406c-b8f3-001f970eaf20	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	200.00	contabilidade vanessa	Serviço de terceiro	b1acfd71-5320-4cc8-9aae-45664bcdb96e	\N	t	2025-12-01	2025-10-15 19:06:01.412277+00	2025-10-24 01:01:45.469698+00
2fcbd1d1-03cd-467c-9b0c-a92ad72406c9	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	88.84	energia elétrica	Luz	786da91f-5e21-488b-8e08-95f9d3e656a0	\N	t	2025-12-01	2025-10-15 19:10:43.711843+00	2025-10-24 01:01:45.469698+00
774ef7af-761c-4fa4-a32c-463278ec581f	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	156.00	Vivo fibra	Internet	786da91f-5e21-488b-8e08-95f9d3e656a0	\N	t	2025-12-01	2025-10-15 19:10:49.750082+00	2025-10-24 01:01:45.469698+00
527b7990-fbdc-4e13-8af9-68b3dfc9d1c0	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	480.00	Terapia	Serviços pessoais	d4a8bdf9-d796-44dc-9498-553076c57748	\N	t	2025-12-01	2025-10-15 19:11:00.183927+00	2025-10-24 01:01:45.469698+00
63c185d4-aaf9-4e10-9606-b0c80733a0a6	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	80.90	das mei marcela	Impostos	b1acfd71-5320-4cc8-9aae-45664bcdb96e	\N	t	2025-12-01	2025-10-15 19:11:07.843656+00	2025-10-24 01:01:45.469698+00
f022ce69-9424-4095-8f14-c0848fba0f7d	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	31.90	Spotify	Serviços pessoais	d4a8bdf9-d796-44dc-9498-553076c57748	C6 Bank	t	2025-12-01	2025-10-24 00:55:17.2351+00	2025-10-24 01:01:45.469698+00
743754ed-2494-4d98-90ae-698a1e2b6e73	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	78.80	TV Meli +	Serviços pessoais	d4a8bdf9-d796-44dc-9498-553076c57748	C6 Bank	t	2025-12-01	2025-10-24 00:55:59.714902+00	2025-10-24 01:01:45.469698+00
c0330cd2-25e9-4416-b086-d51016c9e6e6	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	99.90	Assinatura ChatGPT Plus	AI	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 00:59:46.611568+00	2025-10-24 01:01:45.469698+00
6783c41f-806b-43b0-8707-03267972e7e5	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	5.90	Apple cloud	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 01:00:31.139162+00	2025-10-24 01:01:45.469698+00
5bc3f497-8eaf-4863-93a2-1646b1c9bb62	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	49.90	Beeper WhatsApp	Software	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-12-01	2025-10-24 01:01:29.224364+00	2025-10-24 01:01:45.469698+00
c0a00223-4c9f-45f2-a14f-401dbf3d4702	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	127.98	TIM - Wesley e Marcela	Serviços pessoais	d4a8bdf9-d796-44dc-9498-553076c57748	C6 Bank	t	2025-11-01	2025-10-24 01:03:44.406317+00	2025-10-24 01:04:25.33649+00
a618be46-d313-417c-8f1c-753be895d511	a3b12ed2-9440-40d9-9293-3c20e778dd74	saida	99.00	Adapta Org	AI	b1acfd71-5320-4cc8-9aae-45664bcdb96e	C6 Bank	t	2025-11-01	2025-10-24 01:07:48.826053+00	2025-10-24 01:08:19.396915+00
\.


--
-- Data for Name: unit_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unit_categories (id, user_id, business_unit_id, type, name, created_at, updated_at) FROM stdin;
fb029e64-dff0-4b90-928e-1aff74163263	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Material de Escritório	2025-10-14 01:04:01.317607+00	2025-10-14 01:04:01.317607+00
e233f85f-68a6-4547-8565-aeb3d7ad1d62	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Software	2025-10-14 01:04:01.317607+00	2025-10-14 01:04:01.317607+00
588726ec-c51a-46a0-8c51-3765f125ccb4	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	AI	2025-10-14 01:04:01.317607+00	2025-10-14 01:04:01.317607+00
cefb0a45-b3b6-461b-84b7-3341a588632b	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Impostos	2025-10-14 01:04:01.317607+00	2025-10-14 01:04:01.317607+00
69f25825-9a5c-4231-a2e4-28f302fdd0cc	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Academia	2025-10-14 01:04:58.748694+00	2025-10-14 01:04:58.748694+00
fa9b8198-e5ff-40b7-9ff8-149b942bbd10	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Equipamentos	2025-10-14 01:04:58.748694+00	2025-10-14 01:04:58.748694+00
b49a7f50-d2a9-422d-bfa5-77d1ac9067b4	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Roupas Esportivas	2025-10-14 01:04:58.748694+00	2025-10-14 01:04:58.748694+00
3775fff8-b365-4969-a501-1afd6c98d28d	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Suplementos	2025-10-14 01:04:58.748694+00	2025-10-14 01:04:58.748694+00
aabc705d-73f6-4209-84cb-ad6ff3827ff9	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Competições	2025-10-14 01:04:58.748694+00	2025-10-14 01:04:58.748694+00
9f8e030f-e47f-408d-bed2-053718d67ab6	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Supermercado	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
2292b7f7-a942-44c3-b747-7b36d084c990	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Restaurante	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
6b8f8b2e-9c93-471b-ad50-a8196da2caa0	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Delivery	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
83faec81-0a09-479c-87a9-4fe7477f73cc	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Padaria	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
2da866fa-7cc8-48cb-b4b4-b855e7f40fbe	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Feira	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
30f3e34a-04c3-45b2-a8a6-2d2fc6525342	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Açougue	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
35ba8113-90dc-43ce-9d69-405e9362a5ea	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Bebidas	2025-10-14 01:05:10.950905+00	2025-10-14 01:05:10.950905+00
e17eb37c-f472-4bbf-851c-f7d6b63e6335	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Combustível	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
0049629d-1472-4d36-8c1b-f9954765534f	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Manutenção	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
46d99d4f-af54-4c60-8c8a-ca324acbb639	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Seguro	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
d96abbc4-0cc0-4f43-9f63-c1908e597a55	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	IPVA	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
c575e8e6-ca37-421a-b344-33f8f9bed58f	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Estacionamento	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
ac0d37ca-101c-4d5e-8bf3-7b18ed40f27d	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Multas	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
a879a779-8bf2-495e-99ae-e1bc5625f3c6	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Lavagem	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
280f3c9e-6bf6-44ef-a7ee-8efffc69c652	a3b12ed2-9440-40d9-9293-3c20e778dd74	42f47fc8-1503-4707-9b73-642aefe4cc6b	saida	Pedágio	2025-10-14 01:05:27.788028+00	2025-10-14 01:05:27.788028+00
a0ae0a5a-cec7-48cb-aee0-5f97755f7727	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Passagens	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
7bf3b40f-75a7-49f7-974d-7124c46c2c88	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Hospedagem	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
78062fff-4d75-471d-a952-8b90cf2e2c6b	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Alimentação	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
e1fd8c61-68cb-416a-92ab-3dae88d281d1	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Passeios	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
97c784af-ecb5-4b7a-bd98-7380596ad5ad	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Ingressos	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
69a1d536-0e05-4a14-959a-10bbd98e85ce	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Souvenirs	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
019e3168-f8e8-4424-ad37-eca405c06f43	a3b12ed2-9440-40d9-9293-3c20e778dd74	948cb2fd-2c60-4eb4-b9f3-1ba4603cdd7b	saida	Transporte	2025-10-14 01:05:47.013521+00	2025-10-14 01:05:47.013521+00
3f1f8a9d-73df-447a-aa22-9a21ea9f8da6	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Roupas	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
382ad43c-0449-4a69-b116-f922d4e8f6de	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Eletrônicos	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
9a47a10e-696a-4635-8505-6b2c5e36d044	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Livros	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
91751be0-a931-4cb0-b773-b44e04132699	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Acessórios	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
9a66c785-4aa6-49d5-a034-6e60063abea9	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Presentes	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
8e04e2b9-8dd2-4c01-bfb8-063f9d4763a0	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Cosméticos	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
70531bd4-72f3-47ca-99f8-ed1cd2f82c45	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Farmácia	2025-10-14 01:05:52.711236+00	2025-10-14 01:05:52.711236+00
16cda22d-93a8-44e4-97cd-706a34795187	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Estética	2025-10-14 01:06:08.780733+00	2025-10-14 01:06:08.780733+00
bfcc4bfd-da6e-4b39-a0f7-56c1ab3e6fa1	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Despesas Operacionais	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
93a68db7-0c30-48db-9ed9-b925c31999d1	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Marketing	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
a7b2883a-b523-4513-8929-20a6b1f03a51	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Fornecedores	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
83057f1f-ff15-471c-be3f-ad5e8ca1a9ee	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Equipamentos	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
6af58fc4-cca3-4c0a-8a06-e2fb7b721872	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Logística	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
3a88d40f-6e81-4f8d-b5ed-55759e2a2183	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	saida	Taxas	2025-10-14 01:06:54.562019+00	2025-10-14 01:06:54.562019+00
4b41b1af-1f5d-4ace-a7ec-6a492ebce3a4	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Vendas Online	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
6a900238-0e26-4ff5-883e-3af42c1899c2	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Vendas Presenciais	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
26e4f963-fcca-4335-8a5a-a2e2f6d6b90c	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Parcerias	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
9013b0a2-570c-4ee6-8fc1-ca0f77d97cac	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Comissões	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
e30bdb24-f2eb-4370-9cdf-a2e0b889de08	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Patrocínios	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
e713dc83-5f85-473d-ab12-8d22d3f2f019	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Eventos	2025-10-14 01:07:29.413073+00	2025-10-14 01:07:29.413073+00
1fe16ef5-6f1f-4997-aeab-14e56d71b92d	a3b12ed2-9440-40d9-9293-3c20e778dd74	5fa8fd39-5c6b-4e0a-804f-1f6199c5fd1e	entrada	Pró-labore	2025-10-14 01:07:41.385103+00	2025-10-14 01:07:41.385103+00
19ccd277-ab0b-479c-b382-a7f630031a1b	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Condomínio	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
a4da7bc0-e8b9-441d-a83a-edc265f1fa24	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Aluguel	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
500e7aa7-0bd4-44b8-953f-82a416f4c264	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Luz	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
53a53855-5861-4360-990a-8b1eb2b989d1	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Água	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
aac9964e-d419-4119-9856-2f341cea885a	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Internet	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
59b69ea0-7584-4b5f-bd2d-73e75fcaa418	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Gás	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
a020f72d-fb9a-46bc-8b97-cd4e801d9f98	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	IPTU	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
29f0e2ba-dd3e-4f87-bca9-a2914558b097	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Reformas	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
63e1a663-ea16-403a-a16a-55161c8d56da	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Manutenção	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
dffc6b35-7b9f-415d-9a18-42224996288b	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Móveis	2025-10-14 01:07:52.863481+00	2025-10-14 01:07:52.863481+00
7f809b47-99bc-4733-b866-882ad4813b34	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	saida	Mercado mensal	2025-10-14 01:08:06.692764+00	2025-10-14 01:08:06.692764+00
6f1a1e0a-b640-4c54-bd28-68582dde16d3	a3b12ed2-9440-40d9-9293-3c20e778dd74	7869eb2b-eb82-438e-b28b-1db1540bd948	saida	Snacks	2025-10-14 01:21:47.248911+00	2025-10-14 01:21:47.248911+00
ad021a5b-a621-4764-9601-3bf8af5c6161	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	entrada	Receitas de Serviços	2025-10-14 01:22:15.842848+00	2025-10-14 01:22:15.842848+00
3fecd1ac-4137-46bf-89ad-534e88b761ca	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	entrada	Consultorias	2025-10-14 01:22:15.842848+00	2025-10-14 01:22:15.842848+00
7d6b3d70-6043-4ded-b47b-8c76e8345262	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	entrada	Reembolsos	2025-10-14 01:22:15.842848+00	2025-10-14 01:22:15.842848+00
7ddcbe00-68e6-4340-b3e6-ef3f737723d9	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	entrada	Venda de Equipamentos	2025-10-14 01:22:15.842848+00	2025-10-14 01:22:15.842848+00
97212e89-dfc2-464d-bdc5-cd1be25f4fb7	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	entrada	AI	2025-10-14 01:22:15.842848+00	2025-10-14 01:22:15.842848+00
73f3ba07-45a7-484d-b1ca-a474dce13dfa	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Cursos/formações	2025-10-14 01:22:54.911143+00	2025-10-14 01:22:54.911143+00
2f22aa7d-17b6-4573-80fa-7bd12712c406	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	saida	Fisioterapia	2025-10-14 01:04:58.748694+00	2025-10-14 01:23:40.650379+00
d1eb52aa-d2af-4a06-926a-d9e0437d33e4	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Serviço de terceiro	2025-10-14 01:25:32.458397+00	2025-10-14 01:25:32.458397+00
42635546-c389-4047-99e8-5521bfb70af8	a3b12ed2-9440-40d9-9293-3c20e778dd74	d4a8bdf9-d796-44dc-9498-553076c57748	saida	Serviços pessoais	2025-10-14 01:26:15.690872+00	2025-10-14 01:26:15.690872+00
e0d3dd00-0366-4e64-9bbd-adf7bb955ad6	a3b12ed2-9440-40d9-9293-3c20e778dd74	b1acfd71-5320-4cc8-9aae-45664bcdb96e	saida	Cobranças	2025-10-14 01:27:15.589283+00	2025-10-14 01:27:15.589283+00
c5f52ad9-e681-45b3-8242-e5e24bf5bd8d	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	entrada	Aluguel Recebido	2025-10-14 01:27:35.713021+00	2025-10-14 01:27:35.713021+00
3900c6a4-c28e-4c6c-98b2-98bf1b372805	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	entrada	Venda de Móveis	2025-10-14 01:27:35.713021+00	2025-10-14 01:27:35.713021+00
22a1f42e-a606-41fd-93b6-d72f1b88d615	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	entrada	Reembolso de Despesas	2025-10-14 01:27:35.713021+00	2025-10-14 01:27:35.713021+00
e1bc211b-dbb6-4c19-9f60-da180baf77f6	a3b12ed2-9440-40d9-9293-3c20e778dd74	786da91f-5e21-488b-8e08-95f9d3e656a0	entrada	Devolução de Caução	2025-10-14 01:27:35.713021+00	2025-10-14 01:27:35.713021+00
d8b1eae1-0613-448f-9c5f-261940779370	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	entrada	Prêmios	2025-10-14 01:27:44.690857+00	2025-10-14 01:27:44.690857+00
6bbfcda2-3b05-4893-bfdc-242fa6fa43e0	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	entrada	Patrocínios	2025-10-14 01:27:44.690857+00	2025-10-14 01:27:44.690857+00
3a215ed0-af9b-4276-96f5-fa6a77d625d7	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	entrada	Venda de Equipamentos	2025-10-14 01:27:44.690857+00	2025-10-14 01:27:44.690857+00
e8c20b55-9ecf-4512-81d3-65b9ada34111	a3b12ed2-9440-40d9-9293-3c20e778dd74	aa3b9d18-94aa-436f-b437-73af0d14aff9	entrada	Reembolsos	2025-10-14 01:27:44.690857+00	2025-10-14 01:27:44.690857+00
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, display_name, onboarding_completed, theme_color, avatar_url, created_at, updated_at) FROM stdin;
f31c6531-393b-4bc2-8bf0-201d88247cd5	26bac8f5-5b37-4151-a95c-247251b8556d	Usuário	f	#f97316	\N	2025-10-13 13:23:36.832054+00	2025-10-13 13:23:36.832054+00
2b396645-c8d6-4129-a4d6-39e520a1bbf5	a3b12ed2-9440-40d9-9293-3c20e778dd74	Wesley	t	#f97316	\N	2025-10-13 13:23:36.832054+00	2025-10-13 14:19:03.393462+00
\.


--
-- Name: não desligamento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."não desligamento_id_seq"', 17, true);


--
-- Name: bank_balances bank_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_balances
    ADD CONSTRAINT bank_balances_pkey PRIMARY KEY (id);


--
-- Name: bank_balances bank_balances_user_id_bank_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_balances
    ADD CONSTRAINT bank_balances_user_id_bank_name_key UNIQUE (user_id, bank_name);


--
-- Name: bill_adjustments bill_adjustments_bill_id_month_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_adjustments
    ADD CONSTRAINT bill_adjustments_bill_id_month_user_id_key UNIQUE (bill_id, month, user_id);


--
-- Name: bill_adjustments bill_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_adjustments
    ADD CONSTRAINT bill_adjustments_pkey PRIMARY KEY (id);


--
-- Name: business_units business_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_pkey PRIMARY KEY (id);


--
-- Name: business_units business_units_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_user_id_name_key UNIQUE (user_id, name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: credit_card_charges credit_card_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_card_charges
    ADD CONSTRAINT credit_card_charges_pkey PRIMARY KEY (id);


--
-- Name: credit_cards credit_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_pkey PRIMARY KEY (id);


--
-- Name: credit_cards credit_cards_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_user_id_name_key UNIQUE (user_id, name);


--
-- Name: financial_items financial_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_items
    ADD CONSTRAINT financial_items_pkey PRIMARY KEY (id);


--
-- Name: financial_summary_income financial_summary_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_summary_income
    ADD CONSTRAINT financial_summary_income_pkey PRIMARY KEY (id);


--
-- Name: financial_summary financial_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_summary
    ADD CONSTRAINT financial_summary_pkey PRIMARY KEY (id);


--
-- Name: investment_categories investment_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_categories
    ADD CONSTRAINT investment_categories_pkey PRIMARY KEY (id);


--
-- Name: investment_transactions investment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_transactions
    ADD CONSTRAINT investment_transactions_pkey PRIMARY KEY (id);


--
-- Name: investments investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_user_id_credit_card_id_reference_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_user_id_credit_card_id_reference_month_key UNIQUE (user_id, credit_card_id, reference_month);


--
-- Name: não desligamento não desligamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."não desligamento"
    ADD CONSTRAINT "não desligamento_pkey" PRIMARY KEY (id);


--
-- Name: recurring_bills_instances recurring_bills_instances_bill_id_month_reference_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_bills_instances
    ADD CONSTRAINT recurring_bills_instances_bill_id_month_reference_user_id_key UNIQUE (bill_id, month_reference, user_id);


--
-- Name: recurring_bills_instances recurring_bills_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_bills_instances
    ADD CONSTRAINT recurring_bills_instances_pkey PRIMARY KEY (id);


--
-- Name: recurring_bills recurring_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_bills
    ADD CONSTRAINT recurring_bills_pkey PRIMARY KEY (id);


--
-- Name: recurring_templates recurring_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_pkey PRIMARY KEY (id);


--
-- Name: financial_summary unique_user_month_category; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_summary
    ADD CONSTRAINT unique_user_month_category UNIQUE (user_id, month, category);


--
-- Name: unit_categories unit_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_categories
    ADD CONSTRAINT unit_categories_pkey PRIMARY KEY (id);


--
-- Name: unit_categories unit_categories_user_id_business_unit_id_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_categories
    ADD CONSTRAINT unit_categories_user_id_business_unit_id_type_name_key UNIQUE (user_id, business_unit_id, type, name);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: idx_financial_items_business_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_business_unit ON public.financial_items USING btree (business_unit_id);


--
-- Name: idx_financial_items_credit_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_credit_card ON public.financial_items USING btree (credit_card, user_id);


--
-- Name: idx_financial_items_installment_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_installment_end ON public.financial_items USING btree (installment_end_month) WHERE (installment_end_month IS NOT NULL);


--
-- Name: idx_financial_items_installment_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_installment_start ON public.financial_items USING btree (installment_start_month) WHERE (installment_start_month IS NOT NULL);


--
-- Name: idx_financial_items_installments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_installments ON public.financial_items USING btree (installment_group_id) WHERE (installment_group_id IS NOT NULL);


--
-- Name: idx_financial_items_needs_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_needs_review ON public.financial_items USING btree (needs_review) WHERE (needs_review = true);


--
-- Name: idx_financial_items_recurring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_items_recurring ON public.financial_items USING btree (is_recurring, recurring_status) WHERE (is_recurring = true);


--
-- Name: idx_financial_summary_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_summary_category ON public.financial_summary USING btree (category);


--
-- Name: idx_financial_summary_income_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_summary_income_user_month ON public.financial_summary_income USING btree (user_id, month);


--
-- Name: idx_financial_summary_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_summary_user_month ON public.financial_summary USING btree (user_id, month);


--
-- Name: idx_invoice_payments_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_payments_month ON public.invoice_payments USING btree (user_id, reference_month);


--
-- Name: idx_recurring_bills_user_paid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_bills_user_paid ON public.recurring_bills USING btree (user_id, paid_this_month);


--
-- Name: idx_recurring_templates_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_templates_user_active ON public.recurring_templates USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_unit_categories_user_unit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unit_categories_user_unit_type ON public.unit_categories USING btree (user_id, business_unit_id, type);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: investment_categories_user_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX investment_categories_user_name_unique ON public.investment_categories USING btree (user_id, name);


--
-- Name: credit_cards update_credit_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_payments update_invoice_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_payments_updated_at BEFORE UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recurring_templates update_recurring_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recurring_templates_updated_at BEFORE UPDATE ON public.recurring_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unit_categories update_unit_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unit_categories_updated_at BEFORE UPDATE ON public.unit_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_timestamp BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: credit_cards credit_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: financial_items financial_items_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_items
    ADD CONSTRAINT financial_items_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE SET NULL;


--
-- Name: financial_items financial_items_recurring_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_items
    ADD CONSTRAINT financial_items_recurring_template_id_fkey FOREIGN KEY (recurring_template_id) REFERENCES public.recurring_templates(id) ON DELETE SET NULL;


--
-- Name: financial_items financial_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_items
    ADD CONSTRAINT financial_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: financial_summary financial_summary_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_summary
    ADD CONSTRAINT financial_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: investment_transactions investment_transactions_investment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investment_transactions
    ADD CONSTRAINT investment_transactions_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- Name: invoice_payments invoice_payments_credit_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;


--
-- Name: invoice_payments invoice_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_bills recurring_bills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_bills
    ADD CONSTRAINT recurring_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: recurring_templates recurring_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: unit_categories unit_categories_business_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_categories
    ADD CONSTRAINT unit_categories_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE;


--
-- Name: unit_categories unit_categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_categories
    ADD CONSTRAINT unit_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bank_balances Users can create their own bank balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bank balances" ON public.bank_balances FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bill_adjustments Users can create their own bill adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bill adjustments" ON public.bill_adjustments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recurring_bills_instances Users can create their own bill instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own bill instances" ON public.recurring_bills_instances FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_units Users can create their own business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own business units" ON public.business_units FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Users can create their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: credit_card_charges Users can create their own credit card charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own credit card charges" ON public.credit_card_charges FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: credit_cards Users can create their own credit cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own credit cards" ON public.credit_cards FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: financial_items Users can create their own financial items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own financial items" ON public.financial_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: financial_summary_income Users can create their own income summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own income summaries" ON public.financial_summary_income FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: investment_categories Users can create their own investment categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own investment categories" ON public.investment_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: investment_transactions Users can create their own investment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own investment transactions" ON public.investment_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: investments Users can create their own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own investments" ON public.investments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_payments Users can create their own invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own invoice payments" ON public.invoice_payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recurring_bills Users can create their own recurring bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own recurring bills" ON public.recurring_bills FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recurring_templates Users can create their own recurring templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own recurring templates" ON public.recurring_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: financial_summary Users can create their own summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own summaries" ON public.financial_summary FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_balances Users can delete their own bank balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bank balances" ON public.bank_balances FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bill_adjustments Users can delete their own bill adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bill adjustments" ON public.bill_adjustments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: recurring_bills_instances Users can delete their own bill instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bill instances" ON public.recurring_bills_instances FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: business_units Users can delete their own business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own business units" ON public.business_units FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categories Users can delete their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: credit_card_charges Users can delete their own credit card charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own credit card charges" ON public.credit_card_charges FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: credit_cards Users can delete their own credit cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own credit cards" ON public.credit_cards FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: financial_items Users can delete their own financial items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own financial items" ON public.financial_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: financial_summary_income Users can delete their own income summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own income summaries" ON public.financial_summary_income FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: investment_categories Users can delete their own investment categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own investment categories" ON public.investment_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: investment_transactions Users can delete their own investment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own investment transactions" ON public.investment_transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: investments Users can delete their own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own investments" ON public.investments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: invoice_payments Users can delete their own invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own invoice payments" ON public.invoice_payments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: recurring_bills Users can delete their own recurring bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recurring bills" ON public.recurring_bills FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: recurring_templates Users can delete their own recurring templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recurring templates" ON public.recurring_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: financial_summary Users can delete their own summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own summaries" ON public.financial_summary FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: unit_categories Users can delete their own unit categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own unit categories" ON public.unit_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: unit_categories Users can insert their own unit categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own unit categories" ON public.unit_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bank_balances Users can update their own bank balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bank balances" ON public.bank_balances FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bill_adjustments Users can update their own bill adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bill adjustments" ON public.bill_adjustments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: recurring_bills_instances Users can update their own bill instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bill instances" ON public.recurring_bills_instances FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: business_units Users can update their own business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own business units" ON public.business_units FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: categories Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: credit_card_charges Users can update their own credit card charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own credit card charges" ON public.credit_card_charges FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: credit_cards Users can update their own credit cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own credit cards" ON public.credit_cards FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: financial_items Users can update their own financial items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own financial items" ON public.financial_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: financial_summary_income Users can update their own income summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own income summaries" ON public.financial_summary_income FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: investment_categories Users can update their own investment categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own investment categories" ON public.investment_categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: investment_transactions Users can update their own investment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own investment transactions" ON public.investment_transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: investments Users can update their own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own investments" ON public.investments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: invoice_payments Users can update their own invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own invoice payments" ON public.invoice_payments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: recurring_bills Users can update their own recurring bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recurring bills" ON public.recurring_bills FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: recurring_templates Users can update their own recurring templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recurring templates" ON public.recurring_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: financial_summary Users can update their own summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own summaries" ON public.financial_summary FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: unit_categories Users can update their own unit categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own unit categories" ON public.unit_categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bank_balances Users can view their own bank balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bank balances" ON public.bank_balances FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bill_adjustments Users can view their own bill adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bill adjustments" ON public.bill_adjustments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recurring_bills_instances Users can view their own bill instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bill instances" ON public.recurring_bills_instances FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_units Users can view their own business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own business units" ON public.business_units FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_card_charges Users can view their own credit card charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own credit card charges" ON public.credit_card_charges FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_cards Users can view their own credit cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own credit cards" ON public.credit_cards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: financial_items Users can view their own financial items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own financial items" ON public.financial_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: financial_summary_income Users can view their own income summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own income summaries" ON public.financial_summary_income FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: investment_categories Users can view their own investment categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own investment categories" ON public.investment_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: investment_transactions Users can view their own investment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own investment transactions" ON public.investment_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: investments Users can view their own investments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own investments" ON public.investments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoice_payments Users can view their own invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invoice payments" ON public.invoice_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recurring_bills Users can view their own recurring bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recurring bills" ON public.recurring_bills FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recurring_templates Users can view their own recurring templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recurring templates" ON public.recurring_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: financial_summary Users can view their own summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own summaries" ON public.financial_summary FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: unit_categories Users can view their own unit categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own unit categories" ON public.unit_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bank_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: business_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_card_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_card_charges ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_items ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_summary_income; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_summary_income ENABLE ROW LEVEL SECURITY;

--
-- Name: investment_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investment_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: investment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: investments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: não desligamento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."não desligamento" ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_bills_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_bills_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: unit_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unit_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict hxjY4tDPL0WMavgzgTNMOoQvALcY5Tukm3YX4ddot0ebjINE9Kfwp3XrBLUIdxt

