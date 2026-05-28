import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
export function claude() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

export const CLAUDE_MODEL = "claude-3-5-sonnet-latest";
export const CLAUDE_HAIKU = "claude-3-5-haiku-latest";
