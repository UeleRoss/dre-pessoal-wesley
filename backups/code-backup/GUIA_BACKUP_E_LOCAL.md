# 🛟 Guia: Backup do Supabase e Rodar Local

## ⚡ Versão Rápida (Copie e cole no terminal)

```bash
# 1. Fazer backup do Supabase
npx tsx scripts/backup-supabase.ts

# 2. Rodar o app localmente
npm run electron:dev

# 3. Em outro terminal, importar os dados (depois que o app abrir)
npx tsx scripts/import-backup.ts
```

---

## 📖 Versão Detalhada

### Passo 1: Fazer Backup do Supabase (NÃO PERCA SEUS DADOS!)

Execute no terminal:
```bash
npx tsx scripts/backup-supabase.ts
```

✨ **O que vai acontecer:**
- O script vai baixar TODOS os dados de TODAS as tabelas do Supabase
- Os dados vão ser salvos em `backups/YYYY-MM-DD/`
- Cada tabela terá 2 arquivos: `.json` e `.csv`

**IMPORTANTE:**
- ⚠️ Copie a pasta `backups/` para um lugar seguro (Google Drive, pen drive, etc)
- Você vai ter backup em 2 formatos diferentes para máxima segurança

---

### Passo 2: Rodar o App Localmente

Execute no terminal:
```bash
npm run electron:dev
```

✨ **O que vai acontecer:**
- Uma janela vai abrir com o seu app
- O app agora usa um banco SQLite local (não precisa de internet!)
- Você vai começar com o banco vazio (ainda não importamos os dados)

---

### Passo 3: Importar os Dados do Backup

**IMPORTANTE:** Mantenha o app rodando e abra um NOVO terminal.

No novo terminal, execute:
```bash
npx tsx scripts/import-backup.ts
```

✨ **O que vai acontecer:**
- O script vai pegar o backup mais recente
- Vai importar todos os dados para o SQLite
- Feche e abra o app de novo (Cmd+Q e depois `npm run electron:dev`)
- Agora você vai ver todos os seus dados!

---

### Passo 4: Parar o App

Para fechar o app:
- **Mac/Linux:** Aperte `Cmd+Q` ou feche a janela
- **Windows:** Aperte `Alt+F4` ou feche a janela

No terminal onde está rodando, aperte `Ctrl+C` para parar o servidor.

---

## 🆘 Problemas?

### "Erro ao conectar no Supabase"
- Isso é normal! O app agora roda 100% local, não precisa mais de internet

### "Não vejo meus dados antigos"
- Você precisa importar os dados do backup (vou criar o script de importação)

### "O app não abre"
- Verifique se rodou `npm install` antes
- Tente fechar e abrir de novo

---

## 📍 Onde ficam os dados locais?

O banco SQLite fica em:
- **Mac**: `~/Library/Application Support/dre-pessoal/dre/dre.db`
- **Windows**: `%APPDATA%/dre-pessoal/dre/dre.db`
- **Linux**: `~/.config/dre-pessoal/dre/dre.db`
