# ContextRouter MVP

ContextRouter is a run-based orchestration web app for model routing, side-by-side comparison, prompt diffing, chaining, and session memory.

## Stack
- TypeScript (end-to-end)
- Next.js 15 (App Router) + React + Tailwind
- Prisma + PostgreSQL
- Zod schemas
- `diff-match-patch` for prompt diffs
- Structured JSON logs with `trace_id` per run

## Core Architecture
ContextRouter is built around persistent orchestration primitives so AgentRouter can be added later without core refactors.

- `Session`: long-lived thread/project
- `Run`: one routed user intent
- `Step`: atomic model/tool operation (parallel or sequential)
- `Artifact`: persisted output (final answer/code/etc)
- `MemoryItem`: durable model-agnostic memory

Key implementation folders:
- `src/lib/engine/*`: DAG planner + executor (`buildRun`, `planSteps`, `executeRun`)
- `src/lib/providers/*`: isolated provider adapters (OpenAI + mock + typed stubs)
- `src/lib/context/compiler.ts`: deterministic context compiler (recent turns + top-K memory)
- `src/lib/router/*`: deterministic explainable router
- `src/app/api/*`: clean API boundary route handlers

## Setup
1. Copy environment file:
```bash
cp .env.example .env
```

2. Start PostgreSQL:
```bash
docker compose up -d
```

3. Install dependencies:
```bash
npm install
```

4. Generate Prisma client + run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development Commands
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm run test`
- Prisma generate: `npm run prisma:generate`
- Prisma migrate: `npm run prisma:migrate`
- Prisma db push: `npm run prisma:push`

## Mock Mode vs OpenAI Mode
### Mock (default)
- Keep `DEMO_MODE="true"` (default in `.env.example`), or omit `OPENAI_API_KEY`.
- App runs fully with deterministic mock responses.

### OpenAI
1. Set:
```bash
OPENAI_API_KEY="your_key"
DEMO_MODE="false"
```
2. Optional model configuration:
```bash
OPENAI_DEFAULT_MODEL_ID="gpt-4o-mini"
OPENAI_COMPARE_MODEL_IDS="gpt-4o-mini,gpt-4.1-mini,gpt-4.1"
```

If OpenAI requests fail, provider adapter falls back to mock responses so runs still complete.

## API Endpoints
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/message`
- `POST /api/runs/:id/execute`
- `GET /api/runs/:id`
- `GET /api/sessions/:id/memory`
- `POST /api/sessions/:id/memory`
- `PATCH /api/memory/:id`
- `DELETE /api/memory/:id`

## Notes
- Raw prompts are persisted in DB (`Step.renderedPrompt`) for inspector/diff features.
- Raw prompts are intentionally not logged in server logs.
- Logs include trace/run/step identifiers and usage metrics only.
