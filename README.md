# AI Workforce — Backend

**Don't build an AI agent. Hire one.**

AI Workforce is an Agent-as-a-Service platform where users describe a job in plain language, and the platform generates a specialized AI worker to handle it.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Database](#database)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Hackathon Scope](#hackathon-scope)

---

## Overview

The core user flow:

```
Describe the job → AI generates a worker → Add knowledge → Test the worker → Monitor activity
```

A second flow lets users describe their entire business and receive AI workforce recommendations.

---

## Quick Start

### Prerequisites

- Node.js 20+ or Bun
- PostgreSQL 14+

### 1. Clone and install

```bash
git clone <repo-url>
cd workforce
bun install        # or: npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### 3. Start PostgreSQL

Using Docker (quickest):

```bash
docker run -d \
  --name ai-workforce-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_workforce \
  -p 5432:5432 \
  postgres:16
```

Or use a local PostgreSQL installation and create the database manually:

```sql
CREATE DATABASE ai_workforce;
```

### 4. Run database migrations

```bash
bun run prisma migrate dev --name init
# or: npx prisma migrate dev --name init
```

### 5. Start the development server

```bash
bun run start:dev
# or: npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

Swagger UI (interactive docs): `http://localhost:3000/api/docs`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens — use a long random string in production |
| `JWT_EXPIRATION` | No | Token lifetime, default `7d` |
| `AI_API_KEY` | See note | OpenAI API key |
| `AI_MODEL` | No | OpenAI model to use, default `gpt-4o-mini` |
| `AI_DEMO_MODE` | No | Set to `true` to run with mock AI responses (no API key needed) |
| `PORT` | No | HTTP port, default `3000` |

> **AI configuration note:** Either set `AI_API_KEY` to a valid OpenAI key, or set `AI_DEMO_MODE=true` for local development without a key. If neither is set the AI endpoints will return a `503 SERVICE_UNAVAILABLE` error.

---

## Architecture

Modular NestJS monolith. Each domain is a self-contained module.

```
src/
├── main.ts                  # Bootstrap: pipes, filters, interceptors, Swagger
├── app.module.ts            # Root module
│
├── auth/                    # JWT register/login/me
├── users/                   # UsersService (profile lookups, used by auth)
├── workspaces/              # Workspace CRUD (scoped to owner)
├── workers/                 # Worker CRUD, status machine, AI generation, chat
├── knowledge/               # Per-worker knowledge management
├── conversations/           # Read conversation history and messages
├── activities/              # Activity log (per-worker and workspace-level)
├── ai/                      # AI abstraction (OpenAI Responses API + demo mode)
├── recommendations/         # Business analysis → workforce recommendations
├── dashboard/               # Workspace statistics overview
│
├── common/                  # Shared: JwtAuthGuard, CurrentUser decorator,
│   │                        #   HttpExceptionFilter, ResponseInterceptor
└── database/                # Global PrismaService
```

### Request lifecycle

```
Request → ValidationPipe (DTO) → JwtAuthGuard → Controller → Service → PrismaService → DB
                                                                      ↕
                                                               AiService (OpenAI)
Response ← ResponseInterceptor ({ success, data }) ← Controller
Error    ← HttpExceptionFilter ({ success, error: { code, message } })
```

### AI module

All OpenAI calls are isolated inside `AiService`. Three public methods:

| Method | Used by |
|---|---|
| `generateWorker(jobDescription)` | `POST /workers/generate` |
| `chatWithWorker(worker, message, history)` | `POST /workers/:id/chat` |
| `analyzeBusiness(description)` | `POST /recommendations/analyze` |

When `AI_DEMO_MODE=true`, each method returns a static mock response so the entire app can be demonstrated without an API key.

---

## Database

PostgreSQL via Prisma ORM.

### Models

```
User
 └── Workspace (ownerId)
       └── Worker (workspaceId)
             ├── Knowledge (workerId)
             ├── Conversation (workerId, userId)
             │     └── Message (conversationId)
             └── Activity (workerId)
```

### Key design decisions

- **`responsibilities` and `skills`** are stored as `String[]` (PostgreSQL array) for simplicity. They can be normalized to join tables later.
- **`Activity.metadata`** is `Json?` — extensible for future structured event payloads.
- Cascade deletes flow from Workspace → Worker → all children.
- Conversations are linked to both `Worker` and `User` — a user can only see their own conversations.

### Enums

| Enum | Values |
|---|---|
| `WorkerStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED` |
| `MessageRole` | `USER`, `WORKER`, `SYSTEM` |
| `ActivityType` | `WORKER_CREATED`, `WORKER_UPDATED`, `WORKER_ACTIVATED`, `WORKER_PAUSED`, `WORKER_ARCHIVED`, `KNOWLEDGE_ADDED`, `KNOWLEDGE_UPDATED`, `KNOWLEDGE_DELETED`, `CONVERSATION_STARTED`, `MESSAGE_RECEIVED`, `MESSAGE_SENT`, `WORKER_GENERATED`, `WORKFORCE_ANALYZED`, `ESCALATION`, `ERROR` |

---

## Authentication

JWT Bearer tokens. Tokens are returned on register and login.

Include in every authenticated request:

```
Authorization: Bearer <token>
```

Tokens expire after `JWT_EXPIRATION` (default 7 days). There is no refresh token in the MVP — re-login to get a new token.

Passwords are hashed with bcrypt (cost factor 12). Password hashes are never returned by any endpoint.

---

## API Reference

All responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }
```

Base path: `/api`  
Interactive docs: `/api/docs` (Swagger UI)

---

### Authentication

#### `POST /api/auth/register`

```json
// Request
{ "name": "Thomas", "email": "user@example.com", "password": "securepassword" }

