# 💰 DRE Pessoal - Versão Reconstruída

**App de controle financeiro pessoal 100% local, sem autenticação, sem Supabase.**

---

## ✅ O QUE FOI FEITO

### 🔥 Reconstrução Completa
- ✅ Removido: Supabase, Auth, Electron antigo, código desnecessário
- ✅ Novo banco: SQLite local via sql.js (roda no browser!)
- ✅ Importação automática: Seus 480 lançamentos + todas as tabelas
- ✅ Interface nova: Moderna, limpa, responsiva
- ✅ Zero dependências de nuvem

### 📊 Funcionalidades
1. **Lançamentos** - CRUD completo de entradas/saídas
   - Filtro por mês e unidade
   - Totalizadores automáticos
   - Categorias e bancos

2. **Contas Recorrentes** - Gerenciamento de contas fixas
   - Status pago/pendente por mês
   - Ajuste de valor mensal
   - Totalizadores

### 💾 Dados
- **480 lançamentos** importados
- **17 unidades de negócio** importadas
- **82 categorias** importadas
- **14 contas recorrentes** importadas
- Tudo salvo em SQLite local (localStorage do browser)

---

## 🚀 COMO USAR

### Iniciar o App
```bash
npm run dev
```

Abra: http://localhost:8080/

### Primeira Execução
- O app vai automaticamente importar todos os dados dos CSVs
- Aguarde ~10 segundos na tela de carregamento
- Pronto! Seus dados históricos estarão visíveis

### Uso Diário
1. Abra o app
2. Vá em **Lançamentos** para adicionar entradas/saídas
3. Vá em **Contas** para gerenciar contas recorrentes
4. Todos os dados são salvos automaticamente no browser

---

## 📂 Estrutura do Projeto

```
src/
├── services/
│   ├── database.ts       ← SQLite + localStorage
│   ├── import-data.ts    ← Importação dos CSVs
│   └── api.ts            ← APIs de lançamentos/contas
├── pages/
│   ├── Lancamentos.tsx   ← Página principal
│   └── Contas.tsx        ← Contas recorrentes
├── components/
│   ├── Layout.tsx        ← Header/navegação
│   └── ui/               ← shadcn components
└── App.tsx               ← Ponto de entrada

public/
└── backups/
    └── csv-files/        ← Dados históricos (importados na 1ª vez)
```

---

## 🔧 Tecnologias

- **React 18** + TypeScript
- **Vite** (dev server rápido)
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** (cache)
- **sql.js** (SQLite no browser)
- **localStorage** (persistência)

---

## 💾 Backup dos Dados

### Backups Existentes
Seus dados estão seguros em 3 locais:

1. **`backups/postgres-dump/`** - Dumps SQL do Supabase original
2. **`backups/csv-files/`** - 17 arquivos CSV (480+ registros)
3. **`backups/SEGURANCA-MAXIMA/`** - Cópias comprimidas

### Fazer Novo Backup
```bash
# Exportar dados do SQLite local
# (função ainda não implementada - dados estão no localStorage do browser)
```

**IMPORTANTE:** Copie a pasta `backups/` para um lugar seguro (Google Drive, pen drive, etc)

---

## 🐛 Problemas Conhecidos

### "Banco não inicializa"
- Limpe o localStorage do browser (DevTools → Application → Local Storage)
- Recarregue a página (vai importar tudo de novo)

### "Dados não aparecem"
- Verifique se os CSVs estão em `public/backups/csv-files/`
- Abra o console (F12) e procure por erros

### "Importação lenta"
- Normal na primeira vez (480 registros sendo importados)
- Das próximas vezes é instantâneo

---

## 🎯 Próximos Passos (Opcional)

### Para usar como app desktop (Electron)
1. Instalar Electron básico
2. Configurar build
3. Gerar .app para macOS

### Melhorias Futuras
- Dashboard com gráficos
- Exportar dados (CSV/JSON)
- Backup automático
- Temas claro/escuro
- Filtros avançados
- Relatórios por categoria/unidade

---

## 📝 Notas Importantes

### Dados Locais
- Tudo fica no localStorage do browser
- Máximo ~10MB (suficiente para anos de dados)
- Não sincroniza entre dispositivos
- Não precisa de internet

### Limitações Removidas
- ❌ Sem limite de requisições (não tem API)
- ❌ Sem custo de Supabase
- ❌ Sem necessidade de autenticação
- ❌ Sem complexidade de deploy

### Código Limpo
- ~3000 linhas (vs ~8000 antes)
- Zero dependências de nuvem
- Fácil de manter e evoluir
- Bem documentado

---

## 🆘 Suporte

**Problemas?** Abra o console do browser (F12) e procure erros.

**Dados perdidos?** Use os backups em `backups/csv-files/`

**Bugs?** O código está todo comentado e organizado para fácil debug.

---

**Feito com ❤️ em uma reconstrução completa do zero**
