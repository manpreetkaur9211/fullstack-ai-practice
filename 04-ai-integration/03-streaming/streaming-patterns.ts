// =============================================================================
// AI STREAMING — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// Streaming AI responses means the text appears word-by-word as Claude
// generates it — rather than waiting for the full response before showing anything.
//
// For a 500-word response:
//   Without streaming: User waits 8-10 seconds, then sees everything at once
//   With streaming:    User sees first words in <1 second, reads as it arrives
//
// WHY THIS MATTERS:
//   - Dramatically better UX — users feel engaged, not stuck
//   - Required for any chat interface (see every AI product)
//   - Demonstrates understanding of async patterns + Node.js streams
//   - The Yeyro real-time notification engine uses the same concepts
//
// HOW STREAMING WORKS AT THE PROTOCOL LEVEL:
//   1. Client sends HTTP POST to /api/chat
//   2. Server immediately responds with: Content-Type: text/event-stream
//   3. Server keeps connection open and writes data chunks:
//      data: {"type":"text-delta","textDelta":"Hello"}\n\n
//      data: {"type":"text-delta","textDelta":" there"}\n\n
//      data: [DONE]\n\n
//   4. Client reads chunks as they arrive using ReadableStream / EventSource
//
// ── HOW THE VERCEL AI SDK HANDLES STREAMING ──────────────────────────────────

import { streamText, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── EXAMPLE 1: streamText in Node.js ──────────────────────────────────────────

async function streamToConsole(prompt: string): Promise<void> {
  const { textStream, usage, finishReason } = await streamText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    prompt,
    maxTokens: 300,
  });

  process.stdout.write("Response: ");
  for await (const chunk of textStream) {
    process.stdout.write(chunk); // Each chunk is a few tokens
  }

  // These resolve after streaming is complete
  const finalUsage = await usage;
  const reason = await finishReason;
  console.log(`\n\nTokens: ${finalUsage.promptTokens} in / ${finalUsage.completionTokens} out`);
  console.log(`Finished: ${reason}`);
}

// ── EXAMPLE 2: Direct Anthropic SDK streaming ─────────────────────────────────
//
// When you need full control (tool use with streaming, complex event handling):

async function streamWithAnthropicSDK(prompt: string): Promise<string> {
  let fullText = "";

  const stream = client.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  // Event-based API — different events for different content types
  stream.on("text", (text) => {
    process.stdout.write(text); // Real-time output
    fullText += text;
  });

  stream.on("message", (message) => {
    // Called when the full message is complete
    console.log(`\n\nStop reason: ${message.stop_reason}`);
  });

  // Convenience method — waits for stream to finish and returns the message
  const finalMessage = await stream.finalMessage();
  return fullText;
}

// ── EXAMPLE 3: Streaming with tool use ────────────────────────────────────────
//
// The most complex pattern: Claude streams text AND calls tools mid-stream.
// You handle text_delta events and tool_use events separately.

async function streamWithToolUse(userQuery: string): Promise<void> {
  const stream = client.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: "You are a health assistant. Use tools to look up user data when needed.",
    tools: [{
      name: "get_heart_rate",
      description: "Get the user's current heart rate from their wearable",
      input_schema: {
        type: "object",
        properties: {
          userId: { type: "string" }
        },
        required: ["userId"]
      }
    }],
    messages: [{ role: "user", content: userQuery }],
  });

  process.stdout.write("\n");

  stream.on("text", (text) => {
    process.stdout.write(text);
  });

  // Watch for tool calls
  stream.on("inputJson", (delta, snapshot) => {
    // Called incrementally as Claude streams the tool input JSON
    // Useful for showing "Checking your data..." indicator
    if (Object.keys(snapshot).length > 0 && !Object.keys(delta).length) {
      console.log(`\n🔧 Tool call ready: ${JSON.stringify(snapshot)}`);
    }
  });

  const finalMessage = await stream.finalMessage();

  // Handle tool calls if any
  if (finalMessage.stop_reason === "tool_use") {
    const toolUseBlocks = finalMessage.content.filter(b => b.type === "tool_use");
    for (const toolBlock of toolUseBlocks) {
      if (toolBlock.type === "tool_use" && toolBlock.name === "get_heart_rate") {
        const result = { heartRate: 87, timestamp: new Date().toISOString() };
        console.log(`\n✓ Tool returned: ${JSON.stringify(result)}`);
        // Continue conversation with tool result...
      }
    }
  }
}

// ── EXAMPLE 4: Next.js Route Handler for useChat ──────────────────────────────
//
// This is what you'd put in app/api/chat/route.ts in a Next.js project:
//
// export async function POST(request: Request) {
//   const { messages, userId } = await request.json();
//
//   const result = streamText({
//     model: anthropic("claude-3-5-sonnet-20241022"),
//     system: `You are a personal health coach for user ${userId}.
//              Be encouraging, specific, and evidence-based.`,
//     messages,
//     maxTokens: 500,
//     // onFinish: called when streaming ends — good for logging/analytics
//     onFinish: async ({ text, usage }) => {
//       await logConversation(userId, messages, text, usage);
//     },
//   });
//
//   return result.toDataStreamResponse();
//   // This sets the right headers and streams the AI SDK format to useChat
// }

