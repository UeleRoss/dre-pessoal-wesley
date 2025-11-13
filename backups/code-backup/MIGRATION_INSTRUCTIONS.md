# Instruções para Aplicar a Migration do Sistema Multi-Usuário

## Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Entre no projeto: `fywrdmboiaqiopxqmywo`
3. Vá em: **SQL Editor** (no menu lateral)

## Passo 2: Executar a Migration

Copie e cole o conteúdo do arquivo:
```
supabase/migrations/20251013000001_create_user_profiles.sql
```

No SQL Editor e clique em **Run**.

## Passo 3: Verificar a Tabela

Após executar, vá em **Table Editor** e verifique se a tabela `user_profiles` foi criada com os seguintes campos:
- id (UUID)
- user_id (UUID)
- display_name (TEXT)
- onboarding_completed (BOOLEAN)
- theme_color (TEXT)
- avatar_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Passo 4: Testar o Sistema

1. Execute o projeto: `npm run dev`
2. Faça logout (se estiver logado)
3. Crie uma nova conta ou faça login
4. O sistema deve:
   - Criar automaticamente um perfil para o usuário
   - Mostrar a tela de onboarding (3 etapas)
   - Após completar o onboarding, redirecionar para o dashboard
   - Mostrar o nome personalizado no cabeçalho

## Fluxo Esperado

### Novo Usuário:
1. Tela de Login/Cadastro
2. Onboarding (3 etapas):
   - Etapa 1: Escolher nome de exibição
   - Etapa 2: Selecionar unidades de negócio
   - Etapa 3: Selecionar categorias
3. Dashboard personalizado

### Usuário Existente (com onboarding completo):
1. Tela de Login
2. Dashboard (direto)

## Troubleshooting

### Se a migration falhar:
- Verifique se a tabela `user_profiles` já existe
- Se existir, delete-a primeiro: `DROP TABLE IF EXISTS public.user_profiles CASCADE;`
- Execute a migration novamente

### Se o onboarding não aparecer:
- Verifique no SQL Editor: `SELECT * FROM user_profiles;`
- Se o campo `onboarding_completed` estiver `true`, mude para `false`:
  ```sql
  UPDATE user_profiles SET onboarding_completed = false WHERE user_id = 'SEU_USER_ID';
  ```

### Se o nome não aparecer no cabeçalho:
- Limpe o cache do navegador
- Faça logout e login novamente
- Verifique se o perfil tem o campo `display_name` preenchido
