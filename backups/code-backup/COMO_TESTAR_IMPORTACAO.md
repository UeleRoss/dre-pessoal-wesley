# 🧪 Como Testar a Importação de PDF

## Pré-requisitos

1. **Migration aplicada**: Execute o SQL no Supabase
   ```sql
   -- Arquivo: supabase/migrations/20251016000008_add_import_fields_to_financial_items.sql
   ALTER TABLE public.financial_items
     ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
     ADD COLUMN IF NOT EXISTS imported_from text;

   CREATE INDEX IF NOT EXISTS idx_financial_items_needs_review
     ON public.financial_items(needs_review)
     WHERE needs_review = true;
   ```

2. **Servidor rodando**: `npm run dev`

## Teste 1: PDF do C6 Bank (sem senha)

### Preparar arquivo de teste
Use o PDF do extrato que você forneceu ou crie um PDF de teste com o seguinte formato:

```
Extrato exportado no dia 13 de outubro de 2025 às 20:46

WESLEY KRZYZANOVSKI ROSSA • 094.676.229-55
Agência: 1 • Conta: 227151569

Setembro 2025 (13/09/2025 - 30/09/2025)

Data         Data        Tipo           Descrição                                    Valor
lançamento   contábil

13/09        15/09       Saída PIX      Pix enviado para CARTO PAY LTDA             -R$ 40,99
15/09        15/09       Saída PIX      Pix enviado para DEMERGE BRASIL             -R$ 511,59
16/09        16/09       Entrada PIX    Pix recebido de RAPHAEL BONATTO             R$ 5.000,00
16/09        16/09       Entrada PIX    Pix recebido de Marcela Aparecida           R$ 405,00
```

### Passos
1. Acesse **Lançamentos Financeiros**
2. Clique em **"Importar PDF"**
3. Arraste o PDF ou clique para selecionar
4. Clique em **"Processar PDF"**
5. Verifique:
   - ✅ Mensagem: "PDF processado! X transações encontradas"
   - ✅ Preview mostra todas as transações
   - ✅ Banco identificado: "C6 Bank"
   - ✅ Sem duplicatas (primeira vez)

6. Clique em **"Importar X lançamentos"**
7. Verifique na lista:
   - ✅ Lançamentos aparecem com fundo amarelo
   - ✅ Badge "⚠️ Precisa Revisão" pulsando
   - ✅ Origem: "📄 PDF - C6 Bank"
   - ✅ Categoria: "Sem categoria"

## Teste 2: Detecção de Duplicatas

### Passos
1. **Importe o mesmo PDF novamente**
2. Clique em **"Processar PDF"**
3. Verifique:
   - ✅ Mensagem: "X transações novas, Y duplicatas ignoradas"
   - ✅ Alerta laranja: "Y duplicatas foram ignoradas automaticamente"
   - ✅ Seção expansível: "Ver Y duplicatas ignoradas"

4. **Expanda a seção de duplicatas**
5. Verifique:
   - ✅ Lista todas as duplicatas
   - ✅ Mostra % de similaridade
   - ✅ Exibe data e valor

6. **Confirme a importação**
7. Verifique:
   - ✅ Apenas transações novas foram importadas
   - ✅ Duplicatas não aparecem na lista

## Teste 3: PDF com Senha

### Criar PDF de teste com senha
Se não tiver um PDF protegido, você pode criar um:
- No macOS: Abra um PDF no Preview > Arquivo > Exportar > Marcar "Criptografar" > Defina senha
- Online: Use ferramentas como iLovePDF para adicionar senha

### Passos
1. Selecione o **PDF protegido**
2. Clique em **"Processar PDF"**
3. Verifique:
   - ✅ Mensagem de erro: "PDF protegido"
   - ✅ Campo de senha aparece com ícone 🔒
   - ✅ Botão muda para "Tentar com Senha"

4. **Digite a senha correta**
5. Clique em **"Tentar com Senha"**
6. Verifique:
   - ✅ PDF é processado normalmente
   - ✅ Transações aparecem no preview

