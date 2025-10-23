# Passo a Passo: Aplicar Migrations no Supabase

## Problema Detectado

O erro `relation "public.credit_cards" does not exist` indica que a migration base de cartões de crédito ainda não foi aplicada no seu banco Supabase.

---

## ✅ Solução: Aplicar Migrations na Ordem Correta

### Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto
4. No menu lateral, vá em **SQL Editor**

---

### Passo 2: Aplicar Migration Base (Criar Tabelas)

**Arquivo:** `supabase/migrations/20251014000005_recurring_expenses_and_credit_cards.sql`

1. Copie TODO o conteúdo deste arquivo
2. Cole no SQL Editor do Supabase
3. Clique em **Run** ou pressione `Ctrl+Enter`
4. Aguarde a execução (deve demorar alguns segundos)

**O que esta migration faz:**
- ✅ Cria tabela `credit_cards`
- ✅ Cria tabela `recurring_templates`
- ✅ Cria tabela `invoice_payments`
- ✅ Adiciona campos em `financial_items` (credit_card, is_recurring, etc.)
- ✅ Cria funções `generate_pending_recurring_expenses()` e `create_installment_purchase()`
- ✅ Cria view `credit_card_invoices`

**Verificação:**
```sql
-- Execute para verificar se deu certo:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('credit_cards', 'recurring_templates', 'invoice_payments');

-- Deve retornar as 3 tabelas
```

---

### Passo 3: Aplicar Migration de Correção (Opcional)

**Arquivo:** `supabase/migrations/20251016000009_fix_credit_card_invoices_view.sql`

Esta migration corrige a view de faturas. Aplique se quiser, mas não é obrigatória para a próxima etapa.

---

### Passo 4: Aplicar Migration de Card Type (NOVA!)

**Arquivo:** `supabase/migrations/20251023000001_add_card_type_and_purchase_date_safe.sql`

1. Copie TODO o conteúdo deste arquivo
2. Cole no SQL Editor do Supabase
3. Clique em **Run**
4. Observe as mensagens de log no console

**O que esta migration faz:**
- ✅ Verifica se as tabelas necessárias existem (proteção contra erro)
- ✅ Adiciona coluna `card_type` em `credit_cards`
- ✅ Adiciona coluna `purchase_date` em `financial_items`
- ✅ Atualiza a view `credit_card_invoices`
- ✅ Cria índices para performance
- ✅ Exibe mensagens de sucesso/erro

**Mensagens esperadas:**
```
NOTICE:  All required tables exist. Proceeding with migration...
NOTICE:  Column "card_type" added to credit_cards table
NOTICE:  Column "purchase_date" added to financial_items table
NOTICE:  ✅ Migration completed successfully!
NOTICE:  ✅ Column credit_cards.card_type: EXISTS
NOTICE:  ✅ Column financial_items.purchase_date: EXISTS
NOTICE:  ✅ View credit_card_invoices: EXISTS
```

---

### Passo 5: Verificar Estrutura Final

Execute este SQL para confirmar que tudo está OK:

```sql
-- 1. Verificar estrutura da tabela credit_cards
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'credit_cards'
ORDER BY ordinal_position;

-- Deve mostrar:
-- id, user_id, name, due_day, closing_day, credit_limit, color, card_type, is_active, created_at, updated_at

-- 2. Verificar estrutura da tabela financial_items (colunas de cartão)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'financial_items'
AND column_name IN ('credit_card', 'purchase_date', 'is_installment', 'is_recurring')
ORDER BY column_name;

-- Deve mostrar:
-- credit_card (text)
-- is_installment (boolean)
-- is_recurring (boolean)
-- purchase_date (date)

-- 3. Verificar view
SELECT * FROM credit_card_invoices LIMIT 1;

-- Se retornar dados (ou vazio sem erro), está OK!
```

---

## Ordem de Execução (Resumo)

```
1️⃣ 20251014000005_recurring_expenses_and_credit_cards.sql
   ↓ (cria tabelas base)

2️⃣ 20251023000001_add_card_type_and_purchase_date_safe.sql
   ↓ (adiciona card_type e purchase_date)

3️⃣ ✅ Pronto para usar!
```

---

## Troubleshooting

### Erro: "relation already exists"

**Solução:** Algumas tabelas já existem. Isso é OK, a migration tem `IF NOT EXISTS`.

---

### Erro: "column already exists"

**Solução:** A coluna já foi adicionada. Use a versão SAFE da migration que tem proteção.

---

### Erro: "permission denied"

**Solução:** Verifique se você está logado como o owner do projeto no Supabase.

---

### Erro: "function does not exist"

**Solução:** Você pulou a migration base. Volte ao Passo 2 e aplique a migration `20251014000005`.

---

## Após Aplicar as Migrations

### 1. Atualizar Cartões Existentes

Se você já tinha cartões cadastrados:

```sql
-- Ver cartões sem tipo definido
SELECT id, name, card_type
FROM credit_cards;

-- Atualizar C6 Bank para crédito
UPDATE credit_cards
SET card_type = 'credit'
WHERE name = 'C6 Bank';

-- Atualizar Conta Simples para pré-pago
UPDATE credit_cards
SET card_type = 'prepaid'
WHERE name = 'Conta Simples';
```

Ou faça pela interface:
1. Vá em Cartões de Crédito
2. Clique em editar (ícone de lápis)
3. Selecione o tipo
4. Salve

---

### 2. Testar a Aplicação

1. Abra o app (localhost:8080)
2. Vá em **Cartões de Crédito**
3. Clique em **"Novo Cartão"**
4. Veja se o campo de tipo aparece
5. Crie um cartão de teste
6. Veja se os badges aparecem (💵 Crédito / 💰 Pré-pago)

---

## Arquivos de Migration

### Caminho Local

```
/Users/wesleyrossa/Documents/projetos-pessoais/dre-pessoal-wesley/supabase/migrations/

├── 20251014000005_recurring_expenses_and_credit_cards.sql  (OBRIGATÓRIA)
└── 20251023000001_add_card_type_and_purchase_date_safe.sql (NOVA)
```

### Como Copiar

**Opção 1: Via Terminal**
```bash
cd /Users/wesleyrossa/Documents/projetos-pessoais/dre-pessoal-wesley

# Ver conteúdo da migration base
cat supabase/migrations/20251014000005_recurring_expenses_and_credit_cards.sql

# Ver conteúdo da migration nova
cat supabase/migrations/20251023000001_add_card_type_and_purchase_date_safe.sql
```

**Opção 2: Via VSCode**
1. Abra o arquivo na aba lateral
2. Selecione tudo (Cmd+A)
3. Copie (Cmd+C)
4. Cole no Supabase Dashboard

---

## Checklist Final

Após aplicar tudo, marque:

- [ ] Tabela `credit_cards` existe
- [ ] Tabela `recurring_templates` existe
- [ ] Tabela `invoice_payments` existe
- [ ] Coluna `credit_cards.card_type` existe
- [ ] Coluna `financial_items.purchase_date` existe
- [ ] View `credit_card_invoices` foi recriada
- [ ] App roda sem erros
- [ ] Modal de cartão mostra campo de tipo
- [ ] Cartões cadastrados mostram badge de tipo

---

## Precisa de Ajuda?

Se encontrar erros:

1. Copie a mensagem de erro completa
2. Verifique qual migration estava executando
3. Veja se pulou algum passo
4. Execute os SQLs de verificação acima

**Boa sorte!** 🚀
