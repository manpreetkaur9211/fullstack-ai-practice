const model = "global.anthropic.claude-opus-4-6-v1";
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

import { generateText, streamText, generateObject, ModelMessage } from "ai";
// import { anthropic } from "@ai-sdk/anthropic";
import { anthropic } from "./claude";
import { z } from "zod";

// ── EXAMPLE 1: generateText — simplest usage ─────────────────────────────────
//
// Use this when you need a full response (not streaming) for:
//   - Background processing, batch jobs, data enrichment, classification

async function classifyHealthAlert(
  metric: string,
  value: number,
): Promise<string> {
  const { text } = await generateText({
    model: anthropic(model), // Use Haiku for simple/fast tasks
    prompt: `
      A user's ${metric} reading is ${value}.
      Classify this as: "normal", "attention_needed", or "urgent".
      Respond with ONLY one of those three words.
    `,
    maxOutputTokens: 10,
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
  recommendations: z.array(
    z.object({
      action: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      category: z.enum(["lifestyle", "medical", "nutrition", "exercise"]),
    }),
  ),
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
    model: anthropic(model),
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
    model: anthropic(model),
    system: `You are a helpful health assistant. Provide clear,
             evidence-based health information. Always recommend
             consulting a doctor for medical decisions.`,
    prompt: question,
    maxOutputTokens: 500,
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
    model: anthropic(model),
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

const CategorySchema = z.object({
  category: z.enum([
    "symptom_report",
    "lifestyle_advice",
    "medication_query",
    "emergency",
    "general_health",
    "out_of_scope",
  ]),
  confidence: z.enum(["high", "low"]),
});
type CategoryResult = z.infer<typeof CategorySchema>;
async function categorizeUserQuestion(
  question: string,
): Promise<CategoryResult> {
  const { text } = await generateText({
    model: anthropic(model),
    prompt: `
      Classify this health question into one of:
      "symptom_report", "lifestyle_advice", "medication_query",
      "emergency", "general_health", or "out_of_scope".

      Question: "${question}"

      Respond in JSON format: { category: string, confidence: string }
    `,
    maxOutputTokens: 50,
  });

  try {
    const result = JSON.parse(text);
    const parsed: CategoryResult = CategorySchema.parse(result);
    if (parsed.category === "emergency") {
      console.warn(
        "⚠️ Emergency question detected! Immediate attention needed.",
      );
    }
    return parsed;
  } catch (error) {
    console.error("Failed to categorize question:", error);
    return { category: "out_of_scope", confidence: "low" };
  }
}
// TODO: Implement categorizeUserQuestion
// TODO: Test with these questions:
const runClassification = async () => {
  console.log(
    await categorizeUserQuestion(
      "I have a headache and fever, what should I do?",
    ),
  );
  console.log(
    await categorizeUserQuestion("How many steps should I walk each day?"),
  );
  console.log(await categorizeUserQuestion("What is the capital of France?"));
  console.log(
    await categorizeUserQuestion(
      "My heart rate has been 120bpm all day, is that normal?",
    ),
  );
  console.log(
    await categorizeUserQuestion(
      "Should I take ibuprofen with my blood pressure medication?",
    ),
  );
  //   "How many steps should I walk each day?"
  //   "What is the capital of France?"
  //   "My heart rate has been 120bpm all day, is that normal?"
  //   "Should I take ibuprofen with my blood pressure medication?"
}
//uncomment to run the classification tests
// await runClassification();

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

const runGenerationInsight = () =>
  generateHealthInsight({
    heartRate: 95,
    steps: 3200,
    sleepHours: 5.5,
    calories: 1800,
  })
    .then((insight) => {
      console.log("Full Insight:", insight);
      console.log("Formatted Insight:\n", formatInsightForDisplay(insight));
    })
    .catch((error) => {
      console.error("Error generating health insight:", error);
      const unavailableInsight: HealthInsight = {
        summary: "Health insight unavailable",
        risks: [],
        recommendations: [],
        overallScore: 0,
        needsAttention: false,
      };
      console.log(
        "Formatted Insight:\n",
        formatInsightForDisplay(unavailableInsight),
      );
    });

const formatInsightForDisplay = (insight: HealthInsight): string => {
  const priorityEmoji = {
    low: "🟢",
    medium: "🟡",
    high: "🔴",
  };

  const recommendations = insight.recommendations
    .map((rec) => {
      return `${priorityEmoji[rec.priority]} [${rec.category}] ${rec.action}`;
    })
    .join("\n");

  return `
Summary: ${insight.summary}
Risks: ${insight.risks.join(", ") || "None"}
Recommendations:
${recommendations || "No specific recommendations"}
Overall Health Score: ${insight.overallScore}/100
Needs Attention: ${insight.needsAttention ? "Yes" : "No"}
  `.trim();
};
//uncomment to run the generation with the first set of metrics
// runGenerationInsight();
// TODO: Add error handling with a fallback
const runGeneration = () =>
  generateHealthInsight({
    heartRate: 62,
    steps: 12000,
    sleepHours: 8,
    calories: 2400,
  })
    .catch((error) => {
      console.error("Error generating health insight:", error);
      return {
        summary: "Health insight unavailable",
        risks: [],
        recommendations: [],
        overallScore: 0,
        needsAttention: false,
      } as HealthInsight;
    })
    .then((insight) => {
      console.log("Formatted Insight:\n", formatInsightForDisplay(insight));
    });

// Uncomment to run the generation with error handling
// runGeneration();

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

const processBatch = async <T>(
  items: T[],
  processor: (item: T) => Promise<HealthInsight>,
  options: { concurrency: number; delayMs: number },
): Promise<{ item: T; result: HealthInsight | Error }[]> => {
  const results: { item: T; result: HealthInsight | Error }[] = [];
  for (let i = 0; i < items.length; i += options.concurrency) {
    const batch = items.slice(i, i + options.concurrency);
    console.log(
      `Processing batch ${Math.floor(i / options.concurrency) + 1}/${Math.ceil(items.length / options.concurrency)} (${batch.length} items)...`,
    );

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await processor(item);
          return { item, result };
        } catch (error) {
          return {
            item,
            result: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }),
    );

    results.push(...batchResults);
    if (i + options.concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }
  return results;
};

const fakeUserMetrics = Array.from({ length: 20 }, (_, i) => ({
  userId: i + 1,
  heartRate: 60 + Math.floor(Math.random() * 40),
  steps: 2000 + Math.floor(Math.random() * 10000),
  sleepHours: 4 + Math.random() * 4,
  calories: 1500 + Math.floor(Math.random() * 1500),
}));

const executeProcessing = () =>
  processBatch(fakeUserMetrics, generateHealthInsight, {
    concurrency: 3,
    delayMs: 2000,
  }).then((results) => {
    results.forEach(({ item, result }) => {
      if (result instanceof Error) {
        console.error(`User ${item.userId}: Failed to process -`, result);
      } else {
        console.log(`User ${item.userId}:`, formatInsightForDisplay(result));
      }
    });
  });

// Uncomment to run batch processing
// async function runBatchProcessing() {
//   console.log("Starting batch processing of user health insights...");
//   await executeProcessing();
//   console.log("Batch processing complete.");
// }

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

const readline = require("readline");

async function healthCoachingSession() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const systemPrompt = `
    You are a personal health coach. You have access to the
    user's health metrics (provided in the first message). Be encouraging,
    specific, and evidence-based. Keep responses under 150 words.
  `;

  const initialMetrics = {
    heartRate: 95,
    steps: 3200,
    sleepHours: 5.5,
    calories: 1800,
  };

  let conversationHistory: ModelMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Here are my health metrics: ${JSON.stringify(initialMetrics)}`,
    },
  ];

  let cumulativeTokens = 0;

  const askQuestion = () => {
    rl.question("You: ", async (input: string) => {
      if (input.trim() === "/summary") {
        const summary = await generateObject({
          model: anthropic(model),
          schema: z.object({
            keyInsights: z.array(z.string()),
            actionItems: z.array(z.string()),
            overallSentiment: z.enum(["positive", "neutral", "negative"]),
          }),
          prompt: `
          Summarize this coaching session:
          ${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}

          Provide key insights, action items, and overall sentiment.
        `,
        });
        console.log("Session Summary:", summary.object);
        askQuestion();
        return;
      }

      conversationHistory.push({ role: "user", content: input });

      try {
        const { textStream, usage } = await streamText({
          model: anthropic(model),
          system: systemPrompt,
          messages: conversationHistory,
        });

        process.stdout.write("Coach: ");
        let fullResponse = "";
        for await (const chunk of textStream) {
          process.stdout.write(chunk);
          fullResponse += chunk;
        }
        console.log("\n");

        const usageResult = await usage;
        cumulativeTokens += usageResult.totalTokens || 0;
        console.log(`Cumulative tokens used: ${cumulativeTokens}`);

        conversationHistory.push({ role: "assistant", content: fullResponse });
      } catch (error) {
        console.error("Error during coaching session:", error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Uncomment to start the coaching session REPL
healthCoachingSession();

export { generateHealthInsight, streamHealthAdvice, classifyHealthAlert };