// ── EXAMPLE 5: Measuring streaming performance ───────────────────────────────

interface StreamMetrics {
  timeToFirstToken: number;  // ms until first text arrives
  totalDuration: number;     // ms for complete response
  tokensPerSecond: number;
  totalTokens: number;
}

async function measureStreamPerformance(prompt: string): Promise<StreamMetrics> {
  const start = Date.now();
  let firstTokenTime = 0;
  let tokenCount = 0;

  const { textStream, usage } = await streamText({
    model: anthropic("claude-3-5-haiku-20241022"),
    prompt,
    maxTokens: 200,
  });

  for await (const _chunk of textStream) {
    if (firstTokenTime === 0) {
      firstTokenTime = Date.now() - start;
    }
    tokenCount++;
  }

  const totalDuration = Date.now() - start;
  const finalUsage = await usage;

  return {
    timeToFirstToken: firstTokenTime,
    totalDuration,
    tokensPerSecond: Math.round((finalUsage.completionTokens / totalDuration) * 1000),
    totalTokens: finalUsage.completionTokens,
  };
}

// =============================================================================
// CHALLENGES
// =============================================================================

// 🟢 CHALLENGE 1 — Streaming with progress indicator (20 min)
// ─────────────────────────────────────────────────────────────
// Stream a Claude response but show a real-time word count while it streams.
//
// Output should look like:
//   Generating health advice... (12 words)
//   Generating health advice... (28 words)
//   ...
//   Done! 156 words in 3.2 seconds
//
// Requirements:
//   - Update the progress line in-place (use \r to overwrite)
//   - Track word count by splitting accumulated text on spaces
//   - Show final word count and generation time on completion
//   - Test with: "Give me a comprehensive weekly exercise plan for someone
//     who sits at a desk all day"

// TODO: Implement streaming with progress indicator


// 🟢 CHALLENGE 2 — Compare streaming vs non-streaming UX (25 min)
// ─────────────────────────────────────────────────────────────────
// Run the SAME prompt both ways and measure the difference:
//   a) generateText (waits for full response)
//   b) streamText (streams tokens)
//
// For each:
//   - Record time until first output appears
//   - Record time until complete
//   - Print a comparison table:
//
//   | Method     | First output | Complete | Tokens |
//   |------------|-------------|----------|--------|
//   | generateText | 4,230ms  | 4,230ms  | 187    |
//   | streamText   | 410ms    | 4,310ms  | 187    |
//
// This demonstrates WHY streaming matters for user experience.

// TODO: Implement the comparison test


// 🟡 CHALLENGE 3 — Streaming health insight with partial rendering (30 min)
// ──────────────────────────────────────────────────────────────────────────
// Stream a health insight and parse it progressively.
// The insight is JSON, but you want to show data as it arrives.
//
// Strategy: Ask Claude to stream structured data in a specific order:
//   1. First output the summary line (starts with "SUMMARY:")
//   2. Then output each recommendation on its own line (starts with "REC:")
//   3. Finally output the risk level (starts with "RISK:")
//
// Parse each line as it arrives and print formatted output immediately.
// This simulates how you'd progressively update a UI while waiting for full JSON.
//
// Input: health metrics object (use the Yeyro sample data)
// Output: progressive display like:
//   📊 Analysing...
//   ✓ Summary: Your resting heart rate is slightly elevated...
//   ✓ Recommendation: Aim for 7-8 hours of sleep each night [HIGH priority]
//   ✓ Recommendation: Add 2,000 more daily steps... [MEDIUM priority]
//   ✓ Risk level: moderate
//   ✅ Analysis complete (2.3 seconds)

// TODO: Implement progressive streaming health insight


// 🔴 CHALLENGE 4 — Build a streaming Next.js chatbot (60 min)
// ─────────────────────────────────────────────────────────────
// Build a working health chatbot in Next.js that uses streaming.
//
// Files to create:
//   app/api/health-chat/route.ts  — Server: streamText → toDataStreamResponse
//   app/chat/page.tsx             — Server Component wrapper
//   app/chat/HealthChat.tsx       — "use client" — useChat hook
//
// Requirements:
//   1. System prompt: health coach that knows the user's metrics
//      (hardcode a sample user's data into the system prompt for now)
//   2. Messages stream in real-time (not all at once)
//   3. Show a typing indicator while streaming
//   4. Show token count for each response (extract from onFinish)
//   5. Add a "Clear conversation" button
//   6. Keyboard shortcut: Ctrl+Enter to send
//
// Test scenarios:
//   - "What should I know about my heart rate trend?"
//   - "Give me a 7-day exercise plan based on my activity level"
//   - "Am I getting enough sleep?"
//
// BONUS: Add "suggested questions" chips below the input
//        that populate the input field when clicked.

// TODO: Build the Next.js chatbot

// Run basic demo
streamToConsole("What is the most important health metric to track daily? Answer in 3 sentences.")
  .catch(console.error);

export { streamToConsole, measureStreamPerformance };
