import Anthropic from '@anthropic-ai/sdk';
import type { AIMessage, AIModel } from '../types';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Convert our generic messages to Anthropic format, extracting system prompt */
function toAnthropicMessages(messages: AIMessage[]) {
  let system: string | undefined;
  const filtered: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = (system ? system + '\n\n' : '') + msg.content;
    } else {
      filtered.push({ role: msg.role, content: msg.content });
    }
  }

  return { system, messages: filtered };
}

export async function complete(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getClient();
  const { system, messages: formatted } = toAnthropicMessages(messages);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: formatted,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function stream(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  const { system, messages: formatted } = toAnthropicMessages(messages);

  const anthropicStream = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: formatted,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
