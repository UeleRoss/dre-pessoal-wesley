# Guia de Uso: Gestão de Cartões de Crédito

## Melhorias Implementadas

Este guia explica as melhorias feitas no sistema de gestão de cartões de crédito para resolver a confusão entre **data da compra** e **data de pagamento da fatura**.

---

## 1. Diferenciação de Tipos de Cartão

### Cartão de Crédito
- **Quando usar:** C6 Bank (seu cartão pessoal)
- **Comportamento:** As compras não afetam o saldo imediatamente
- **Impacto financeiro:** Só desconta quando você marca a fatura como paga
- **Exemplo:** Compra de R$ 100 hoje → Aparece na próxima fatura → Só desconta quando pagar

### Cartão Pré-pago
- **Quando usar:** Conta Simples (empresa)
- **Comportamento:** Desconta o saldo imediatamente ao registrar
- **Impacto financeiro:** Afeta o saldo na hora
- **Exemplo:** Compra de R$ 100 hoje → Desconta R$ 100 do saldo agora

---

## 2. Como Cadastrar um Cartão

1. Acesse **Cartões de Crédito**
2. Clique em **"Novo Cartão"**
3. Preencha:
   - **Nome:** Ex: "C6 Bank Wesley"
   - **Tipo:**
     - ✅ Crédito (para C6 Bank)
     - Pré-pago (para Conta Simples)
   - **Dia de Vencimento:** Ex: 7 (quando você paga a fatura)
   - **Dia de Fechamento:** Ex: 31 (quando a fatura fecha)
   - **Limite:** Opcional
   - **Cor:** Escolha uma cor para identificação visual

---

## 3. Como o Sistema Calcula as Faturas

### Lógica de Fechamento

A função helper `calculateInvoiceReferenceMonth()` foi criada em `src/utils/creditCardUtils.ts` para calcular automaticamente:

**Regra:**
- **Compra ATÉ o dia de fechamento** → Vai para a fatura do **mês atual**
- **Compra APÓS o dia de fechamento** → Vai para a fatura do **próximo mês**

### Exemplos (C6 Bank - Fechamento dia 7, Vencimento dia 7)

| Data da Compra | Fechamento | Fatura de Referência | Vencimento |
|----------------|------------|----------------------|------------|
| 05/Out/2025 | Dia 7 | Outubro/2025 | 07/Nov/2025 |
| 10/Out/2025 | Dia 7 | Novembro/2025 | 07/Dez/2025 |
| 31/Out/2025 | Dia 7 | Novembro/2025 | 07/Dez/2025 |
| 01/Nov/2025 | Dia 7 | Novembro/2025 | 07/Dez/2025 |

---

## 4. Registrando Compras

### Campos Importantes

Quando você registrar uma compra com cartão de crédito:

1. **Data da Compra (purchase_date):** Data real quando você comprou
2. **Data do Lançamento (date):** Calculada automaticamente - mês da fatura
3. **Cartão:** Selecione o cartão (ex: C6 Bank)
4. **Valor e Descrição:** Como antes

### O que o sistema faz automaticamente:

```
Você compra em: 15/Outubro/2025
Fechamento do C6: dia 7
→ Sistema calcula: Fatura de Novembro/2025
→ Vencimento: 07/Dezembro/2025
→ Você verá na interface: "Esta compra vai para a fatura de Novembro/2025"
```

---

## 5. Compras Parceladas

### Melhorias Visuais

- ✅ Ícone de calendário ao lado de compras parceladas
- ✅ Badge mostrando "3/12" (parcela 3 de 12)
- ✅ Contador no resumo da fatura

### Como funcionam as parcelas

- Cada parcela é um lançamento separado
- Todas têm o mesmo `installment_group_id`
- Descrição automática: "Netflix (1/12)", "Netflix (2/12)", etc.
- Cada parcela cai em um mês diferente

---

## 6. Compras Recorrentes

### Identificação Visual

- ✅ Ícone de repeat (↻) ao lado
- ✅ Badge "Recorrente" em roxo
- ✅ Contador separado no resumo da fatura

### Exemplo

Assinatura do Spotify de R$ 30/mês:
- Template criado uma vez
- Todo mês gera automaticamente na fatura
- Status: Pendente → Você aprova → Incluído na fatura

---

## 7. Visualização das Faturas

### Card da Fatura

Agora exibe:

```
┌─────────────────────────────────────┐
│ 💳 C6 Bank    [💵 Crédito]          │
│ 📅 Outubro de 2025        [❌ Pendente] │
├─────────────────────────────────────┤
│ Valor Total: R$ 1.134,58            │
├─────────────────────────────────────┤
│ 📋 Total: 10  ↻ Recorrentes: 9  📅 Parceladas: 0 │
├─────────────────────────────────────┤
│ Vencimento: Dia 7 de cada mês       │
├─────────────────────────────────────┤
│ [👁️ Ver Detalhes] [✅ Marcar como Paga] │
└─────────────────────────────────────┘
```

### Badges de Status

- **💵 Crédito:** Cartão de crédito (paga depois)
- **💰 Pré-pago:** Cartão pré-pago (desconta na hora)
- **✅ Paga:** Fatura já paga
- **❌ Pendente:** Aguardando pagamento

---

## 8. Fluxo Completo (Exemplo Real)

### Cenário: Compra no C6 Bank

1. **Você compra no Supermercado**
   - Data: 15/Outubro/2025
   - Valor: R$ 200,00
   - Cartão: C6 Bank (Fechamento dia 7)

