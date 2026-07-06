// Shared LLM client (OpenAI-compatible chat completions API).
//
// Primary provider is OpenRouter (https://openrouter.ai) when OPENROUTER_API_KEY
// is set — model overridable via OPENROUTER_MODEL. Falls back to NVIDIA NIM
// (NVIDIA_NIM_API_KEY) when OpenRouter isn't configured. Both speak the same
// OpenAI /chat/completions shape, so callers don't change.

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash';

const NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct';

type Provider = { baseUrl: string; model: string; apiKey: string; headers: Record<string, string> };

/** Picks OpenRouter first, then NVIDIA NIM. Returns null if neither is configured. */
function resolveProvider(): Provider | null {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      baseUrl: OPENROUTER_BASE_URL,
      model: OPENROUTER_MODEL,
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter recommends (optionally) identifying your app.
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://interviewaceai.peculiex.com',
        'X-Title': 'InterviewAce AI',
      },
    };
  }
  if (process.env.NVIDIA_NIM_API_KEY) {
    return { baseUrl: NIM_BASE_URL, model: NIM_MODEL, apiKey: process.env.NVIDIA_NIM_API_KEY, headers: {} };
  }
  return null;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class NimNotConfiguredError extends Error {
  constructor() {
    super('No LLM provider configured (set OPENROUTER_API_KEY or NVIDIA_NIM_API_KEY)');
    this.name = 'NimNotConfiguredError';
  }
}

export function isNimConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.NVIDIA_NIM_API_KEY);
}

interface NimOptions {
  temperature?: number;
  maxTokens?: number;
  /** When true, asks the model to return strict JSON. */
  json?: boolean;
  /** Abort the request after this many ms (caller can then fall back). */
  timeoutMs?: number;
  /** Override the default model configured in env (useful for specific tasks like web search) */
  overrideModel?: string;
}

/**
 * Calls NVIDIA NIM chat completions and returns the assistant message text.
 * Throws NimNotConfiguredError when the API key is missing.
 */
export async function nimChat(messages: ChatMessage[], options: NimOptions = {}): Promise<string> {
  const provider = resolveProvider();
  if (!provider) throw new NimNotConfiguredError();

  const body: Record<string, unknown> = {
    model: options.overrideModel || provider.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    stream: false,
  };
  // Ask for a JSON object back when the caller wants strict JSON (supported by
  // OpenRouter/OpenAI-style providers; ignored gracefully by others).
  if (options.json) body.response_format = { type: 'json_object' };

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
      Accept: 'application/json',
      ...provider.headers,
    },
    body: JSON.stringify(body),
    ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('LLM returned an empty response');
  }
  return content.trim();
}

/**
 * Strips markdown code fences and parses the first JSON object/array found in
 * the model output. Models occasionally wrap JSON in ```json fences or add
 * stray prose, so we extract defensively.
 */
export function parseJsonFromModel<T = unknown>(raw: string): T {
  let text = raw.trim();

  // Remove ```json / ``` fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }

  // If there is still surrounding prose, grab the outermost JSON braces/brackets.
  const firstBrace = text.search(/[[{]/);
  if (firstBrace > 0) {
    const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  return JSON.parse(text) as T;
}
