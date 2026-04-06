import type { AIModel, AIProvider, AITaskType, ModelConfig } from './types';

/** Internal routing only; labels are not shown to end users. */
export const MODEL_REGISTRY: Record<AIModel, { provider: AIProvider; label: string }> = {
  'llama3.2-ollama': { provider: 'ollama', label: 'Local' },
  'llama-3.1-8b-groq': { provider: 'groq', label: 'Cloud' },
  'gemini-2.0-flash': { provider: 'google', label: 'Cloud' },
  'gpt-4o-mini': { provider: 'openai', label: 'Cloud' },
  'claude-sonnet-4-20250514': { provider: 'anthropic', label: 'Cloud' },
};

/** Task routing table: primary model + fallback chain */
/** Prefer local / free open-weight routes first, then cloud APIs (see .env.example). */
const TASK_ROUTING: Record<AITaskType, { models: AIModel[]; maxTokens: number; temperature: number }> = {
  stock_analysis: {
    models: [
      'llama3.2-ollama',
      'llama-3.1-8b-groq',
      'gemini-2.0-flash',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
    ],
    maxTokens: 1024,
    temperature: 0.3,
  },
  portfolio_analysis: {
    models: [
      'llama3.2-ollama',
      'llama-3.1-8b-groq',
      'gemini-2.0-flash',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
    ],
    maxTokens: 1024,
    temperature: 0.3,
  },
  portfolio_signals: {
    models: [
      'llama3.2-ollama',
      'llama-3.1-8b-groq',
      'gemini-2.0-flash',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
    ],
    maxTokens: 4096,
    temperature: 0.25,
  },
  chat_response: {
    models: [
      'llama3.2-ollama',
      'llama-3.1-8b-groq',
      'gemini-2.0-flash',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
  morning_brief: {
    models: [
      'llama3.2-ollama',
      'llama-3.1-8b-groq',
      'gemini-2.0-flash',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
    ],
    maxTokens: 1500,
    temperature: 0.5,
  },
  quick_summary: {
    models: ['llama3.2-ollama', 'llama-3.1-8b-groq', 'gemini-2.0-flash', 'gpt-4o-mini'],
    maxTokens: 512,
    temperature: 0.3,
  },
  sentiment: {
    models: ['llama3.2-ollama', 'llama-3.1-8b-groq', 'gemini-2.0-flash', 'gpt-4o-mini'],
    maxTokens: 256,
    temperature: 0.2,
  },
};

/** Local Ollama needs OLLAMA_ENABLED; a non-localhost OLLAMA_BASE_URL implies remote Ollama. */
function isOllamaConfigured(): boolean {
  if (process.env.OLLAMA_ENABLED === 'true' || process.env.OLLAMA_ENABLED === '1') {
    return true;
  }
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return false;
    return true;
  } catch {
    return false;
  }
}

/** Check whether a given provider's API key is configured */
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'ollama':
      return isOllamaConfigured();
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY?.trim());
    case 'anthropic':
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    case 'openai':
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    case 'google':
      return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
  }
}

/** True if at least one AI provider is configured (env keys / Ollama). */
export function hasAnyAiProvider(): boolean {
  const models = Object.keys(MODEL_REGISTRY) as AIModel[];
  for (const model of models) {
    const { provider } = MODEL_REGISTRY[model];
    if (isProviderAvailable(provider)) return true;
  }
  return false;
}

/** Resolve the best available model config for a given task type */
export function resolveModel(task: AITaskType): ModelConfig {
  const route = TASK_ROUTING[task];

  for (const model of route.models) {
    const { provider } = MODEL_REGISTRY[model];
    if (isProviderAvailable(provider)) {
      return { model, provider, maxTokens: route.maxTokens, temperature: route.temperature };
    }
  }

  throw new Error('No AI provider available');
}
