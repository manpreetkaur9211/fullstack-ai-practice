// =============================================================================
// ANTHROPIC CLAUDE API — Direct SDK Usage
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// The Anthropic SDK gives you direct access to Claude without going through
// the Vercel AI SDK abstraction layer. You use this when you need:
//   - Full control over the request/response
//   - Tool use (function calling) — Claude can call YOUR functions
//   - Advanced message structures (images, documents, tool results)
//   - Production server-side processing (not browser-facing)
//   - Batch processing large datasets with Claude
//
// WHEN TO USE ANTHROPIC SDK DIRECTLY vs VERCEL AI SDK:
//   Vercel AI SDK: Next.js apps, React chat interfaces, streaming to browser
//   Anthropic SDK: Backend pipelines, tool use, complex agents, non-Next.js
//
// SETUP:
//   npm install @anthropic-ai/sdk
//   export ANTHROPIC_API_KEY=sk-ant-...
//
// ── HOW IT WORKS ─────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Reads from env automatically
});

// ── BASIC MESSAGE ─────────────────────────────────────────────────────────────

async function simpleMessage(): Promise<void> {
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 256,
    messages: [
      { role: "user", content: "Explain what a data pipeline is in 2 sentences." }
    ],
  });

  // The response structure:
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  console.log("Response:", text);
  console.log("Tokens used:", message.usage.input_tokens, "in /", message.usage.output_tokens, "out");
  console.log("Stop reason:", message.stop_reason); // "end_turn", "max_tokens", "tool_use"
}

// ── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
//
// A system prompt sets the role, tone, and constraints for the entire conversation.
// This is how you "configure" Claude for a specific use case.

async function withSystemPrompt(userQuery: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 512,
    system: `You are a senior software engineer reviewing code for production readiness.
             For every piece of code you review:
             1. Identify potential bugs or edge cases
             2. Comment on performance implications
             3. Suggest TypeScript improvements if applicable
             Format your response as: ISSUES | PERFORMANCE | TYPESCRIPT`,
    messages: [
      { role: "user", content: userQuery }
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ── MULTI-TURN CONVERSATIONS ─────────────────────────────────────────────────
//
// Claude doesn't have memory between API calls — you must send the full
// conversation history every time. This is the fundamental pattern.

interface Message {
  role: "user" | "assistant";
  content: string;
}

class ConversationSession {
  private history: Message[] = [];
  private systemPrompt: string;

  constructor(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
  }

  async chat(userMessage: string): Promise<string> {
    // Add the user message to history
    this.history.push({ role: "user", content: userMessage });

    // Send the FULL history every time
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: this.history, // Full conversation history
    });

    const assistantReply = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    // Store the assistant reply too, for next turn
    this.history.push({ role: "assistant", content: assistantReply });

    return assistantReply;
  }

  getHistory(): Message[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

// ── TOOL USE (Function Calling) ──────────────────────────────────────────────
//
// This is the most powerful Claude feature for building agents.
// You define "tools" that Claude can call, and Claude decides WHEN to call them.
//
// Flow:
//   1. You send a message + tool definitions
//   2. Claude decides to call a tool → responds with tool_use content
//   3. You execute the actual function
//   4. You send the result back as a tool_result message
//   5. Claude uses the result to formulate its final answer
//
// Use case: Claude can look up real-time data, call your APIs, run calculations

const healthTools: Anthropic.Tool[] = [
  {
    name: "get_user_metrics",
    description: "Retrieve a user's health metrics for a given date range",
    input_schema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user's ID" },
        startDate: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
        endDate: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
        metricTypes: {
          type: "array",
          items: { type: "string", enum: ["heart_rate", "steps", "sleep_hours", "calories"] },
          description: "Which metrics to retrieve",
        },
      },
      required: ["userId", "startDate", "endDate"],
    },
  },
  {
    name: "create_health_alert",
    description: "Create an alert for a user when a health metric is abnormal",
    input_schema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        alertType: { type: "string", enum: ["warning", "urgent", "info"] },
        metric: { type: "string" },
        message: { type: "string", description: "Clear, actionable message for the user" },
      },
      required: ["userId", "alertType", "metric", "message"],
    },
  },
];

