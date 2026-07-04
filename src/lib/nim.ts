// Shared NVIDIA NIM client (OpenAI-compatible chat completions API).
//
// Uses the cloud-hosted NIM endpoint at integrate.api.nvidia.com. Auth is a
// Bearer token from NVIDIA_NIM_API_KEY. The model can be overridden with
// NVIDIA_NIM_MODEL; otherwise a solid general-purpose default is used.

const NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class NimNotConfiguredError extends Error {
  constructor() {
    super('NVIDIA_NIM_API_KEY is not configured');
    this.name = 'NimNotConfiguredError';
  }
}

export function isNimConfigured(): boolean {
  return !!process.env.NVIDIA_NIM_API_KEY;
}

interface NimOptions {
  temperature?: number;
  maxTokens?: number;
  /** When true, asks the model to return strict JSON. */
  json?: boolean;
  /** Abort the request after this many ms (caller can then fall back). */
  timeoutMs?: number;
}

/**
 * Calls NVIDIA NIM chat completions and returns the assistant message text.
 * Throws NimNotConfiguredError when the API key is missing.
 */
export async function nimChat(messages: ChatMessage[], options: NimOptions = {}): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new NimNotConfiguredError();

  const body: Record<string, unknown> = {
    model: NIM_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    stream: false,
  };

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIM request failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('NVIDIA NIM returned an empty response');
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
