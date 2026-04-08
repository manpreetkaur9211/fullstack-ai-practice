// =============================================================================
// VERCEL AI SDK — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// The Vercel AI SDK is the standard way to add AI to Next.js applications.
// It provides:
//   - React hooks: useChat, useCompletion, useObject
//   - Server-side helpers: streamText, generateText, generateObject
//   - Provider adapters: Anthropic, OpenAI, Google, etc.
//   - Streaming: real-time token-by-token responses in the UI
//
// WHY THIS MATTERS IN INTERVIEWS:
//   - "AI integration" is now a real job requirement, not a nice-to-have
//   - Vercel AI SDK is the most widely adopted solution in React/Next.js ecosystem
//   - You can demonstrate it directly from your Yeyro work
//   - Most Melbourne startups use Next.js — AI SDK familiarity is valued
//
// SETUP (run once):
//   npm install ai @ai-sdk/anthropic zod
//   echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
//
// ── HOW IT WORKS ─────────────────────────────────────────────────────────────
//
// The AI SDK has two layers:
//
//   1. SERVER LAYER (Node.js / Next.js Route Handlers)
//      - generateText()   → complete the prompt, return full string
//      - streamText()     → stream tokens back to client
//      - generateObject() → generate structured JSON (uses Zod schema)
//
//   2. CLIENT LAYER (React hooks in browser)
//      - useChat()        → manages a chat conversation with streaming
//      - useCompletion()  → single-prompt completions
//      - useObject()      → stream structured data progressively

import { generateText, streamText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// ── EXAMPLE 1: generateText — simplest usage ─────────────────────────────────
//
// Use this when you need a full response (not streaming) for:
//   - Background processing, batch jobs, data enrichment, classification

async function classifyHealthAlert(metric: string, value: number): Promise<string> {
  const { text } = await generateText({
    model: anthropic("claude-3-5-haiku-20241022"), // Use Haiku for simple/fast tasks
    prompt: `
      A user's ${metric} reading is ${value}.
      Classify this as: "normal", "attention_needed", or "urgent".
      Respond with ONLY one of those three words.
    `,
    maxTokens: 10,
  });
  return text.trim();
}

// ── EXAMPLE 2: generateObject — structured output with Zod ───────────────────
//
// This is powerful: you define the shape of the output using Zod,
// and the AI SDK ensures the LLM returns valid JSON matching that schema.
// No more regex parsing or hoping the LLM returns valid JSON.

const HealthInsightSchema = z.object({
  summary: z.string().describe("One-sentence summary of the health data"),
  risks: z.array(z.string()).describe("List of identified health risks"),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    category: z.enum(["lifestyle", "medical", "nutrition", "exercise"]),
  })),
  overallScore: z.number().min(0).max(100).describe("Overall health score"),
  needsAttention: z.boolean(),
});

type HealthInsight = z.infer<typeof HealthInsightSchema>;

async function generateHealthInsight(metrics: {
  heartRate: number;
  steps: number;
  sleepHours: number;
  calories: number;
}): Promise<HealthInsight> {
  const { object } = await generateObject({
    model: anthropic("claude-3-5-sonnet-20241022"),
    schema: HealthInsightSchema,
    prompt: `
      Analyze these daily health metrics and provide insights:
      - Heart rate: ${metrics.heartRate} bpm (resting)
      - Steps: ${metrics.steps}
      - Sleep: ${metrics.sleepHours} hours
      - Calories burned: ${metrics.calories}

      Provide practical, evidence-based health insights.
    `,
  });
  return object;
}

// ── EXAMPLE 3: streamText — for real-time responses ──────────────────────────
//
// In Next.js, you'd use this in a Route Handler and stream back to useChat.
// Here shown as a Node.js example:

async function streamHealthAdvice(question: string): Promise<void> {
  const { textStream } = await streamText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: `You are a helpful health assistant. Provide clear,
             evidence-based health information. Always recommend
             consulting a doctor for medical decisions.`,
    prompt: question,
    maxTokens: 500,
  });

  process.stdout.write("\nResponse: ");
  for await (const chunk of textStream) {
    process.stdout.write(chunk); // Each chunk arrives as tokens stream in
  }
  console.log("\n");
}

// ── EXAMPLE 4: Next.js Route Handler (how it looks in a real app) ─────────────
//
// This would be in: app/api/chat/route.ts
// (Shown here as reference — not executable in Node without Next.js)

