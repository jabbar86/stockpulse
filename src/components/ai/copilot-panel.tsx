'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiChat, type ChatMessage } from '@/hooks/use-ai-chat';
import { CopilotTrigger } from './copilot-trigger';
import { cn } from '@/lib/utils';
import {
  SparklesIcon,
  SendIcon,
  Trash2Icon,
  SquareIcon,
} from 'lucide-react';

const SUGGESTIONS = [
  "How's my portfolio doing?",
  'Which stock should I watch today?',
  'Summarize market sentiment',
  'What are the top gainers in NIFTY 50?',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SparklesIcon className="size-3.5" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/60 text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content || '\u00A0'}</p>
      </div>
    </div>
  );
}

export function CopilotPanel() {
  const [open, setOpen] = useState(false);
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming } = useAiChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    sendMessage(trimmed);
  }

  function handleSuggestion(text: string) {
    setInput('');
    sendMessage(text);
  }

  return (
    <>
      <CopilotTrigger onClick={() => setOpen(true)} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary" />
                <SheetTitle className="text-base">AI Copilot</SheetTitle>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Free
                </span>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 gap-1.5 text-xs text-muted-foreground"
                >
                  <Trash2Icon className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <SparklesIcon className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">StockPulse AI</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Ask about your portfolio, market trends, or get quick stock summaries.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t px-4 py-3 flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your portfolio..."
              className="flex-1 rounded-xl"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={stopStreaming}
                className="shrink-0"
              >
                <SquareIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="shrink-0"
              >
                <SendIcon className="size-4" />
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
