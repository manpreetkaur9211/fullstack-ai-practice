# Full-Stack + AI Practice Repository

**Manpreet Kaur · Senior Full-Stack Engineer · Melbourne, AU**

A self-directed learning repository covering TypeScript, React 19, Next.js 15, AI integration with the Anthropic/Vercel AI SDK, and data pipeline engineering. Every exercise follows the format: **concept explanation → working examples → timed challenge**.

Built to target Senior Full-Stack roles in the Australian market (2026).

---

## Repository Structure

```
fullstack-ai-practice/
├── 01-typescript-mastery/       ← Weeks 1–2 | Interview-critical
│   ├── 01-generics.ts
│   ├── 02-utility-types.ts
│   ├── 03-discriminated-unions.ts
│   └── 04-advanced-patterns.ts
│
├── 02-react-19-patterns/        ← Weeks 2–3 | Senior React depth
│   ├── 01-use-hook.tsx
│   ├── 02-optimistic-updates.tsx
│   └── 03-concurrent-features.tsx
│
├── 03-nextjs-15-patterns/       ← Weeks 3–4 | App Router mastery
│   ├── 01-server-vs-client.md
│   ├── 02-server-actions.ts
│   └── 03-data-fetching-patterns.ts
│
├── 04-ai-integration/           ← Weeks 4–6 | Your key differentiator
│   ├── 01-vercel-ai-basics/     ← Start here for AI
│   ├── 02-claude-api/           ← Anthropic direct integration
│   ├── 03-streaming/            ← Real-time AI responses
│   └── 04-health-data-pipeline/ ← Full AI pipeline (portfolio piece)
│
├── 05-data-pipelines/           ← Weeks 5–6 | Backend depth
│   ├── 01-node-streams.ts
│   ├── 02-event-driven.ts
│   └── 03-queue-simulation.ts
│
└── 06-architect-thinking/       ← Weeks 1–8 (parallel track) | Senior/Staff signal
    ├── 01-system-design/
    │   ├── design-framework.md  ← The SACRED framework + timing guide
    │   └── case-studies.md      ← 5 timed case studies (45 min each)
    ├── 02-frontend-architecture/
    │   └── frontend-patterns.ts ← State architecture, compound components, virtual scroll
    ├── 03-api-design/
    │   └── api-design-patterns.ts ← Rate limiters, idempotency, versioning, pagination
    └── 04-cloud-infra/
        └── cloud-patterns.md    ← Twelve-factor, CI/CD, observability, IaC, cost
```

---

## How to Use Each Exercise

Every `.ts` / `.tsx` file follows this structure:

1. **CONCEPT** — Plain-English explanation of what and why
2. **HOW IT WORKS** — Annotated code showing the pattern
3. **REAL-WORLD USAGE** — How this appears in production codebases
4. **CHALLENGES** — Numbered TODOs, progressive difficulty
   - 🟢 Easy — implement the basic pattern
   - 🟡 Medium — extend or adapt the pattern
   - 🔴 Hard — solve a real-world problem using the concept

---

## Setup

```bash
# Clone your repo
git clone https://github.com/manpreetkaur9211/fullstack-ai-practice.git
cd fullstack-ai-practice

# Install dependencies
npm init -y
npm install typescript ts-node @types/node
npm install @anthropic-ai/sdk ai zod

# For AI exercises — create a .env file:
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run any TypeScript file
npx ts-node 01-typescript-mastery/01-generics.ts

# Check your TypeScript
npx tsc --noEmit
```

**tsconfig.json (add to root):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  }
}
```

---

## Topic Map → 8-Week Plan

| Week | Topic | Files | Daily Time |
|------|-------|-------|------------|
| 1 | TypeScript Generics + Utility Types | `01-ts/01`, `01-ts/02` | 1 hr study + 2 hrs code |
| 2 | Discriminated Unions + Advanced Patterns | `01-ts/03`, `01-ts/04` | 1 hr study + 2 hrs code |
| 3 | React 19 new features + Next.js App Router | `02-react/`, `03-nextjs/` | 1 hr study + 2 hrs code |
| 4 | Vercel AI SDK basics + Claude API | `04-ai/01`, `04-ai/02` | 1 hr study + 2 hrs code |
| 5 | Streaming + Data Pipelines | `04-ai/03`, `05-pipelines/` | 1 hr study + 2 hrs build |
| 6 | **Health Data Pipeline (portfolio project)** | `04-ai/04` | Full 3 hrs |
| 7 | Integration + polish all projects | All | 3 hrs |
| 8 | Interview practice using these projects | All | 3 hrs |

---

## Interview Tip

Every project here maps directly to above skills. When asked *"Tell me about your experience with AI pipelines"* — you point to `04-health-data-pipeline`. When asked *"Show me your TypeScript"* — you walk them through `03-discriminated-unions`. **These are not toy exercises. They are interview evidence.**

---

*Part of a structured job search plan · April–June 2026*
