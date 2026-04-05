import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIMessage, AIModel } from '../types';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

/** Convert our messages to Gemini's contents format */
function toGeminiContents(messages: AIMessage[]) {
  let systemInstruction: string | undefined;
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = (systemInstruction ? systemInstruction + '\n\n' : '') + msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return { systemInstruction, contents };
}

export async function complete(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const genAI = getGenAI();
  const { systemInstruction, contents } = toGeminiContents(messages);

  const genModel = genAI.getGenerativeModel({
    model,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const result = await genModel.generateContent({ contents });
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    text,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

export async function stream(
  model: AIModel,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<ReadableStream<Uint8Array>> {
  const genAI = getGenAI();
  const { systemInstruction, contents } = toGeminiContents(messages);

  const genModel = genAI.getGenerativeModel({
    model,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const result = await genModel.generateContentStream({ contents });
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