// Response 201
{
  "accessToken": "eyJ...",
  "user": { "id": "clx...", "name": "Thomas", "email": "user@example.com" }
}
```

#### `POST /api/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "securepassword" }

// Response 200
{
  "accessToken": "eyJ...",
  "user": { "id": "clx...", "name": "Thomas", "email": "user@example.com" }
}
```

#### `GET /api/auth/me` 🔒

Returns the authenticated user from the JWT payload.

---

### Workspaces 🔒

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces` | List my workspaces |
| `GET` | `/api/workspaces/:id` | Get workspace |
| `PATCH` | `/api/workspaces/:id` | Update workspace |
| `DELETE` | `/api/workspaces/:id` | Delete workspace |

```json
// POST /api/workspaces
{ "name": "Urban Threads", "description": "An online clothing store." }
```

---

### Workers 🔒

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/workers/generate` | Generate a worker preview (not saved) |
| `POST` | `/api/workers` | Create and save a worker |
| `GET` | `/api/workers?workspaceId=&skip=0&take=20` | List workers |
| `GET` | `/api/workers/:id` | Get worker |
| `PATCH` | `/api/workers/:id` | Update worker |
| `DELETE` | `/api/workers/:id` | Delete worker |
| `PATCH` | `/api/workers/:id/status` | Transition worker status |
| `POST` | `/api/workers/:id/chat` | Send a message to an active worker |

#### Generate a worker (preview only)

```json
// POST /api/workers/generate
{
  "workspaceId": "clx...",
  "jobDescription": "I run an online clothing store and need someone to answer customer questions about products, delivery, and returns."
}

// Response 200
{
  "name": "Store Assistant",
  "role": "Customer Support Worker",
  "description": "Handles common customer questions...",
  "instructions": "You are Store Assistant...",
  "responsibilities": ["Answer product questions", "Explain delivery", "Explain returns"],
  "skills": ["Customer support", "Communication"]
}
```

The preview is not saved. Pass the response body (after user review) to `POST /api/workers`.

#### Status transitions

```json
// PATCH /api/workers/:id/status
{ "status": "ACTIVE" }
```

Valid transitions:

```
DRAFT → ACTIVE
ACTIVE → PAUSED
PAUSED → ACTIVE
ACTIVE → ARCHIVED
PAUSED → ARCHIVED
```

ARCHIVED is terminal.

#### Chat with a worker

```json
// POST /api/workers/:id/chat
{ "message": "Do you deliver to Lagos?", "conversationId": "clx... (optional)" }

// Response 200
{
  "conversationId": "clx...",
  "message": { "id": "clx...", "role": "WORKER", "content": "Yes, we deliver to Lagos..." },
  "requiresEscalation": false
}
```

The worker must be `ACTIVE`. If `conversationId` is omitted, a new conversation is created.

---

### Knowledge 🔒

Nested under workers. All operations verify the authenticated user owns the worker.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/workers/:id/knowledge` | Add knowledge |
| `GET` | `/api/workers/:id/knowledge` | List knowledge |
| `GET` | `/api/workers/:id/knowledge/:knowledgeId` | Get knowledge entry |
| `PATCH` | `/api/workers/:id/knowledge/:knowledgeId` | Update knowledge entry |
| `DELETE` | `/api/workers/:id/knowledge/:knowledgeId` | Delete knowledge entry |

