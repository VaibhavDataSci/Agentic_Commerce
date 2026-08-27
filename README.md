<div align="center">

# 🛒 Agentic Commerce
### Razorpay AI Buildathon

*AI-powered agentic shopping platform with autonomous payment flows*

[![CI](https://github.com/YOUR_USERNAME/Agentic_Commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/Agentic_Commerce/actions/workflows/ci.yml)
[![CD](https://github.com/YOUR_USERNAME/Agentic_Commerce/actions/workflows/cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/Agentic_Commerce/actions/workflows/cd.yml)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Docker Compose](#docker-compose)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [GitHub Secrets](#github-secrets)
- [Adding New Services](#adding-new-services)
- [Deployment](#deployment)

---

## Project Overview

Agentic Commerce is an AI-powered autonomous commerce platform built for the **Razorpay AI Buildathon**.
It combines intelligent agents, real-time triggers, and seamless Razorpay payment flows to create
a next-generation shopping experience.

> 📄 See [`Project_details.md`](./Project_details.md) for full product requirements and architecture.

---

## Project Structure

```
Agentic_Commerce/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Continuous Integration (lint, test, build, docker)
│       └── cd.yml              # Continuous Deployment (build → push → deploy)
│
├── backend/                    # Python / FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py             # FastAPI application entry point
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_health.py      # Smoke tests
│   ├── Dockerfile              # Multi-stage production image
│   ├── .dockerignore
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # Dev / test dependencies
│   └── pyproject.toml          # pytest, ruff, black, mypy config
│
├── frontend/                   # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   └── test/
│   │       ├── setup.ts        # Vitest setup
│   │       └── App.test.tsx    # Smoke tests
│   ├── Dockerfile              # Multi-stage Node→Nginx image
│   ├── .dockerignore
│   ├── nginx.conf              # Nginx SPA + API proxy config
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .eslintrc.cjs
│
├── infra/
│   └── mosquitto/
│       └── mosquitto.conf      # MQTT broker config
│
├── docs/
│   └── secrets.md              # GitHub Secrets reference (no real values)
│
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Environment variable template (safe to commit)
├── .gitignore
├── Project_details.md
└── README.md
```

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose v2

### 1 — Clone and configure environment

```bash
git clone https://github.com/YOUR_USERNAME/Agentic_Commerce.git
cd Agentic_Commerce

# Copy the template and fill in your real values
cp .env.example .env
```

Edit `.env` with your actual credentials. The file is git-ignored — it will never be committed.

---

### 2 — Run the backend (without Docker)

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Start the dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be live at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

---

### 3 — Run the frontend (without Docker)

```bash
cd frontend

npm install
npm run dev
```

Frontend will be live at **http://localhost:5173**

---

### 4 — Run backend tests locally

```bash
cd backend
pytest                    # run all tests
pytest --cov=app          # with coverage
pytest -v -x              # verbose, stop on first failure
```

---

### 5 — Run frontend lint & tests locally

```bash
cd frontend
npm run lint              # ESLint
npm run type-check        # TypeScript
npm test                  # Vitest
npm run build             # Production build
```

---

## Docker Compose

Docker Compose orchestrates all services. Services are grouped into **profiles** so you can start only what you need.

### Start everything

```bash
cp .env.example .env      # if not done yet
docker compose up --build
```

### Start specific service groups

```bash
# Core services only: backend + frontend + postgres + redis
docker compose --profile core up --build

# Add MQTT broker (for agentic triggers)
docker compose --profile core --profile messaging up --build

# Infrastructure only (postgres + redis)
docker compose --profile infra up
```

### Useful commands

```bash
docker compose ps                    # list running containers
docker compose logs -f backend       # stream backend logs
docker compose logs -f frontend      # stream frontend logs
docker compose exec backend bash     # shell into backend container
docker compose down                  # stop all containers
docker compose down -v               # stop + remove volumes (resets DB)
```

### Service URLs (local Docker)

| Service | URL |
|---|---|
| Frontend (Nginx) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MQTT | localhost:1883 |

---

## CI Pipeline

The CI pipeline runs automatically on every **push to `main`** and every **pull request targeting `main`**.

```
push/PR to main
      │
      ├── backend-lint         → ruff + black format check
      │         │
      │   backend-test         → pytest (with coverage report)
      │
      ├── frontend-lint        → ESLint + TypeScript type-check
      │         │
      │   frontend-test        → Vitest
      │         │
      │   frontend-build       → vite build (validates bundle)
      │
      └── docker-build         → validates both Dockerfiles build (no push)
                │
          ci-success           → summary gate (required for branch protection)
```

**Key behaviours:**
- Dependency caching (pip, npm) keeps runs fast
- Docker layer cache shared across runs via GitHub Actions cache
- Coverage reports uploaded as artifacts
- All steps **fail the pipeline** if they don't pass

### Setting up branch protection

Go to **GitHub → Settings → Branches → Add rule** for `main`:
- ✅ Require status checks: `CI — All checks passed`
- ✅ Require branches to be up to date before merging
- ✅ Require pull request reviews

---

## CD Pipeline

The CD pipeline runs after a **successful push to `main`** and can be triggered manually from the GitHub Actions tab.

```
Push to main
      │
  CI Gate (must pass)
      │
  Docker Build & Push → ghcr.io (GitHub Container Registry)
      │                  ├── agentic-commerce-backend:sha-XXXXXXX
      │                  ├── agentic-commerce-backend:latest
      │                  ├── agentic-commerce-frontend:sha-XXXXXXX
      │                  └── agentic-commerce-frontend:latest
      │
  SSH → Cloud Server
      │   docker compose pull
      │   docker compose up -d
      │
  Smoke-test health endpoints
      │
  Notify on failure (Slack / email)
```

> ⚠️ **Status: PLACEHOLDER** — The SSH deployment steps are commented out in `cd.yml`.
> Configure the secrets below, then uncomment the deploy step.

---

## GitHub Secrets

See [`docs/secrets.md`](./docs/secrets.md) for the full reference table.

**Quick summary of what you need to configure:**

| Category | Secrets |
|---|---|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| AI APIs | `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY` |
| Database | `DATABASE_URL`, `DB_PASSWORD` |
| Infrastructure | `REDIS_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` |
| Deployment | `DEPLOY_HOST_STAGING`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH` |
| Frontend | `VITE_API_BASE_URL`, `VITE_RAZORPAY_KEY_ID` |

Configure at: **GitHub → Repository → Settings → Secrets and variables → Actions**

---

## Adding New Services

The project is designed to be extended without redesigning the pipeline.

### Adding a new backend service (e.g., an AI agent worker)

1. Create `services/ai-worker/` with its own `Dockerfile` and source code.
2. Add a new service block in `docker-compose.yml` under the existing services.
3. Add a `profiles` key to control when it starts.
4. The CI `docker-build` job will automatically detect and validate it if you add a step in `ci.yml`.

### Adding a new CI check

Add a new job to `.github/workflows/ci.yml` and add it to the `needs:` list of the `ci-success` job.

### Adding a new environment variable

1. Add the placeholder to `.env.example` with a comment describing it.
2. Add the real value to GitHub Secrets.
3. Reference it in `docker-compose.yml` under the relevant service's `environment:` block.
4. Reference it in the CD workflow `build-args` if it's needed at Docker build time.

---

## Deployment

### Once your cloud infrastructure is ready:

1. **Provision a server** (VPS, EC2, DigitalOcean Droplet, etc.) with Docker installed.

2. **Configure GitHub Secrets** (see table above and `docs/secrets.md`).

3. **Create the deploy user on the server:**
   ```bash
   # On the server
   adduser deploy
   usermod -aG docker deploy
   mkdir -p /opt/agentic-commerce
   chown deploy:deploy /opt/agentic-commerce
   ```

4. **Copy docker-compose.yml and .env to the server:**
   ```bash
   scp docker-compose.yml deploy@YOUR_SERVER:/opt/agentic-commerce/
   scp .env deploy@YOUR_SERVER:/opt/agentic-commerce/
   ```

5. **Uncomment the SSH deploy step** in `.github/workflows/cd.yml`.

6. **Push to `main`** — the full pipeline runs automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Frontend | React 18, TypeScript, Vite, Nginx |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Messaging | Eclipse Mosquitto (MQTT) |
| Payments | Razorpay SDK |
| AI | OpenAI / Google Gemini / Anthropic |
| Containerisation | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry (ghcr.io) |

---

<div align="center">
Built for the <strong>Razorpay AI Buildathon</strong> 🚀
</div>
