# AI Integration

## Your Biggest Interview Differentiator

Most candidates applying for React/Node.js roles in Melbourne in 2026 cannot talk about AI integration with any depth. You can — and this folder gives you the hands-on proof.

---

## Setup (do this first)

```bash
# From repo root
npm install @anthropic-ai/sdk ai @ai-sdk/anthropic zod dotenv

# Create your .env file
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > .env
```

Get your Anthropic API key at: https://console.anthropic.com

**Cost estimate:** Running all exercises costs approximately $0.50–2.00 USD total using Claude 3.5 Haiku for simple tasks and Sonnet for complex ones.

---

## Exercises

| Folder | Topic | Start Here? | Portfolio Value |
|--------|-------|------------|----------------|
| `01-vercel-ai-basics/` | Vercel AI SDK: generateText, generateObject, streamText | ✅ Yes | ⭐⭐⭐ |
| `02-claude-api/` | Anthropic SDK: direct API, tool use, agents | After 01 | ⭐⭐⭐⭐ |
| `03-streaming/` | Token streaming, performance, Next.js integration | After 02 | ⭐⭐⭐⭐ |
| `04-health-data-pipeline/` | **Full pipeline project — your #1 portfolio piece** | After 03 | ⭐⭐⭐⭐⭐ |

---

## The Learning Path

### Step 1: Understand the landscape (Day 1)
AI SDKs are just libraries. They take text in, return text out. The "magic" is:
- The model (Claude) understands context and intent
- `generateObject` + Zod makes outputs structured and type-safe
- `streamText` makes responses feel instant
- Tool use lets Claude call YOUR code

### Step 2: Build simple completions (Day 1-2)
Start in `01-vercel-ai-basics/`. Get a response, get structured output. Run it, see it work.

### Step 3: Add tool use (Day 3)
In `02-claude-api/`, Claude decides when to call your functions. This is the basis of AI agents.

### Step 4: Add streaming (Day 4)
In `03-streaming/`, see the difference between waiting vs streaming. Build the Next.js chatbot.

### Step 5: Build the full pipeline (Day 5-7)
`04-health-data-pipeline/` is your capstone. It combines:
- Node.js streams (data ingestion)
- TypeScript (full type safety throughout)
- Claude (AI enrichment of health data)
- Notification generation
- Error handling at every stage

This is the project you demo in interviews.

---

## How to Talk About This in Interviews

**When asked: "Tell me about your AI experience"**

*"I've built production AI integrations using both the Vercel AI SDK and the Anthropic SDK directly. The most substantial was a health data pipeline — raw wearable sensor data comes in as events, gets validated and aggregated, then I use Claude with structured output (Zod schema) to generate personalised health insights. The output drives a real-time notification engine. I also built streaming responses for a chat interface — the latency difference between streamed and non-streamed is significant. I've implemented tool use for agentic workflows where Claude decides when to query a database or trigger notifications."*

This answer is backed by the actual code in this folder.

---

## Key Concepts to Understand Deeply

1. **generateObject + Zod** — this is the pattern you'll use most. Structured AI output with compile-time type safety.

2. **Tool use / function calling** — Claude can call your functions. You define the tools, Claude decides when to use them.

3. **Streaming** — how it works at the protocol level (Server-Sent Events), not just the API.

4. **Token costs** — Haiku vs Sonnet vs Opus: when to use each, rough cost per 1M tokens.

5. **Error handling** — LLMs sometimes fail, return malformed JSON, time out. Always handle gracefully.
