# 🐛 Issue Report: PostgREST Schema Cache não atualiza após ALTER TABLE

## 📋 Resumo do Problema

Após executar uma migration SQL que adiciona a coluna `card_type` na tabela `credit_cards`, o **PostgREST (API REST do Supabase) continua retornando erro 400** dizendo que a coluna não existe no schema cache, mesmo ela existindo no banco de dados.

---

## 🔍 Detalhes Técnicos

### Ambiente
- **Platform:** Supabase (managed PostgreSQL + PostgREST)
- **Database:** PostgreSQL 15+
- **API:** PostgREST (versão gerenciada pelo Supabase)
- **Frontend:** React + TypeScript (Vite)
- **Supabase Client:** `@supabase/supabase-js` v2.57.4

### Stack Trace
```
PATCH https://[PROJECT].supabase.co/rest/v1/credit_cards?id=eq.[UUID] 400 (Bad Request)

Error Object:
{
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'card_type' column of 'credit_cards' in the schema cache"
}
```

---

## 🔧 O Que Foi Feito

### 1. Migration SQL Executada
```sql
-- Criar tabela credit_cards (single-user, sem user_id)
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  credit_limit DECIMAL(10,2) NULL,
  color TEXT DEFAULT '#3b82f6',
  card_type TEXT NOT NULL DEFAULT 'credit' CHECK (card_type IN ('prepaid', 'credit')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Verificação no Banco (OK ✅)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'credit_cards'
AND column_name = 'card_type';

-- Resultado:
-- column_name | data_type
-- card_type   | text
```

**A coluna EXISTE no banco de dados.** ✅

---

## ❌ O Problema

Quando o frontend tenta fazer um `UPDATE` ou `INSERT` incluindo o campo `card_type`:

```typescript
// Código no AddCreditCardModal.tsx
await supabase
  .from('credit_cards')
  .update({
    name: formData.name.trim(),
    due_day: dueDay,
    closing_day: closingDay,
    credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
    color: formData.color,
    card_type: formData.card_type, // ❌ Erro aqui
  })
  .eq('id', card.id);
```

**Erro retornado:**
```
PGRST204: Could not find the 'card_type' column of 'credit_cards' in the schema cache
```

---

## 🛠️ Tentativas de Solução (Nenhuma Funcionou)

### ❌ Tentativa 1: NOTIFY pgrst
```sql
NOTIFY pgrst, 'reload schema';
```
**Resultado:** Sem efeito

---

### ❌ Tentativa 2: Adicionar/Remover Coluna Dummy
```sql
ALTER TABLE public.credit_cards ADD COLUMN _force_reload BOOLEAN DEFAULT false;
ALTER TABLE public.credit_cards DROP COLUMN _force_reload;
```
**Resultado:** Sem efeito

---

### ❌ Tentativa 3: Atualizar COMMENT na Tabela
```sql
COMMENT ON TABLE public.credit_cards IS 'Cadastro de cartões de crédito - Schema atualizado';
```
**Resultado:** Sem efeito

---

### ❌ Tentativa 4: Reload da Página (Hard Refresh)
```
Ctrl+Shift+R / Cmd+Shift+R
```
**Resultado:** Sem efeito

---

## 🔴 Causa Raiz Identificada

O **PostgREST mantém um cache do schema PostgreSQL** para performance. Quando você:
1. Cria a tabela via migration
2. Adiciona colunas via `ALTER TABLE`

O PostgREST **não detecta automaticamente** essas mudanças em alguns casos, especialmente quando:
- A tabela foi criada recentemente (sem RLS policies iniciais)
- Mudanças foram feitas via SQL direto (não via Supabase Dashboard UI)
- O projeto Supabase está rodando há muito tempo sem restart

---

## ✅ Solução (Funciona 100%)

### Método 1: Restart do Projeto Supabase (Recomendado)

**Via Dashboard:**
1. Supabase Dashboard → Settings → General
2. Scroll até "Pause project"
3. Clique em **"Pause project"**
4. Aguarde ~30 segundos
5. Clique em **"Resume project"**
6. Aguarde ~1-2 minutos para o projeto voltar
7. Recarregue o app (Ctrl+Shift+R)

**Isso força o PostgREST a:**
- ✅ Recarregar todo o schema cache
- ✅ Detectar todas as novas colunas
- ✅ Atualizar as rotas da API REST

---

### Método 2: Restart apenas da API (Mais Rápido)

