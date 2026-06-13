// import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
// //Anthropic client singleton + model config

// export const client = new AnthropicBedrockMantle({
//   awsRegion: "ap-southeast-2",
// });
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

export const client = new AnthropicBedrock({
  awsRegion: "ap-southeast-2",
});

export const model = "global.anthropic.claude-opus-4-6-v1";
