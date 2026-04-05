import { resolveModel } from './models';
import { MODEL_REGISTRY } from './models';
import type { AIRequest, AIResponse, AIStreamResponse, AIProvider, AIModel, AIMessage } from './types';
import * as anthropicProvider from './providers/anthropic';
import * as openaiProvider from './providers/openai';
import * as googleProvider from './providers/google';
import * as ollamaProvider from './providers/ollama';
import * as groqProvider from './providers/groq';

type ProviderModule = {
  complete: (
    model: AIModel,
    messages: AIMessage[],
    maxTokens: number,
    temperature: number
  ) => Promise<{ text: string; inputTokens: number; outputTokens: number }>;
  stream: (
    model: AIModel,
    messages: AIMessage[],
    maxTokens: number,
    temperature: number
  ) => Promise<ReadableStream<Uint8Array>>;
};

const PROVIDERS: Record<AIProvider, ProviderModule> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  ollama: ollamaProvider,
  groq: groqProvider,
};

/**
 * Route an AI request to the best available model based on task type.
 * Falls through the priority chain if the primary provider fails.
 */
export async function route(request: AIRequest): Promise<AIResponse> {
  const config = resolveModel(request.task);
  const provider = PROVIDERS[config.provider];

  const maxTokens = request.maxTokens ?? config.maxTokens;
  const temperature = request.temperature ?? config.temperature;

  try {
    const result = await provider.complete(config.model, request.messages, maxTokens, temperature);

    return {
      text: result.text,
      model: config.model,
      provider: config.provider,
      cached: false,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    };
  } catch (primaryError) {
    // Try fallback: pick the next available model from the registry
    const allModels = Object.keys(MODEL_REGISTRY) as AIModel[];
    const fallbackModels = allModels.filter(
      (m) => m !== config.model && MODEL_REGISTRY[m].provider !== config.provider
    );

    for (const fallbackModel of fallbackModels) {
      const fallbackProvider = MODEL_REGISTRY[fallbackModel].provider;
      try {
        const fb = PROVIDERS[fallbackProvider];
        const result = await fb.complete(fallbackModel, request.messages, maxTokens, temperature);
        return {
          text: result.text,
          model: fallbackModel,
          provider: fallbackProvider,
          cached: false,
          usage: {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
        };
      } catch {
        continue;
      }
    }

    throw primaryError;
  }
}

/**
 * Stream an AI response from the best available model.
 */
export async function routeStream(request: AIRequest): Promise<AIStreamResponse> {
  const config = resolveModel(request.task);
  const provider = PROVIDERS[config.provider];

  const maxTokens = request.maxTokens ?? config.maxTokens;
  const temperature = request.temperature ?? config.temperature;

  try {
    const stream = await provider.stream(config.model, request.messages, maxTokens, temperature);
    return { stream, model: config.model, provider: config.provider };
  } catch (primaryError) {
    const allModels = Object.keys(MODEL_REGISTRY) as AIModel[];
    const fallbackModels = allModels.filter(
      (m) => m !== config.model && MODEL_REGISTRY[m].provider !== config.provider
    );

    for (const fallbackModel of fallbackModels) {
      const fallbackProvider = MODEL_REGISTRY[fallbackModel].provider;
      try {
        const fb = PROVIDERS[fallbackProvider];
        const stream = await fb.stream(fallbackModel, request.messages, maxTokens, temperature);
        return { stream, model: fallbackModel, provider: fallbackProvider };
      } catch {
        continue;
      }
    }

    throw primaryError;
  }
}
