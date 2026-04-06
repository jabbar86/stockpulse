export type AIProvider = 'anthropic' | 'openai' | 'google' | 'ollama' | 'groq';

export type AIModel =
  | 'claude-sonnet-4-20250514'
  | 'gpt-4o-mini'
  | 'gemini-2.0-flash'
  | 'llama3.2-ollama'
  | 'llama-3.1-8b-groq';

export type AITaskType =
  | 'stock_analysis'
  | 'portfolio_analysis'
  | 'portfolio_signals'
  | 'chat_response'
  | 'morning_brief'
  | 'quick_summary'
  | 'sentiment';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  task: AITaskType;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** If true, returns a ReadableStream instead of a string */
  stream?: boolean;
}

export interface AIResponse {
  text: string;
  model: AIModel;
  provider: AIProvider;
  cached: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIStreamResponse {
  stream: ReadableStream<Uint8Array>;
  model: AIModel;
  provider: AIProvider;
}

export interface ModelConfig {
  model: AIModel;
  provider: AIProvider;
  maxTokens: number;
  temperature: number;
}
