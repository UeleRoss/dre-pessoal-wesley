# Manual de Migração Offline (Supabase → SQLite + Electron)

Este guia descreve como repetir a transição feita neste projeto: sair do Supabase, migrar dados para um banco SQLite local e empacotar o app React em um executável offline com Electron.

## 1. Backup do Supabase

1. **Mapeie o que existe**  
   Tabelas utilizadas pelo app: `financial_items`, `categories`, `business_units`, `unit_categories`, `bank_balances`, `recurring_bills`, `recurring_bills_instances`, `user_profiles`.

2. **Dump do schema**  
   ```bash
   supabase db dump --schema public --db-url "$SUPABASE_URL" > backups/dre-schema.sql
   ```

3. **Dump dos dados**  
   ```bash
   supabase db dump --data-only --db-url "$SUPABASE_URL" > backups/dre-data.sql
   # ou pg_dump --data-only
   ```

4. **Exportação em JSON (opcional)**  
   Gere arquivos específicos para importar direto no app (ex.: `backup-supabase-data/financial_items.json`). Eles podem ser recarregados via scripts customizados ou pelos serviços expostos no `offlineDb`.

5. **Credenciais de usuários**  
   Exporte `auth.users` ou liste e-mails permitidos para configurar no modo offline. O `authService` suporta múltiplos usuários locais via `localStorage`.

## 2. Preparar o Banco Local (SQLite)

1. **Schema**  
   O arquivo `localdb/schema.sql` é executado automaticamente ao abrir o app Electron. Ele cria todas as tabelas e índices necessários. Caso precise ajustar colunas, aplique novas instruções `ALTER TABLE` nesse arquivo ou crie scripts de migração incremental.

2. **Popular dados**  
   - Rode `sqlite3 dre.db < localdb/schema.sql` se quiser gerar um banco manualmente.
   - Use `sqlite-utils insert dre.db financial_items financial_items.json --pk id` para carregar dumps JSON.
   - O app também semeia categorias e unidades padrão no primeiro login através de `authService`.

3. **Camada de acesso**  
   O módulo `src/services/offline-db.ts` abstrai todas as consultas. Ele expõe funções como `fetchFinancialItems`, `insertRecurringBill`, etc., espelhando a API que antes vinha do Supabase.

## 3. Ajustes no React/Vite

1. **Autenticação local**  
   `src/services/auth-service.ts` controla usuários em `localStorage`. Há um usuário padrão (`offline@dre.local / offline123`) e suporte para criar novos perfis.

2. **Queries/Mutações**  
   `Lancamentos.tsx` e `Contas.tsx` agora usam `offlineDb`. As mesmas `queryKeys` foram mantidas para compatibilidade com o cache do React Query.

3. **Inicialização de dados**  
   Ao fazer login, o `authService` garante que existam perfil, categorias e unidades mínimas para o usuário atual.

## 4. Empacotamento com Electron

1. **Estrutura**  
   - `electron/main.cjs`: cria a janela, expõe IPC e garante o SQLite (`better-sqlite3`).
   - `electron/preload.cjs`: publica `window.localDb` para o renderer com métodos `select`, `run` e `transaction`.

2. **Scripts**  
   ```bash
   npm run electron:dev   # Vite + Electron com hot reload
   npm run electron:build # build Vite + electron-builder
   ```

3. **Distribuição**  
   O `electron-builder.json` gera binários para macOS, Windows (NSIS) e Linux (AppImage). Os arquivos de dados (`localdb/*`) são copiados para o pacote automaticamente.

4. **Local dos dados**  
   O banco `dre.db` vive em `app.getPath('userData')/dre/`. Cada SO possui um diretório diferente:
   - macOS: `~/Library/Application Support/dre/DREPessoalOffline/dre.db`
   - Windows: `%APPDATA%\\dre\\dre.db`
   - Linux: `~/.config/dre/dre.db`

## 5. Rotina de Backup Local

1. **Exportação**  
   Use `sqlite3 /path/to/dre.db ".backup dre-backup.db"` ou scripts que percorram as tabelas e gerem JSON/CSV.

2. **Importação manual**  
   Substitua o arquivo `dre.db` com o backup desejado (com o app fechado) ou escreva um comando que rode `sqlite3 dre.db < dump.sql`.

3. **Versionamento**  
   Mantenha scripts de migração em `localdb/` e documente cada alteração no schema neste arquivo.

4. **Repetindo em outro projeto**  
   - Reaproveite `localdb/schema.sql` como base.
   - Ajuste `offline-db.ts` para refletir as tabelas específicas.
   - Atualize `authService` com os usuários padrão do novo projeto.
   - Copie `electron/` e o `vite.config.ts` (com o plugin de cópia).

## 6. Referências Rápidas

| Comando | Descrição |
| ------- | --------- |
| `npm run electron:dev` | Sobescreve Vite (porta 8080) e abre o app no Electron |
| `npm run electron:build` | Empacota o app (dist + instaladores) |
| `npm run build` | Apenas build Vite (para servir em browsers) |
| `sqlite3 dre.db ".tables"` | Lista tabelas no banco local |

Seguindo esse roteiro você pode repetir a mesma migração em outros projetos: faça backup do Postgres, converta o schema, popule o SQLite e mantenha todo o app encapsulado dentro do Electron para operar 100% offline.
