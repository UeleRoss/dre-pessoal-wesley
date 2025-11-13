# 🎮 Como Usar o DRE Pessoal

## ⚡ Modo Rápido (Browser)

### 1. Iniciar
```bash
npm run dev
```

### 2. Abrir
http://localhost:8080/

**Pronto!** Seus dados históricos vão ser importados automaticamente na primeira vez.

---

## 🖥️ App Nativo (Mac)

### Rodar como app desktop

```bash
npm run app:dev
```

Isso vai:
1. Iniciar o Vite
2. Abrir uma janela nativa do Mac
3. Funcionar igual ao browser, mas como app

### Gerar .app instalável

```bash
npm run app:build
```

O .app vai estar em: `electron-dist/mac/DRE Pessoal.app`

Você pode:
- Arrastar para `/Applications`
- Abrir clicando 2x
- Usar sem terminal

---

## 📊 Uso Diário

### Adicionar Lançamento
1. Vá em **Lançamentos**
2. Clique em **Novo Lançamento**
3. Preencha: data, tipo (entrada/saída), descrição, valor
4. Clique em **Criar**

### Gerenciar Contas Recorrentes
1. Vá em **Contas**
2. Clique em **Nova Conta**
3. Preencha: nome, valor, dia de vencimento
4. No mês seguinte, marque como pago com o checkbox

### Filtrar por Mês
- Use o campo "Mês" no topo
- Selecione YYYY-MM
- Os lançamentos atualizam automaticamente

### Filtrar por Unidade
- Dropdown "Unidade" no topo
- Escolha uma unidade específica ou "Todas"

---

## 💾 Onde Ficam os Dados?

### No Browser
- localStorage do navegador
- `http://localhost:8080` → DevTools → Application → Local Storage

### No App Electron
- Também usa localStorage (mesmo comportamento)

### Backup
- Seus CSVs originais estão em: `public/backups/csv-files/`
- Se quiser recomeçar: limpe o localStorage e recarregue

---

## 🆘 Problemas?

### "Erro ao carregar"
- Recarregue a página (Cmd+R)
- Limpe localStorage e reimporte

### "Dados não aparecem"
- Abra o console (F12)
- Procure por mensagens de erro
- Verifique se os CSVs estão em `public/backups/csv-files/`

### "App Electron não abre"
- Rode `npm install` novamente
- Certifique-se que a porta 8080 não está em uso

---

## 🎯 Atalhos Úteis

**Browser:**
- `npm run dev` → Abrir no navegador
- `http://localhost:8080` → URL

**App:**
- `npm run app:dev` → Rodar app desktop
- `npm run app:build` → Gerar .app

---

## 📈 Dicas

1. **Filtre por mês** para ver gastos mensais
2. **Use unidades** para separar pessoal/trabalho/família
3. **Categorias** ajudam a ver onde você gasta mais
4. **Contas recorrentes** facilitam controle de gastos fixos

---

**Aproveite! 🎉**
