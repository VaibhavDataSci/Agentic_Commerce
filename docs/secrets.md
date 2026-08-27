# GitHub Secrets — Agentic Commerce

> Configure these in **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**.
> Never put actual secret values in code or commit history.

---

## Required Secrets by Category

### 🔑 Razorpay (Payment Gateway)

| Secret Name | Description | Where to get it |
|---|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key ID | Razorpay Dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | Razorpay Dashboard → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | Razorpay Dashboard → Webhooks |
| `VITE_RAZORPAY_KEY_ID` | Public key baked into frontend build | Same as `RAZORPAY_KEY_ID` |

---

### 🤖 AI / LLM Services

| Secret Name | Description | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | platform.openai.com |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | aistudio.google.com |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | console.anthropic.com |

---

### 🗄️ Database

| Secret Name | Description | Example value |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DB_PASSWORD` | PostgreSQL password | Strong random password |

---

### ⚡ Infrastructure (Redis / MQTT)

| Secret Name | Description |
|---|---|
| `REDIS_URL` | Redis connection string (e.g. `redis://:pass@host:6379/0`) |
| `MQTT_USERNAME` | MQTT broker username |
| `MQTT_PASSWORD` | MQTT broker password |

---

### 🐳 Container Registry

| Secret Name | Description | Notes |
|---|---|---|
| `REGISTRY_TOKEN` | GitHub PAT with `write:packages` scope | Only needed if pushing from outside Actions (locally). GitHub Actions use `GITHUB_TOKEN` automatically. |

---

### ☁️ Cloud Deployment (configure when infra is ready)

| Secret Name | Description |
|---|---|
| `DEPLOY_HOST_STAGING` | IP or hostname of staging server |
| `DEPLOY_HOST_PRODUCTION` | IP or hostname of production server |
| `DEPLOY_USER` | SSH username on the remote server (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Full contents of the **private** SSH key (PEM format) |
| `DEPLOY_PATH` | Absolute path on the server (e.g. `/opt/agentic-commerce`) |

---

### 🌐 Frontend Runtime

| Secret Name | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL baked into the frontend Docker image |

---

### 📣 Notifications (optional)

| Secret Name | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Incoming webhook for deployment failure alerts |

---

## GitHub Environments

Configure **two GitHub Environments** under *Settings → Environments*:

| Environment | Protection rules |
|---|---|
| `staging` | No restrictions — deploys automatically on push to `main` |
| `production` | Require manual approval from a repo admin |

---

## How to rotate a secret

1. Generate a new credential in the provider dashboard.
2. Go to **GitHub → Settings → Secrets → Actions**.
3. Click the secret name → **Update**.
4. Paste the new value and save.
5. Trigger a new deployment to pick up the change.

---

## Local development

For local development, copy `.env.example` → `.env` and fill in real values.
The `.env` file is listed in `.gitignore` and will never be committed.
