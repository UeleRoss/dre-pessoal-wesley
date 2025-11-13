# 📄 Importação de Extrato Bancário via PDF

## Funcionalidade Implementada

Esta funcionalidade permite importar extratos bancários em formato PDF, extraindo automaticamente as transações e criando lançamentos no sistema. Os lançamentos importados são marcados como "Precisa Revisão" para que você possa categorizá-los posteriormente.

**Recursos avançados:**
- ✅ **Suporte para PDFs protegidos com senha**
- ✅ **Detecção automática de duplicatas**
- ✅ **Preview antes da importação**
- ✅ **Rastreabilidade da origem**

## Como Usar

### 1. Acessar a Importação
- Vá para a tela de **Lançamentos Financeiros**
- Clique no botão **"Importar PDF"** no cabeçalho da página

### 2. Selecionar o PDF
- Arraste e solte o arquivo PDF do extrato bancário
- Ou clique para selecionar o arquivo do seu computador

### 3. Senha do PDF (se necessário)
- Se o PDF estiver protegido com senha:
  - O sistema detectará automaticamente
  - Um campo de senha aparecerá
  - Digite a senha e clique em **"Tentar com Senha"**
- ⚠️ Caso a senha esteja incorreta, você poderá tentar novamente

### 4. Processamento e Detecção de Duplicatas
- Clique em **"Processar PDF"**
- O sistema irá:
  - Extrair todas as transações do PDF
  - Comparar com lançamentos existentes (últimos 90 dias)
  - Detectar duplicatas automaticamente
  - Mostrar apenas transações novas

**Critérios de Duplicata:**
- ✅ Mesma data de transação
- ✅ Mesmo valor (exato)
- ✅ Descrição similar (>80% de similaridade)
- ✅ Mesmo tipo (entrada/saída)

### 5. Revisar Preview e Selecionar Transações
- O sistema mostrará:
  - Número de transações novas
  - Número de duplicatas ignoradas (se houver)
  - Lista de todas as transações novas com **checkbox**
  - Expandível: lista de duplicatas ignoradas com % de similaridade

- **Todas as transações são selecionadas por padrão**

**Botões de seleção disponíveis:**
- 🔘 **Selecionar Todos**: Marca todas as transações
- 📅 **Selecionar Mês Atual**: Marca apenas transações do mês corrente
- ⭕ **Desmarcar Todos**: Remove todas as seleções
- 📊 Badge mostra: "X de Y selecionadas"

**Seleção individual:**
- Clique no **checkbox** de cada transação para marcar/desmarcar
- Transações selecionadas ficam com fundo azul claro
- Clique na transação inteira também funciona

### 6. Confirmar Importação
- Clique em **"Importar X lançamentos"**
  - O botão mostra quantas transações estão selecionadas
  - Fica desabilitado se nenhuma transação estiver selecionada
- Apenas transações **selecionadas** serão importadas
- Duplicatas são automaticamente ignoradas
- As transações serão criadas com:
  - ⚠️ Badge "Precisa Revisão" (amarelo pulsante)
  - Categoria: "Sem categoria"
  - Unidade de negócio: não definida
  - Origem: "PDF - [Nome do Banco]"

### 7. Revisar e Categorizar
- Após a importação, os lançamentos aparecerão destacados em **amarelo**
- Clique em **Editar** em cada lançamento para:
  - Definir a categoria correta
  - Atribuir a unidade de negócio
  - Ajustar a descrição se necessário
  - Ao salvar, o badge "Precisa Revisão" será removido automaticamente

## Bancos Suportados

### ✅ Totalmente Suportado
- **C6 Bank**: Parser específico para o formato de extrato

### 🔄 Suporte Genérico
Outros bancos usam um parser genérico que tenta identificar padrões comuns. Resultados podem variar.

Para adicionar suporte específico a um banco:
1. Edite `/src/services/pdfParser.ts`
2. Adicione o padrão de identificação em `identifyBank()`
3. Crie uma função parser específica (ex: `parseNubankExtract()`)

## Estrutura do Extrato C6 Bank

O parser reconhece o seguinte formato:

```
DD/MM DD/MM Tipo Descrição ±R$ valor
13/09 15/09 Saída PIX Pix enviado para EMPRESA R$ -40,99
16/09 16/09 Entrada PIX Pix recebido de NOME R$ 5.000,00
```

## Campos Importados

| Campo | Origem | Editável Depois |
|-------|--------|-----------------|
| Data | Extrato PDF | ✅ Sim |
| Tipo | Detectado automaticamente | ✅ Sim |
| Valor | Extrato PDF | ✅ Sim |
| Descrição | Extrato PDF | ✅ Sim |
| Categoria | "Sem categoria" | ⚠️ **Deve ser definido** |
| Unidade de Negócio | null | ⚠️ **Deve ser definido** |
| Banco | Nome detectado | ✅ Sim |
| Precisa Revisão | true | ✅ Removido ao editar |

## Detecção de Duplicatas