### Teste de senha incorreta
1. Digite **senha errada**
2. Clique em **"Tentar com Senha"**
3. Verifique:
   - ✅ Mensagem: "Senha incorreta. Tente novamente"
   - ✅ Campo permanece visível
   - ✅ Pode tentar novamente

## Teste 4: Edição e Remoção da Flag

### Passos
1. Clique em **Editar** em um lançamento importado
2. Defina:
   - Categoria correta
   - Unidade de negócio
   - Ajuste descrição se necessário

3. Clique em **Salvar**
4. Verifique:
   - ✅ Badge "⚠️ Precisa Revisão" desaparece
   - ✅ Fundo amarelo é removido
   - ✅ Lançamento aparece normal
   - ✅ Origem "📄 PDF - C6 Bank" permanece (rastreabilidade)

## Teste 5: Duplicata Manual vs Importada

### Passos
1. **Crie um lançamento manual** com:
   - Mesma data do extrato
   - Mesmo valor
   - Descrição similar (ex: "PIX enviado para João" vs "Pix para João Silva")

2. **Importe o PDF novamente**
3. Verifique:
   - ✅ Sistema detecta como duplicata
   - ✅ Mostra % de similaridade
   - ✅ Não importa novamente

## Teste 6: Erros Comuns

### PDF escaneado (imagem)
1. Tente importar um PDF escaneado
2. Verifique:
   - ✅ Erro: "PDF vazio ou não foi possível extrair texto"
   - ✅ Sugestão de solução clara

### PDF de outro banco (não suportado)
1. Tente importar PDF de banco sem parser
2. Verifique:
   - ✅ Usa parser genérico
   - ✅ Pode não encontrar transações
   - ✅ Mensagem: "Formato de extrato não reconhecido"

## Checklist Final

### Funcionalidades
- [ ] Importa PDF do C6 Bank com sucesso
- [ ] Detecta e ignora duplicatas automaticamente
- [ ] Suporta PDFs protegidos com senha
- [ ] Valida senha incorreta
- [ ] Remove flag ao editar lançamento
- [ ] Mantém rastreabilidade da origem
- [ ] Preview mostra estatísticas corretas
- [ ] Indicadores visuais funcionam (amarelo, badge)

### Interface
- [ ] Drag & drop funciona
- [ ] Campo de senha aparece quando necessário
- [ ] Seção de duplicatas é expansível
- [ ] Mensagens de erro são claras
- [ ] Loading states funcionam
- [ ] Modal fecha corretamente

### Performance
- [ ] Processa PDF em tempo razoável (<5s)
- [ ] Detecção de duplicatas é rápida
- [ ] Build não tem erros
- [ ] Worker do PDF.js carrega corretamente

## Troubleshooting

### Erro: "Setting up fake worker failed"
**Solução**: Já foi corrigido! Agora usa worker local do node_modules.

### Duplicatas não são detectadas
**Verifique**:
- Data está no formato YYYY-MM-DD?
- Valor está como número (não string)?
- Similaridade da descrição ≥ 80%?

### PDF não processa
**Verifique**:
- É um PDF válido (não corrompido)?
- Tem texto selecionável (não é imagem)?
- Senha está correta (se protegido)?

## Console do Desenvolvedor

Mensagens úteis para debug:
```javascript
// Parsing bem-sucedido
"PDF processado! X transações encontradas"

// Duplicatas encontradas
"X transações novas, Y duplicatas ignoradas"

// Senha necessária
"PDF protegido" ou "Senha incorreta"

// Erro de processamento
"Erro ao processar PDF: [mensagem]"
```

## Próximos Testes

Após confirmar que tudo funciona:
1. Teste com extratos de meses diferentes
2. Teste com extratos maiores (100+ transações)
3. Teste performance com múltiplos PDFs
4. Teste em diferentes navegadores

---

**Sucesso!** 🎉 Se todos os testes passaram, a funcionalidade está pronta para uso!