2. **Sistema calcula automaticamente**
   - Compra foi dia 15 (após o fechamento do dia 7)
   - Logo, vai para fatura de **Novembro/2025**
   - Vencimento: **07/Dezembro/2025**

3. **Seu saldo NÃO muda**
   - Porque é cartão de crédito
   - Só vai mudar quando você pagar a fatura

4. **Você visualiza**
   - Em "Cartões de Crédito" → Fatura de Novembro
   - Vê o item "Supermercado" listado
   - Total da fatura atualizado

5. **Quando a fatura vence (07/Dez)**
   - Você clica "Marcar como Paga"
   - Sistema registra pagamento
   - **AGORA SIM** desconta do seu saldo

---

## 9. Saldo Disponível vs Comprometido

### Dashboard Financeiro

**Saldo Disponível:**
- Dinheiro que você tem AGORA
- Não inclui faturas pendentes de crédito

**Saldo Comprometido:** (nova feature)
- Soma de todas as faturas de crédito pendentes
- Mostra quanto você já gastou mas ainda vai pagar
- Ajuda a não gastar dinheiro que já está comprometido

### Exemplo

```
Saldo em conta: R$ 5.000,00
Faturas pendentes:
  - C6 Bank Nov/2025: R$ 1.134,58
  - C6 Bank Dez/2025: R$ 800,00

Saldo Disponível: R$ 5.000,00
Comprometido: R$ 1.934,58
Saldo Livre Real: R$ 3.065,42
```

---

## 10. Passos para Implementação

### 1. Aplicar a Migration no Supabase

A migration foi criada em:
```
supabase/migrations/20251023000001_add_card_type_and_purchase_date.sql
```

**Como aplicar:**

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo da migration
4. Execute o SQL
5. Verifique se as colunas foram criadas:
   - `credit_cards.card_type`
   - `financial_items.purchase_date`

### 2. Atualizar seus Cartões Existentes

Após aplicar a migration:

1. Vá em **Cartões de Crédito**
2. Edite cada cartão
3. Defina o tipo:
   - **C6 Bank:** Crédito
   - **Conta Simples:** Pré-pago
4. Salve

### 3. Verificar a View

A view `credit_card_invoices` foi recriada para incluir `card_type`.
Teste com:

```sql
SELECT * FROM credit_card_invoices
WHERE user_id = 'seu-user-id'
LIMIT 5;
```

---

## 11. Utilitários Disponíveis

### Funções Helper (`src/utils/creditCardUtils.ts`)

```typescript
import { calculateInvoiceReferenceMonth, getInvoiceInfo } from '@/utils/creditCardUtils';

// Calcular mês da fatura
const referenceMonth = calculateInvoiceReferenceMonth('2025-10-15', 7);
// retorna: '2025-11-01'

// Informações completas
const info = getInvoiceInfo('2025-10-15', 7, 7);
// retorna: {
//   referenceMonth: '2025-11-01',
//   dueDate: '2025-12-07',
//   invoiceMonth: 'novembro de 2025',
//   dueDateFormatted: '07/12/2025'
// }
```

---

## 12. Próximos Passos (Opcional)

### Melhorias Futuras Sugeridas

1. **Preview automático ao criar lançamento**
   - Mostrar "Esta compra vai para a fatura de X" no formulário
   - Implementar em `LancamentosContainer.tsx`

2. **Indicador visual de saldo comprometido**
   - Card no Dashboard mostrando total comprometido
   - Gráfico de evolução de gastos com cartão

3. **Alertas de vencimento**
   - Notificação 3 dias antes do vencimento
   - Badge "Vence em X dias"

4. **Relatórios de cartão**
   - Histórico de gastos por categoria
   - Comparativo mês a mês
   - Média de gastos

---

## 13. Resumo das Mudanças

### Banco de Dados
- ✅ Adicionado `credit_cards.card_type` (prepaid | credit)
- ✅ Adicionado `financial_items.purchase_date`
- ✅ Atualizada view `credit_card_invoices`
- ✅ Índices criados para performance

### TypeScript
- ✅ Types atualizados em `src/types/financial.ts`
- ✅ `CreditCard` interface com `card_type`
- ✅ `FinancialItem` interface com `purchase_date`
- ✅ `CreditCardInvoice` interface estendida

### Componentes
- ✅ `AddCreditCardModal.tsx` - Campo de tipo de cartão
- ✅ `InvoiceCard.tsx` - Badges visuais de tipo e parcelas
- ✅ Ícones melhorados para recorrentes e parceladas

### Utilitários
- ✅ `src/utils/creditCardUtils.ts` - Funções de cálculo de fatura

---

## 14. Perguntas Frequentes

**P: E se eu mudar o dia de fechamento do cartão?**
R: Atualize o cartão no sistema. Os lançamentos futuros usarão o novo dia de fechamento.

**P: Como corrigir um lançamento que foi para a fatura errada?**
R: Edite o lançamento e ajuste a data. O sistema recalculará automaticamente.

**P: Posso ter mais de um cartão de crédito?**
R: Sim! Cadastre quantos quiser. Cada um terá suas próprias faturas.

**P: O que acontece se eu esquecer de marcar uma fatura como paga?**
R: O saldo não será afetado até você marcar. Você pode marcar faturas antigas a qualquer momento.

**P: Como vejo todas as parcelas de uma compra parcelada?**
R: No modal de detalhes da fatura, procure pelo `installment_group_id` ou filtre por descrição.

---

## Suporte

Para dúvidas ou problemas, verifique:
1. Este guia
2. Os comentários no código
3. A migration SQL para entender a estrutura

**Bom uso do sistema!** 🎉