// Mock tool implementations (in real life, these would call your database/API)
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_user_metrics":
      // In real life: query your database
      return JSON.stringify({
        userId: toolInput.userId,
        metrics: [
          { type: "heart_rate", value: 92, date: toolInput.startDate },
          { type: "steps", value: 3200, date: toolInput.startDate },
          { type: "sleep_hours", value: 5.5, date: toolInput.startDate },
        ],
      });

    case "create_health_alert":
      // In real life: write to database, trigger push notification
      console.log(`🚨 ALERT CREATED for user ${toolInput.userId}:`, toolInput.message);
      return JSON.stringify({ success: true, alertId: `alert_${Date.now()}` });

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// The agentic loop — Claude calls tools until it has a final answer
async function runHealthAgent(userRequest: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userRequest }
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are a health monitoring assistant. Use the available tools to
               analyze user health data and create alerts when needed.
               Always check metrics before making recommendations.`,
      tools: healthTools,
      messages,
    });

    // If Claude is done (no more tool calls needed)
    if (response.stop_reason === "end_turn") {
      const finalText = response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
      return finalText;
    }

    // Claude wants to use tools
    if (response.stop_reason === "tool_use") {
      // Add Claude's response (including tool_use blocks) to history
      messages.push({ role: "assistant", content: response.content });

      // Execute each tool Claude requested
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 Claude is calling: ${block.name}`, block.input);
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Send tool results back to Claude
      messages.push({ role: "user", content: toolResults });
      // Loop continues — Claude will process the results
    }
  }
}

// =============================================================================
// CHALLENGES
// =============================================================================

// 🟢 CHALLENGE 1 — Code review assistant (25 min)
// ─────────────────────────────────────────────────
// Use the `withSystemPrompt` function pattern to build a code review tool.
//
// Write: async function reviewCode(code: string, language: string): Promise<CodeReview>
//
// interface CodeReview {
//   issues: { severity: "error" | "warning" | "suggestion"; description: string; line?: number }[];
//   summary: string;
//   score: number; // 0-10
//   approved: boolean;
// }
//
// The function should:
//   1. Use a detailed system prompt that enforces the CodeReview output format
//   2. Ask Claude to respond as JSON matching the CodeReview interface
//   3. Parse and type the response (use JSON.parse with a type assertion + validation)
//   4. Test with these code snippets:
//      a) A React component with a useEffect dependency array bug
//      b) An async function that doesn't handle errors
//      c) A well-written TypeScript function (should score high)

// TODO: Implement reviewCode


// 🟡 CHALLENGE 2 — Build a stateful health advisor (30 min)
// ──────────────────────────────────────────────────────────
// Use the ConversationSession class to build a multi-turn health advisor
// that maintains context across turns.
//
// Requirements:
//   1. System prompt: health advisor that remembers what the user has shared
//   2. First message: user introduces themselves + shares basic health goals
//   3. Second message: user shares this week's metrics
//   4. Third message: user asks for a personalized weekly plan
//   5. Fourth message: user asks a follow-up about something from the plan
//
// After all turns:
//   a) Print the full conversation history
//   b) Calculate total tokens used across all turns
//   c) Note: on turn 4, Claude should reference things from turn 2 — this
//      demonstrates that the conversation history is working correctly

// TODO: Build the multi-turn conversation
// TODO: Track cumulative token usage across turns


// 🔴 CHALLENGE 3 — Agentic health monitor (45 min)
// ─────────────────────────────────────────────────
// Extend the `runHealthAgent` function to handle a more complex scenario.
//
// Add these additional tools:
//   - get_user_profile(userId) → returns age, conditions, medications
//   - check_medication_interactions(medications: string[]) → returns interaction warnings
//   - schedule_notification(userId, message, scheduledFor: Date) → schedules a reminder
//   - generate_weekly_report(userId, weekStart) → triggers report generation
//
// Write mock implementations for each new tool.
//
// Then run the agent with this request:
//   "User ID user_123 has been showing elevated resting heart rate (95+ bpm)
//    for the past 3 days. Their sleep has also been under 6 hours.
//    Please analyze their situation, check if any medications might be relevant,
//    create appropriate alerts, and schedule a follow-up notification for tomorrow."
//
// The agent should:
//   1. Get the user's metrics (3 days)
//   2. Get their profile
//   3. Check medication interactions if relevant
//   4. Create at least one alert
//   5. Schedule a notification
//   6. Return a clear summary of actions taken
//
// Log each tool call so you can see the agent "thinking" step by step.

// TODO: Define and implement the new tools
// TODO: Run the extended health agent
// TODO: Count total tool calls made during the session

export { ConversationSession, runHealthAgent, withSystemPrompt };