### Como Funciona
O sistema busca lançamentos existentes nos últimos **90 dias** e compara:

1. **Data**: Deve ser exatamente a mesma
2. **Valor**: Deve ser exatamente o mesmo (diferença máxima de R$ 0,01)
3. **Tipo**: Entrada ou saída deve coincidir
4. **Descrição**: Calcula similaridade usando algoritmo de Levenshtein
   - Similaridade ≥ 80% = considerado duplicata
   - Ignora acentos, pontuação e diferenças de capitalização

### Exemplos

#### ✅ Detectado como Duplicata
- **Existente**: "PIX enviado para Joao Silva" - R$ 150,00 - 15/10/2025
- **Novo**: "Pix enviado para João Silva" - R$ 150,00 - 15/10/2025
- **Similaridade**: 95% → Duplicata ignorada

#### ❌ Não é Duplicata
- **Existente**: "Compra Supermercado" - R$ 200,00 - 15/10/2025
- **Novo**: "Compra Farmácia" - R$ 200,00 - 15/10/2025
- **Similaridade**: 45% → Importado normalmente

### Visualização
- Duplicatas são mostradas em seção expansível
- Exibe porcentagem de similaridade
- Possibilita revisão manual se necessário

## PDFs Protegidos com Senha

### Detecção Automática
- O sistema identifica PDFs com senha automaticamente
- Exibe mensagem clara ao usuário
- Campo de senha aparece dinamicamente

### Processo
1. Selecione o PDF protegido
2. Clique em "Processar PDF"
3. Sistema detecta proteção
4. Campo de senha aparece
5. Digite a senha
6. Clique em "Tentar com Senha"

### Erros Comuns
- **Senha incorreta**: Permite tentar novamente
- **PDF corrompido**: Mensagem de erro clara

## Filtros

Para facilitar a revisão, você pode:
- Ordenar lançamentos por data
- Filtrar por tipo (Entrada/Saída)
- Os lançamentos importados têm destaque visual (fundo amarelo)

## Indicadores Visuais

### Badge "Precisa Revisão"
- Cor: Amarelo com ícone ⚠️
- Aparece ao lado do tipo de lançamento
- Pulsa para chamar atenção
- Removido automaticamente ao salvar edições

### Origem da Importação
- Exibido no rodapé do lançamento
- Formato: 📄 PDF - [Nome do Banco]
- Mantido mesmo após revisão para rastreabilidade

## Banco de Dados

### Campos Adicionados à Tabela `financial_items`

```sql
needs_review BOOLEAN DEFAULT false
imported_from TEXT
```

### Migration
- Arquivo: `/supabase/migrations/20251016000008_add_import_fields_to_financial_items.sql`
- Aplique antes de usar a funcionalidade

## Erros Comuns

### "PDF vazio ou não foi possível extrair texto"
- **Causa**: PDF escaneado como imagem (sem texto selecionável)
- **Solução**: Use um PDF com texto selecionável ou aplique OCR

### "Este PDF está protegido com senha"
- **Causa**: PDF protegido
- **Solução**: Digite a senha no campo que aparecerá

### "Senha incorreta. Tente novamente"
- **Causa**: Senha digitada está incorreta
- **Solução**: Verifique a senha e tente novamente

### "Nenhuma transação encontrada no PDF"
- **Causa**: Formato não reconhecido
- **Solução**: Verifique se o banco é suportado ou use entrada manual

### "Formato de extrato não reconhecido"
- **Causa**: Banco sem parser específico
- **Solução**: Contribua adicionando suporte ao seu banco!

## Arquivos da Implementação

### Novos
- `src/services/pdfParser.ts` - Parser de PDF com suporte a senha
- `src/services/duplicateDetector.ts` - Detecção de duplicatas
- `src/components/PDFImportModal.tsx` - Modal de importação
- `supabase/migrations/20251016000008_add_import_fields_to_financial_items.sql` - Migration

### Modificados
- `src/types/financial.ts` - Novos campos na interface
- `src/components/FinancialItemRow.tsx` - Indicadores visuais
- `src/components/EditEntryModal.tsx` - Remove flag ao salvar
- `src/components/LancamentosHeader.tsx` - Botão de importação
- `src/components/lancamentos/*` - Integração do modal

## Próximos Passos

- [ ] Adicionar suporte para Nubank
- [ ] Adicionar suporte para Banco do Brasil
- [ ] Adicionar suporte para Itaú
- [ ] Permitir ajustar transações antes de importar
- [x] ✅ Detectar duplicatas (mesma data, valor e descrição)
- [x] ✅ Suporte para PDFs com senha
- [ ] Exportar transações não importadas
- [ ] Importar múltiplos PDFs de uma vez

## Contribuindo

Para adicionar suporte a um novo banco:
1. Obtenha um PDF de exemplo do extrato
2. Identifique o padrão de formatação
3. Crie uma função parser em `/src/services/pdfParser.ts`
4. Teste com múltiplos extratos
5. Documente aqui

---

**Desenvolvido com ❤️ para facilitar seu controle financeiro**
