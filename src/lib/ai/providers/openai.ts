import OpenAI from 'openai';
import type { AIMessage, AIModel } from '../types';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

function toOpenAIMessages(messages: AIMessage[]) {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

export async function complete(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: toOpenAIMessages(messages),
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  return {
    text,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

export async function stream(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: toOpenAIMessages(messages),
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
