# 🎯 COMECE AQUI - Migração Supabase → Local

## ⚡ Solução Rápida (Um comando!)

```bash
./scripts/migrate-to-local.sh
```

Esse script vai:
1. ✅ Baixar TODO o schema do Supabase (estrutura)
2. ✅ Baixar TODOS os dados do Supabase (lançamentos, contas, etc)
3. ✅ Criar banco SQLite local
4. ✅ Importar todos os dados
5. ✅ Deixar tudo pronto para usar

**Você vai precisar:**
- Senha do banco Supabase (pegue em: https://supabase.com/dashboard/project/fywrdmboiaqiopxqmywo/settings/database)

---

## 🎮 Depois da migração:

```bash
npm run electron:dev
```

Pronto! Seu DRE vai abrir com TODOS os seus dados!

---

## 📂 Onde ficam os arquivos:

```
backups/sql-dumps/        ← Backup SQL do Supabase
  ├── schema.sql          ← Estrutura das tabelas
  └── data.sql            ← Todos os seus dados

~/Library/Application Support/dre-pessoal/dre/
  └── dre.db              ← Banco SQLite local (seus dados!)
```

---

## 💾 Como fazer backup depois:

```bash
# Backup do banco local
npx tsx scripts/export-local-data.ts
```

---

## 🆘 Problemas?

### "Não tenho a senha do banco"
1. Vá em: https://supabase.com/dashboard/project/fywrdmboiaqiopxqmywo/settings/database
2. Clique em "Reset Database Password"
3. Copie a senha nova

### "O Supabase está vazio"
Se você já deletou os dados, o script vai funcionar mas não vai importar nada.
Nesse caso, só rode: `npm run electron:dev` e comece a usar!

### "Erro ao rodar o script"
Certifique-se de que tem permissão:
```bash
chmod +x scripts/migrate-to-local.sh
./scripts/migrate-to-local.sh
```

---

## 🎉 É isso!

Depois de rodar o script, você tem:
- ✅ Backup completo do Supabase
- ✅ Banco SQLite local funcionando
- ✅ App rodando 100% offline
- ✅ Todos os seus dados migrados
