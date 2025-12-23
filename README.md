# AI-Powered Live Chat Agent

A full-stack chat application with AI assistant capabilities, built with SvelteKit (frontend) and Express + TypeScript (backend).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- OpenAI API key OR Anthropic API key

### Local Development (Recommended)

**1. Clone and Install**
```bash
git clone <repository-url>
cd <project-directory>
npm install
```

This installs all dependencies for both backend and frontend (npm workspaces).

**2. Start Database Services (Docker)**
```bash
docker compose up -d postgres redis
```

**3. Configure Environment**

Create `packages/backend/.env.local`:
```env
# Database (local)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=chat_agent
DATABASE_USER=chat_user
DATABASE_PASSWORD=secure_password

# LLM Provider (choose one)
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_api_key_here

# OR use Anthropic
# LLM_PROVIDER=anthropic
# LLM_API_KEY=your_anthropic_api_key_here

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

Create `packages/frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3000/api
```

**4. Run Database Migrations**
```bash
cd packages/backend
npm run migrate
```

**5. Start Development Servers**

Terminal 1 - Backend:
```bash
cd packages/backend
npx tsx watch src/index.ts
```

Terminal 2 - Frontend:
```bash
cd packages/frontend
npm run dev
```

**6. Open Application**

Visit: `http://localhost:5173`

---

### Docker Production Setup

**1. Configure Environment**

Create `packages/backend/.env`:
```env
# Database (Docker internal)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=chat_agent
DATABASE_USER=chat_user
DATABASE_PASSWORD=secure_password

# LLM Provider
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_api_key_here

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:3001
```

**2. Build and Run**
```bash
docker compose up -d
```

**3. Run Migrations**
```bash
docker exec chat_agent_backend npm run migrate
```

**4. Access Application**

Visit: `http://localhost:5173`

---

## 🏗️ Architecture

### Backend Structure
```
packages/backend/src/
├── config/           # Database, Redis, environment configuration
├── modules/
│   ├── chat/        # Chat endpoints & business logic
│   ├── llm/         # LLM provider abstraction & prompting
│   └── persistence/ # Database repository layer
├── types/           # TypeScript type definitions
└── index.ts         # Server entry point
```

**Layer Design:**
- **Routes Layer**: Express route handlers, request validation
- **Service Layer**: Business logic, orchestration between LLM and persistence
- **Repository Layer**: Database operations, query abstraction
- **Config Layer**: Environment detection, database initialization, FAQ knowledge
- **Inline Middleware**: CORS and body parsing configured in index.ts

### Frontend Structure
```
packages/frontend/src/
├── lib/
│   ├── api.ts              # API client functions
│   ├── stores.ts           # Svelte stores (state management)
│   ├── ChatWidget.svelte   # Main chat interface
│   ├── ChatMessage.svelte  # Message display component
│   └── ConversationList.svelte # Sidebar with conversation history
└── routes/
    └── +page.svelte        # Main application page
```

### Key Design Decisions

**1. Environment Auto-Detection**
- Local dev: Uses `.env.local` with `localhost` for DB/Redis
- Docker: Uses `.env` with service names (`postgres`, `redis`)
- Backend checks for `.env.local` first, preventing environment confusion

**2. LLM Provider Abstraction**
- Factory pattern for OpenAI/Anthropic switching
- Unified interface regardless of provider
- Rate limiting and error handling at service level

**3. Conversation Persistence**
- PostgreSQL with CASCADE DELETE (deleting conversation removes all messages)
- UUID-based conversation IDs for security
- Timezone-aware timestamps (`TIMESTAMPTZ`) for correct local time display

**4. Collapsible Sidebar**
- Conversation list shows recent chats with 16-char UUID prefix
- Delete functionality with confirmation
- Relative timestamps ("Just now", "5h ago", "2d ago")

**5. State Management**
- Svelte stores for centralized state
- API calls abstracted into `api.ts` for reusability
- Auto-refresh conversation list after operations

---

## 🤖 LLM Configuration

### Provider
Using **OpenAI GPT-3.5-turbo** (switchable to Anthropic Claude 3.5 Sonnet)

### Prompting Strategy
```typescript
System Prompt:
- Base role: "Helpful AI assistant for a retail/service company"
- Knowledge injection: FAQ content embedded in context
- Guardrails: Content filtering, topic boundaries, escalation rules
- Output style: Concise, professional, on-brand

User Context:
- Conversation history included for continuity
- Latest message appended to thread
```

### Knowledge Base
FAQ content stored in `packages/backend/src/config/faq.ts`:
- Store hours, shipping, returns, contact info
- Injected into every LLM request via system prompt
- Easy to update without code changes

### Error Handling
- LLM provider error handling with fallback messages
- API rate limit detection (429 errors)
- Graceful degradation for LLM failures

---

## 🔧 Trade-offs & Future Improvements

### Current Limitations

**1. In-Memory Session Management**
- No authentication system (would add JWT/OAuth)
- Sessions not persisted (would use Redis sessions)
- No user accounts/multi-tenancy

**2. LLM Context Window**
- Loads full conversation history every request (inefficient for long chats)
- Would implement: Sliding context window (last N messages) + summarization

**3. Error Handling**
- Basic error responses without detailed logging
- Would add: Structured logging (Winston/Pino), error tracking (Sentry)

**4. Testing**
- No test coverage
- Would add: Unit tests (Vitest), integration tests (Supertest), E2E tests (Playwright)

**5. Scalability**
- Single-instance backend (no horizontal scaling)
- Would add: Load balancer, stateless design, shared session store

### If I Had More Time...

**Backend:**
- Implement streaming responses (Server-Sent Events) for real-time AI typing
- Add conversation summarization for long threads
- Implement webhook system for async LLM processing
- Add analytics/telemetry (conversation metrics, LLM token usage)
- Implement vector DB (Pinecone/Qdrant) for semantic FAQ search

**Frontend:**
- Add markdown rendering for AI responses
- Implement typing indicators
- Add file upload support (images, documents)
- Offline support with service workers
- Voice input/output

**Infrastructure:**
- CI/CD pipeline (GitHub Actions)
- Kubernetes deployment manifests
- Monitoring stack (Prometheus + Grafana)
- Automated backups for PostgreSQL

**Features:**
- Multi-language support (i18n)
- Conversation search functionality
- Export conversation as PDF/text
- Admin dashboard for monitoring conversations
- Feedback system (thumbs up/down on AI responses)

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/message` | Send message and get AI response |
| `GET` | `/api/chat/history/:id` | Fetch conversation message history |
| `GET` | `/api/chat/conversations` | List all conversations (last 50) |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |
| `GET` | `/api/health` | Health check endpoint |

---

## 🛠️ Troubleshooting

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Database connection failed:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker compose restart postgres
```

**Fresh database reset:**
```bash
# Stop and remove database volume
docker compose down -v
docker compose up -d postgres

# Run migrations again
cd packages/backend && npm run migrate
```

---

## 📦 Tech Stack

**Frontend:** SvelteKit 2, Vite, TypeScript  
**Backend:** Express, TypeScript, postgres.js  
**Database:** PostgreSQL 16  
**Cache:** Redis 7 (available but not actively used)  
**LLM:** OpenAI GPT-3.5-turbo / Anthropic Claude 3.5 Sonnet  
**DevOps:** Docker, Docker Compose