/*
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: "You are a helpful health coach assistant.",
    messages, // Full conversation history from useChat hook
  });

  return result.toDataStreamResponse(); // Streams back to useChat hook
}
*/

// ── EXAMPLE 5: React useChat hook (frontend side) ─────────────────────────────
//
// This would be in a React component. Shown as reference:

/*
"use client";
import { useChat } from "ai/react";

export function HealthChatbot() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
*/

// =============================================================================
// CHALLENGES
// =============================================================================
//
// Before starting: set up your .env file with ANTHROPIC_API_KEY
// Run: npx ts-node 04-ai-integration/01-vercel-ai-basics/index.ts
//
// =============================================================================

// 🟢 CHALLENGE 1 — Text classification (20 min)
// ────────────────────────────────────────────────
// Write a function `categorizeUserQuestion(question: string)` that uses
// generateText to classify a user's health question into one of:
//   "symptom_report" | "lifestyle_advice" | "medication_query" |
//   "emergency" | "general_health" | "out_of_scope"
//
// Requirements:
//   - Use claude-3-5-haiku (fast + cheap for classification)
//   - Return a typed result: { category: Category; confidence: "high" | "low" }
//   - If the model returns "emergency", also log a warning immediately
//   - Test with 5 different questions
//
// Tip: Ask the model to respond in JSON format or use generateObject with Zod

// TODO: Define Category type
// TODO: Implement categorizeUserQuestion
// TODO: Test with these questions:
//   "I have chest pain and shortness of breath"
//   "How many steps should I walk each day?"
//   "What is the capital of France?"
//   "My heart rate has been 120bpm all day, is that normal?"
//   "Should I take ibuprofen with my blood pressure medication?"


// 🟢 CHALLENGE 2 — Structured health summary (20 min)
// ─────────────────────────────────────────────────────
// Call the `generateHealthInsight` function above (it's already implemented)
// with these sample metrics and:
//
// a) Print the full structured response
// b) Write a function `formatInsightForDisplay(insight: HealthInsight): string`
//    that returns a nicely formatted string with emojis for priorities
//    (🔴 high, 🟡 medium, 🟢 low)
// c) Add error handling: if the API call fails, return a default "unavailable" insight
//
// Sample data to use:
//   { heartRate: 95, steps: 3200, sleepHours: 5.5, calories: 1800 }
//   { heartRate: 62, steps: 12000, sleepHours: 8, calories: 2400 }

// TODO: Call generateHealthInsight with both sample datasets
// TODO: Implement formatInsightForDisplay
// TODO: Add error handling with a fallback


// 🟡 CHALLENGE 3 — Batch processing with rate limiting (30 min)
// ──────────────────────────────────────────────────────────────
// You have 20 users. Each has daily health metrics. You need to generate
// an insight for each user — but you can't hammer the API with 20 parallel requests.
//
// Write `processBatch<T>(
//   items: T[],
//   processor: (item: T) => Promise<HealthInsight>,
//   options: { concurrency: number; delayMs: number }
// ): Promise<{ item: T; result: HealthInsight | Error }[]>`
//
// Requirements:
//   - Process `concurrency` items at a time (e.g., 3 at once)
//   - Wait `delayMs` between batches
//   - Never let a single failure stop the whole batch
//   - Return results with the original item, pairing each item to its result or error
//   - Log progress: "Processing batch 1/7 (3 items)..."
//
// Test it with 10 fake user metrics objects

// TODO: Implement processBatch
// TODO: Test with 10 fake health metrics


// 🔴 CHALLENGE 4 — Multi-turn health coaching session (35 min)
// ─────────────────────────────────────────────────────────────
// Build a stateful health coaching session in the terminal using streamText.
// The coach remembers the conversation history and can reference previous messages.
//
// Requirements:
//   1. System prompt: "You are a personal health coach. You have access to the
//      user's health metrics (provided in the first message). Be encouraging,
//      specific, and evidence-based. Keep responses under 150 words."
//
//   2. First message: automatically send the user's health metrics as context
//      (use the sample data from Challenge 2)
//
//   3. Allow back-and-forth: read user input from terminal (use readline),
//      send to Claude with full history, stream the response
//
//   4. Track token usage: after each exchange, log the cumulative token count
//      (AI SDK returns usage in the result object)
//
//   5. Add a /summary command: when user types /summary, generate a structured
//      summary of the coaching session using generateObject
//
// This is a real pattern for any AI-powered chat feature you'd build in React.

// TODO: Implement the health coaching session REPL

export { generateHealthInsight, streamHealthAdvice, classifyHealthAlert };
