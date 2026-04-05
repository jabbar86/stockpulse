import type { AIMessage, AIModel } from '../types';

function baseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
  return u.replace(/\/$/, '');
}

/** Ollama tag to run (pull with `ollama pull <name>`). */
function ollamaTag(_registryModel: AIModel): string {
  return process.env.OLLAMA_MODEL?.trim() || 'llama3.2';
}

function toOllamaMessages(messages: AIMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export async function complete(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(`${baseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaTag(model),
      messages: toOllamaMessages(messages),
      stream: false,
      options: { temperature, num_predict: maxTokens },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    message?: { content?: string };
    eval_count?: number;
    prompt_eval_count?: number;
  };
  const text = json.message?.content?.trim() ?? '';
  return {
    text,
    inputTokens: json.prompt_eval_count ?? 0,
    outputTokens: json.eval_count ?? 0,
  };
}

export async function stream(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${baseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaTag(model),
      messages: toOllamaMessages(messages),
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 240)}`);
  }
  if (!res.body) throw new Error('Ollama: empty response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const j = JSON.parse(trimmed) as { message?: { content?: string } };
              const c = j.message?.content;
              if (c) controller.enqueue(encoder.encode(c));
            } catch {
              /* ignore partial JSON lines */
            }
          }
        }
        const rest = lineBuffer.trim();
        if (rest) {
          try {
            const j = JSON.parse(rest) as { message?: { content?: string } };
            const c = j.message?.content;
            if (c) controller.enqueue(encoder.encode(c));
          } catch {
            /* */
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
