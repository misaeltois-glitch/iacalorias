# Deploy no Railway — IA Calorias

## Passo a passo completo

### 1. Criar conta e projeto

1. Acesse [railway.app](https://railway.app) e crie uma conta (gratuita).
2. Clique em **New Project** → **Deploy from GitHub repo**.
3. Conecte sua conta GitHub e selecione o repositório do IA Calorias.

> **Importante:** Você precisa fazer push deste código para um repositório GitHub antes. Veja o passo abaixo.

---

### 2. Enviar o código para o GitHub

No terminal do Replit (shell):

```bash
git remote add origin https://github.com/SEU_USUARIO/ia-calorias.git
git push -u origin main
```

---

### 3. Adicionar o PostgreSQL

No projeto Railway:
1. Clique em **+ Add Service** → **Database** → **PostgreSQL**.
2. O Railway cria o banco e define `DATABASE_URL` automaticamente para o serviço.

---

### 4. Configurar variáveis de ambiente

No painel do serviço Railway, vá em **Variables** e adicione:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | (mesma chave do Replit) |
| `STRIPE_SECRET_KEY` | (mesma chave do Replit) |
| `STRIPE_WEBHOOK_SECRET` | (mesma chave do Replit) |
| `STRIPE_LIMITED_PRICE_ID` | `price_1TG4kW5gtu657TZjczJxsG4A` |
| `STRIPE_UNLIMITED_PRICE_ID` | `price_1TG4kW5gtu657TZjyp9NlkVZ` |
| `JWT_SECRET` | (gere uma string aleatória segura, ex: `openssl rand -hex 32`) |
| `APP_URL` | `https://SEU-DOMINIO.railway.app` (após o deploy) |
| `RESEND_API_KEY` | (se usar e-mail — opcional) |

> `PORT` e `DATABASE_URL` são definidos automaticamente pelo Railway — não precisa adicionar.

---

### 5. Configurar o banco de dados (uma única vez)

Após o primeiro deploy, execute o comando de migração uma vez:

No painel Railway, vá em **Settings** → **Deploy** e adicione no campo **Pre-deploy Command**:

```
pnpm --filter @workspace/db run push
```

OU execute via Railway CLI:

```bash
railway run pnpm --filter @workspace/db run push
```

---

### 6. Atualizar o Stripe Webhook

No painel do Stripe:
1. Vá em **Developers** → **Webhooks**.
2. Adicione novo endpoint: `https://SEU-DOMINIO.railway.app/api/subscription/webhook`
3. Selecione os eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copie o **Signing Secret** e adicione como `STRIPE_WEBHOOK_SECRET` nas variáveis Railway.

---

### 7. Verificar o deploy

O Railway irá:
1. Instalar dependências com pnpm
2. Executar o build (frontend + backend)
3. Iniciar o servidor

Acesse `https://SEU-DOMINIO.railway.app` — o site estará no ar.

---

## Arquitetura no Railway

```
Railway Service
├── Build: node scripts/build-railway.mjs
│   ├── Compila API (esbuild)
│   ├── Compila Frontend (Vite)  
│   └── Copia frontend → api-server/dist/public/
│
└── Runtime: node --enable-source-maps artifacts/api-server/dist/index.mjs
    ├── GET /api/*    → Express API
    └── GET *         → React SPA (arquivos estáticos)
```

## Custos Railway (referência)

| Plano | Custo | Adequado para |
|---|---|---|
| Hobby | ~$5/mês | Até ~500 usuários ativos |
| Pro | ~$20/mês | Crescimento sem limite |

O banco PostgreSQL no Railway custa ~$5/mês separado (incluso nos planos pagos).
