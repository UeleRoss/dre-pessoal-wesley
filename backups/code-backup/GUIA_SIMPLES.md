# 🚀 Guia Simples - Backup e Rodar Local

Você já está usando banco LOCAL (SQLite)! Não precisa mais do Supabase.

---

## ⚡ Como fazer backup dos seus dados

**1. Copie e cole no terminal:**

```bash
npx tsx scripts/export-local-data.ts
```

**Pronto!** Seus dados vão estar em `backups/YYYY-MM-DD/` em formato JSON e CSV.

**⚠️ IMPORTANTE:** Copie a pasta `backups/` para um lugar seguro (Google Drive, pen drive, etc)

---

## 🎮 Como rodar o app

**Copie e cole no terminal:**

```bash
npm run electron:dev
```

**Pronto!** O app vai abrir em uma janela.

**Para fechar:** Cmd+Q (Mac) ou Alt+F4 (Windows)

---

## 📊 Resumo do que você tem

✅ Banco de dados LOCAL (SQLite) - funciona sem internet
✅ Todos os dados salvos no seu computador
✅ Scripts para fazer backup em JSON e CSV

### Onde ficam os dados?

**Mac:** `~/Library/Application Support/dre-pessoal/dre/dre.db`

---

## 🆘 Dúvidas?

### "Erro: Banco de dados não encontrado"
→ Rode o app primeiro: `npm run electron:dev`

### "Como vejo meus dados?"
→ Abra o app: `npm run electron:dev`

### "Como faço backup?"
→ Execute: `npx tsx scripts/export-local-data.ts`

### "Preciso de internet?"
→ NÃO! Tudo funciona offline agora.

---

## 📅 Rotina sugerida

**Toda semana ou antes de mudanças grandes:**

```bash
npx tsx scripts/export-local-data.ts
```

Depois copie a pasta `backups/` para um lugar seguro.
