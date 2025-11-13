# 📋 PRD - DRE Pessoal (Versão Limpa)

## 🎯 Objetivo

App desktop simples para controle financeiro pessoal, 100% local, sem autenticação, focado em lançamentos e contas recorrentes.

---

## 👤 Usuário

- Wesley (uso pessoal)
- Acesso direto sem login
- Dados locais no computador

---

## ✨ Funcionalidades Essenciais

### 1. **Lançamentos Financeiros** (Prioridade: CRÍTICA)

**Tela:** `/lancamentos`

**Visualização:**
- Lista de lançamentos do mês selecionado
- Filtro por mês (seletor YYYY-MM)
- Filtro por unidade de negócio
- Totalizadores: Entradas, Saídas, Saldo
- Cores: Verde (entrada), Vermelho (saída)

**Campos de um lançamento:**
- Data (obrigatório)
- Tipo: Entrada ou Saída (obrigatório)
- Descrição (obrigatório)
- Valor (obrigatório)
- Categoria (opcional)
- Banco/Conta (opcional)
- Unidade de Negócio (obrigatório)
- Parcelamento: sim/não, quantidade de parcelas
- Recorrente: sim/não

**Ações:**
- ✅ Criar lançamento
- ✅ Editar lançamento
- ✅ Deletar lançamento
- ✅ Exportar CSV

**Regras de negócio:**
- Parcelamento gera múltiplos lançamentos automaticamente
- Recorrente não implementado na v1 (futuro)

---

### 2. **Contas Recorrentes** (Prioridade: ALTA)

**Tela:** `/contas`

**Visualização:**
- Lista de contas recorrentes cadastradas
- Status por mês: Pago / Pendente
- Filtro por mês
- Totalizadores: Total, Pago, Pendente

**Campos de uma conta:**
- Nome (obrigatório)
- Valor base (obrigatório)
- Dia de vencimento (1-31)
- Categoria (opcional)
- Banco/Conta (opcional)

**Ações:**
- ✅ Criar conta recorrente
- ✅ Editar conta
- ✅ Deletar conta
- ✅ Marcar como pago no mês
- ✅ Ajustar valor no mês específico
- ✅ Exportar CSV

**Regras de negócio:**
- Cada conta tem instâncias mensais
- Pode ajustar valor específico de um mês sem alterar a conta base

---

### 3. **Unidades de Negócio** (Prioridade: MÉDIA)

**Função:**
- Separar lançamentos por área/projeto/pessoa
- Ex: "Wesley Pessoal", "Empresa X", "Filhos"

**Dados:**
- Nome
- Cor (visual)
- Ícone (opcional)

**Categorias por Unidade:**
- Cada unidade tem suas próprias categorias
- Ex: Unidade "Filhos" → categorias "Escola", "Saúde", "Alimentação"

---

### 4. **Dashboard/Home** (Prioridade: BAIXA - v2)

- Resumo do mês atual
- Gráficos simples (opcional)
- Atalhos rápidos

---

## 🗄️ Modelo de Dados

### Tabela: `financial_items`
```
id (PK)
date (DATE)
type (entrada|saida)
description (TEXT)
amount (DECIMAL)
category (TEXT nullable)
bank (TEXT nullable)
business_unit_id (FK nullable)
is_installment (BOOLEAN default false)
total_installments (INT nullable)
installment_number (INT nullable)
installment_group_id (TEXT nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabela: `recurring_bills`
```
id (PK)
name (TEXT)
value (DECIMAL)
due_date (INT 1-31)
category (TEXT nullable)
bank (TEXT nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabela: `recurring_bills_instances`
```
id (PK)
bill_id (FK)
month_reference (TEXT YYYY-MM-DD)
adjusted_value (DECIMAL nullable)
is_paid (BOOLEAN default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabela: `business_units`
```
id (PK)
name (TEXT)
color (TEXT nullable)
icon (TEXT nullable)
created_at (TIMESTAMP)
```

### Tabela: `unit_categories`
```
id (PK)
business_unit_id (FK)
type (entrada|saida)
name (TEXT)
created_at (TIMESTAMP)
```

### Tabela: `categories` (legacy - mesclar com unit_categories)
```
id (PK)
name (TEXT)
created_at (TIMESTAMP)
```

### Tabela: `bank_balances` (legacy - usar se necessário)
```
id (PK)
bank_name (TEXT)
initial_balance (DECIMAL)
baseline_date (DATE)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

## 🎨 UI/UX

**Design:**
- Moderno, limpo, espaçoso
- Cores: Tema claro/escuro (opcional)
- Componentes: shadcn/ui (Tailwind)

**Navegação:**
- Menu lateral ou top bar
- Links: Lançamentos, Contas

**Formulários:**
- Modal/Dialog para criar/editar
- Validação inline
- Feedback visual (toast)

---

## 🛠️ Stack Técnica

**Frontend:**
- React 18 + TypeScript
- Vite (dev server)
- Tailwind CSS + shadcn/ui
- TanStack Query (cache/state)

**Banco de Dados:**
- SQLite local via sql.js (roda no browser)
- OU better-sqlite3 (via Electron)

**Desktop:**
- Electron (app nativo macOS)
- `npm run dev` → desenvolvimento
- `npm run build` → gera .app

**Sem:**
- ❌ Autenticação
- ❌ Backend/API
- ❌ Supabase
- ❌ Cloud

---

## 📦 Migração de Dados

**Fonte:** CSVs em `backups/csv-files/`

**Importar:**
1. `financial_items.csv` → 480 registros
2. `recurring_bills.csv` → 14 contas
3. `business_units.csv` → 17 unidades
4. `unit_categories.csv` → 82 categorias
5. `bank_balances.csv` → 8 bancos (opcional)

**Script:** `scripts/import-historical-data.ts`

---

## 🚀 Roadmap

### v1.0 (MVP - Esta reconstrução)
- ✅ Lançamentos CRUD
- ✅ Contas recorrentes CRUD
- ✅ Filtros por mês
- ✅ Unidades de negócio
- ✅ Importação dos dados históricos
- ✅ Electron app

### v1.1 (Futuro)
- Dashboard com gráficos
- Recorrência automática de lançamentos
- Backup/restore
- Sincronização com outro dispositivo (opcional)

---

## 📊 Métricas de Sucesso

- ✅ App abre em < 3 segundos
- ✅ Todos os 480 lançamentos visíveis
- ✅ CRUD completo funcionando
- ✅ Zero bugs críticos
- ✅ Wesley consegue usar diariamente

---

## 🔐 Segurança

- Dados locais apenas
- Sem envio para internet
- Backup manual recomendado
