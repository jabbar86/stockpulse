import type { AIModel, AIProvider, AITaskType, ModelConfig } from './types';

export const MODEL_REGISTRY: Record<AIModel, { provider: AIProvider; label: string }> = {
  'llama3.2-ollama': { provider: 'ollama', label: 'Ollama (local)' },
  'llama-3.1-8b-groq': { provider: 'groq', label: 'Groq Llama (free tier)' },
  'gemini-2.0-flash': { provider: 'google', label: 'Gemini 2.0 Flash' },
  'gpt-4o-mini': { provider: 'openai', label: 'GPT-4o Mini' },
  'claude-sonnet-4-20250514': { provider: 'anthropic', label: 'Claude Sonnet 4' },
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

/** Check whether a given provider's API key is configured */
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'ollama':
      return (
        process.env.OLLAMA_ENABLED === 'true' ||
        process.env.OLLAMA_ENABLED === '1'
      );
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

/** Resolve the best available model config for a given task type */
export function resolveModel(task: AITaskType): ModelConfig {
  const route = TASK_ROUTING[task];

  for (const model of route.models) {
    const { provider } = MODEL_REGISTRY[model];
    if (isProviderAvailable(provider)) {
      return { model, provider, maxTokens: route.maxTokens, temperature: route.temperature };
    }
  }

  throw new Error(
    `No AI provider available for task "${task}". For free / open-weight options: set OLLAMA_ENABLED=true (install Ollama locally) and/or GROQ_API_KEY (https://console.groq.com). Or set GOOGLE_AI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.`
  );
}