```json
// POST /api/workers/:id/knowledge
{
  "title": "Delivery Policy",
  "content": "Delivery within Lagos takes 1–3 business days. Outside Lagos takes 3–7 business days."
}
```

---

### Conversations 🔒

Conversations are created implicitly via `POST /workers/:id/chat`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workers/:id/conversations?skip=0&take=20` | List conversations for a worker |
| `GET` | `/api/conversations/:id` | Get conversation with all messages |
| `GET` | `/api/conversations/:id/messages?skip=0&take=50` | Get paginated messages |

---

### Activities 🔒

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workers/:id/activities?skip=0&take=20` | Activities for a worker |
| `GET` | `/api/activities?workspaceId=&skip=0&take=20` | Activities for a workspace |

All results are ordered newest first.

---

### Recommendations 🔒

#### `POST /api/recommendations/analyze`

Describe your business in natural language. Returns recommended AI workers — no workers are created automatically.

```json
// Request
{
  "workspaceId": "clx...",
  "businessDescription": "I run an online fashion store. I receive lots of customer questions, spend time following up with interested buyers, and constantly check order statuses."
}

// Response 200
{
  "summary": "Your business has several repetitive tasks...",
  "recommendations": [
    {
      "name": "Customer Support Worker",
      "role": "Customer Support",
      "description": "Answers common customer questions...",
      "reason": "Frequent customer questions are repetitive.",
      "responsibilities": ["Answer FAQs", "Explain policies", "Escalate complex questions"],
      "priority": "HIGH"
    }
  ]
}
```

---

### Dashboard 🔒

#### `GET /api/dashboard/overview?workspaceId=`

```json
{
  "totalWorkers": 3,
  "activeWorkers": 2,
  "pausedWorkers": 1,
  "totalConversations": 24,
  "totalMessages": 86,
  "totalEscalations": 4,
  "recentActivities": [
    {
      "id": "clx...",
      "type": "MESSAGE_SENT",
      "title": "Answered customer message",
      "description": "Store Assistant responded to...",
      "createdAt": "2026-09-11T10:00:00.000Z",
      "worker": { "name": "Store Assistant" }
    }
  ]
}
```

---

## Hackathon Scope

### What is implemented

- JWT authentication (register, login, protected routes)
- Full workspace CRUD with ownership enforcement
- AI worker generation from a natural-language job description
- Full worker CRUD with status machine (DRAFT → ACTIVE → PAUSED → ARCHIVED)
- Worker knowledge management (add, update, delete text knowledge)
- AI chat with workers — uses worker instructions + knowledge + conversation history
- Escalation detection — logged as an activity when AI cannot answer
- Conversation and message persistence with pagination
- Activity logging for all major events
- Business analysis with AI workforce recommendations
- Dashboard overview (worker counts, message counts, escalation counts, recent activity)
- Consistent response envelope (`{ success, data }` / `{ success, error }`)
- Swagger/OpenAPI documentation at `/api/docs`
- Demo mode (`AI_DEMO_MODE=true`) — full app runs without an OpenAI API key

### What is intentionally limited or simulated

- **Worker generation is a preview flow** — the AI returns a configuration that the user reviews before saving. No auto-save.
- **Recommendations do not auto-create workers** — the user reviews and chooses which recommendations to act on.
- **Knowledge is text-only** — no PDF, website, or document ingestion. The knowledge model is structured to support document types later via a `sourceType` field.
- **`WORKER_GENERATED` activity** is logged against an existing worker in the workspace. For the first worker created there is no anchor yet, so the event is omitted (the subsequent `WORKER_CREATED` covers the audit trail).
- **No refresh tokens** — JWTs expire after 7 days, re-login to get a new token.
- **No rate limiting** on AI endpoints — add `@nestjs/throttler` before production.

### What belongs to future versions

- WhatsApp, Telegram, Email, and third-party integrations
- Tool permissions (READ / WRITE / EXECUTE actions on real external systems)
- Document ingestion (PDF, Google Drive, Notion, websites)
- Advanced RAG with vector search
- Multi-worker handoffs and orchestration
- Refresh tokens and password reset
- Subscription and billing
- Marketplace / third-party developer platform
