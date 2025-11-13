# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1007ee02-5c13-4e34-8628-09b1c22d7af9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1007ee02-5c13-4e34-8628-09b1c22d7af9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1007ee02-5c13-4e34-8628-09b1c22d7af9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

## Modo Offline + Electron

O projeto agora possui um fluxo totalmente local baseado em SQLite e Electron.

### Scripts principais

| Comando | Descrição |
| ------- | --------- |
| `npm run dev` | Executa somente o Vite (útil para desenvolvimento web) |
| `npm run electron:dev` | Sobescreve o Vite (porta 8080) e abre o app no Electron com hot reload |
| `npm run electron:build` | Gera o build Vite e empacota com `electron-builder` |

### Banco de dados

- O arquivo `localdb/schema.sql` é aplicado automaticamente na primeira execução.
- O SQLite final fica em `~/Library/Application Support/dre/dre.db` (macOS), `%APPDATA%\\dre\\dre.db` (Windows) ou `~/.config/dre/dre.db` (Linux).
- Para restaurar um backup basta substituir esse arquivo (com o app fechado) ou rodar `sqlite3 dre.db ".restore backup.db"`.

### Autenticação Local

- Usuário padrão: **offline@dre.local**
- Senha padrão: **offline123**
- Novos usuários são armazenados no `localStorage` da máquina e têm dados iniciais (categorias/unidades) semeados automaticamente.

### Mais detalhes

Consulte `OFFLINE_MIGRATION.md` para o passo a passo completo da migração do Supabase para o modo offline e dicas para repetir o processo em outros projetos.
