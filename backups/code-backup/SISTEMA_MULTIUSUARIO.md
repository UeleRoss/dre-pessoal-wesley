# Sistema Multi-Usuário com Personalização e Onboarding

## Resumo da Implementação

Este documento descreve as mudanças implementadas para transformar o DRE Pessoal em um sistema multi-usuário com personalização e onboarding.

## Arquitetura

### 1. Banco de Dados

#### Nova Tabela: `user_profiles`
Armazena as informações personalizadas de cada usuário:
- `user_id`: Referência ao usuário autenticado (auth.users)
- `display_name`: Nome personalizado do usuário
- `onboarding_completed`: Flag que indica se o usuário completou o onboarding
- `theme_color`: Cor preferida do usuário (futuro)
- `avatar_url`: URL do avatar (futuro)

**Segurança:** Row Level Security (RLS) habilitado - cada usuário só pode ver/editar seu próprio perfil.

**Automação:** Trigger que cria automaticamente um perfil quando um novo usuário se cadastra.

### 2. Frontend

#### Componentes Criados

**`OnboardingFlow.tsx`**
- Componente principal do fluxo de onboarding
- Gerencia as 3 etapas do processo
- Barra de progresso visual
- Validação de cada etapa antes de avançar

**`WelcomeStep.tsx`** (Etapa 1)
- Tela de boas-vindas
- Coleta o nome de exibição do usuário
- Preview em tempo real de como ficará o nome no sistema

**`UnitsStep.tsx`** (Etapa 2)
- Seleção de unidades de negócio
- 8 unidades pré-definidas com ícones
- Opção de criar unidades personalizadas
- Interface visual com cards clicáveis

**`CategoriesStep.tsx`** (Etapa 3)
- Seleção de categorias de gastos
- 12 categorias pré-definidas com ícones
- Opção de criar categorias personalizadas
- Interface visual com cards clicáveis

#### Hook Customizado

**`useUserProfile.ts`**
- Gerencia todas as operações relacionadas ao perfil do usuário
- Funções principais:
  - `profile`: Dados do perfil do usuário atual
  - `updateProfile()`: Atualizar informações do perfil
  - `completeOnboarding()`: Marcar onboarding como completo
- Utiliza React Query para cache e sincronização

#### Atualizações em Componentes Existentes

**`App.tsx`**
- Verifica autenticação no início
- Se não autenticado → mostra tela de login
- Se autenticado mas onboarding incompleto → mostra onboarding
- Se tudo ok → mostra aplicação normal

**`Layout.tsx`**
- Busca nome do perfil do usuário (ao invés de localStorage)
- Mostra: "DRE Pessoal da [Nome]"
- Botão de logout no header (desktop e mobile)
- Editor de nome integrado ao perfil do Supabase

**`Dashboard.tsx`**
- Removida duplicação de verificação de autenticação
- Autenticação agora é gerenciada apenas no App.tsx

## Fluxo de Uso

### Primeiro Acesso (Novo Usuário)

```
1. Acessa o sistema
   ↓
2. Tela de Cadastro/Login
   ↓
3. Cria conta (email + senha)
   ↓
4. Trigger cria perfil automaticamente
   ↓
5. Sistema detecta onboarding_completed = false
   ↓
6. ONBOARDING - Etapa 1: Escolher nome
   ↓
7. ONBOARDING - Etapa 2: Selecionar unidades
   ↓
8. ONBOARDING - Etapa 3: Selecionar categorias
   ↓
9. Sistema marca onboarding_completed = true
   ↓
10. Redireciona para Dashboard personalizado
```

### Acesso Regular (Usuário Existente)

```
1. Acessa o sistema
   ↓
2. Tela de Login
   ↓
3. Faz login
   ↓
4. Sistema verifica onboarding_completed = true
   ↓
5. Acessa Dashboard diretamente
```

## Personalização

### Nome Personalizado
- Exibido no cabeçalho: "DRE Pessoal da [Nome]"
- Pode ser editado a qualquer momento clicando no ícone de lápis
- Salvo automaticamente no perfil do Supabase

### Unidades de Negócio (Etapa 2)
O usuário pode selecionar entre as unidades pré-definidas:
- 🏠 Apartamento
- 💼 Escritório
- ✈️ Viagens e Lazer
- 🏋️ Vida Esportiva
- 🛍️ Compras Pessoais
- ⛰️ Go On Outdoor
- 🚗 Carro
- 🍽️ Comida

Ou criar unidades personalizadas.

### Categorias (Etapa 3)
O usuário pode selecionar entre as categorias pré-definidas:
- 🍔 Alimentação
- 🚗 Transporte
- 🏠 Moradia
- ⚕️ Saúde
- 📚 Educação
- 🎮 Lazer
- 👗 Vestuário
- 💳 Contas
- 💰 Investimentos
- ✈️ Viagens
- 🐕 Pets
- 📦 Outros

Ou criar categorias personalizadas.

## Segurança

### Row Level Security (RLS)
Todas as tabelas do sistema já tinham `user_id` e RLS habilitado. Agora também incluímos:
- `user_profiles`: Cada usuário só pode ver/editar seu próprio perfil

### Autenticação
- Sistema de autenticação gerenciado pelo Supabase Auth
- Sessões persistentes (localStorage)
- Auto-refresh de tokens
- Logout seguro que limpa toda a sessão

## Benefícios

1. **Isolamento de Dados**: Cada usuário vê apenas seus próprios dados
2. **Personalização**: Cada usuário tem sua própria experiência personalizada
3. **Onboarding Amigável**: Interface visual e intuitiva para configuração inicial
4. **Escalabilidade**: Sistema pronto para múltiplos usuários
5. **Segurança**: RLS garante que os dados estão protegidos
6. **Experiência do Usuário**: Nome personalizado cria conexão emocional

## Próximos Passos (Futuro)

1. **Avatar**: Permitir upload de foto de perfil
2. **Temas**: Implementar cores customizadas (theme_color)
3. **Compartilhamento**: Permitir compartilhar relatórios entre usuários
4. **Família**: Criar conceito de "família financeira" com múltiplos usuários
5. **Notificações**: Alertas personalizados por email
6. **Configurações Avançadas**: Mais opções de personalização

## Arquivos Criados

- `supabase/migrations/20251013000001_create_user_profiles.sql`
- `src/hooks/useUserProfile.ts`
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/components/onboarding/WelcomeStep.tsx`
- `src/components/onboarding/UnitsStep.tsx`
- `src/components/onboarding/CategoriesStep.tsx`
- `MIGRATION_INSTRUCTIONS.md`
- `SISTEMA_MULTIUSUARIO.md` (este arquivo)

## Arquivos Modificados

- `src/App.tsx` - Adicionada lógica de autenticação e onboarding
- `src/components/Layout.tsx` - Integração com perfil e botão de logout
- `src/pages/Dashboard.tsx` - Removida duplicação de auth
- `src/integrations/supabase/types.ts` - Adicionados tipos da tabela user_profiles

## Tecnologias Utilizadas

- **React**: Framework frontend
- **TypeScript**: Tipagem estática
- **Supabase**: Backend as a Service (Auth + Database)
- **React Query**: Gerenciamento de estado e cache
- **Tailwind CSS**: Estilização
- **Shadcn/ui**: Componentes UI
- **Lucide Icons**: Ícones

## Conclusão

O sistema agora está completamente multi-usuário, com cada pessoa podendo ter sua própria conta personalizada. Sua esposa poderá criar uma conta, configurar as unidades e categorias do jeito dela, e ter uma experiência totalmente personalizada!

🎉 **O DRE Pessoal está pronto para uso multi-usuário!**