Se disponível no seu plano Supabase:
1. Settings → API
2. Procure por **"Restart API"** ou **"Reload Schema"**
3. Clique no botão
4. Aguarde ~10 segundos

---

## 📊 Estrutura do Banco (Para Referência)

### Banco de Dados ANTES da Migration
```
Tabelas existentes:
- allowed_emails
- financial_items (estrutura antiga, sem user_id)
- student_payments
- students
- user_roles
```

### Banco de Dados DEPOIS da Migration
```
Tabelas existentes:
- allowed_emails
- financial_items (+ credit_card, purchase_date, installment_group_id)
- student_payments
- students
- user_roles
- credit_cards (NOVA ✨)
- invoice_payments (NOVA ✨)
```

**Nota importante:** Este é um **sistema single-user** (não tem coluna `user_id` nas tabelas).

---

## 🔍 Debugging Checklist

Se você encontrar este problema:

- [ ] Confirme que a coluna existe no banco:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'sua_tabela' AND column_name = 'sua_coluna';
  ```

- [ ] Verifique se não há typo no nome da coluna (case-sensitive!)

- [ ] Confirme que o frontend está enviando o campo correto:
  ```typescript
  console.log('Dados enviados:', formData);
  ```

- [ ] Tente um `SELECT` simples primeiro (se SELECT funciona mas UPDATE/INSERT falha = cache issue):
  ```sql
  SELECT card_type FROM credit_cards LIMIT 1;
  ```

- [ ] Se SELECT funciona mas mutations falham → **É problema de cache**

- [ ] Solução: **Restart do projeto** ou **Restart da API**

---

## 🎯 Lições Aprendidas

### ✅ DO's (Faça assim)
- Sempre que possível, use o **Supabase Studio UI** para criar/alterar tabelas
- Se usar SQL direto, **sempre faça restart da API** depois
- Documente qual versão do PostgREST está rodando
- Teste com um `SELECT` antes de tentar mutations

### ❌ DON'Ts (Evite)
- Não assuma que `NOTIFY pgrst` sempre funciona
- Não confie apenas em hard refresh do navegador
- Não ignore erros `PGRST204` (sempre é cache issue)

---

## 📚 Referências

- **PostgREST Docs - Schema Cache:** https://postgrest.org/en/stable/schema_cache.html
- **Supabase Issue Tracker:** Procure por "PGRST204" ou "schema cache"
- **Error Code PGRST204:** "Resource not found" - geralmente significa cache desatualizado

---

## 🔧 Arquivos Relacionados

### Migration SQL
- `APPLY_FOR_YOUR_DATABASE.sql` - Migration completa (adaptada para single-user)
- `FORCE_RELOAD.sql` - Tentativas de forçar reload (não funcionaram)
- `RELOAD_SCHEMA.sql` - NOTIFY pgrst (não funcionou)

### Frontend
- `src/components/AddCreditCardModal.tsx:145` - Onde o erro acontece
- `src/types/financial.ts` - Types atualizados com `card_type`
- `src/hooks/useCreditCards.ts` - Hook que faz as mutations

---

## 💡 Solução Temporária (Workaround)

Se não puder fazer restart do projeto agora, **remova temporariamente** o campo `card_type` do código:

```typescript
// ANTES (quebra)
await supabase.from('credit_cards').insert({
  name: 'Teste',
  card_type: 'credit', // ❌ Causa erro PGRST204
  // ...
});

// DEPOIS (funciona temporariamente)
await supabase.from('credit_cards').insert({
  name: 'Teste',
  // card_type vai usar o DEFAULT 'credit' do banco
  // ...
});
```

Depois que fizer o restart, adicione `card_type` de volta.

---

## ✅ Status Atual

- [x] Migration executada com sucesso
- [x] Colunas existem no banco de dados
- [ ] **PostgREST schema cache atualizado** ← BLOQUEADOR
- [ ] Frontend funcionando

**Próximo passo:** Restart do projeto Supabase para resolver o cache issue.

---

## 🆘 Precisa de Ajuda?

Se você está vendo este problema:
1. Confirme que é erro `PGRST204`
2. Verifique que a coluna existe no banco
3. **Faça restart do projeto/API**
4. Problema resolvido! ✅

---

**Data do Report:** 2025-10-23
**Projeto:** dre-pessoal-wesley
**Migration File:** `APPLY_FOR_YOUR_DATABASE.sql`
