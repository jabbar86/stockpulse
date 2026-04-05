'use client';

import { useState, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
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

const markdownComponents = {
  p: ({ className, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p
      className={cn('mb-3 text-[13px] leading-relaxed text-zinc-200 last:mb-0', className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className={cn('font-semibold text-zinc-50', className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <ul
      className={cn('mb-3 list-disc space-y-1.5 pl-4 text-[13px] text-zinc-200 last:mb-0', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className={cn('mb-3 list-decimal space-y-1.5 pl-4 text-[13px] text-zinc-200 last:mb-0', className)}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className={cn('leading-relaxed', className)} {...props} />
  ),
  h1: ({ className, ...props }: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className={cn('mb-2 mt-4 text-base font-semibold tracking-tight text-zinc-50 first:mt-0', className)} {...props} />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className={cn('mb-2 mt-3 text-sm font-semibold tracking-tight text-zinc-50 first:mt-0', className)} {...props} />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className={cn('mb-1.5 mt-3 text-sm font-semibold text-zinc-100 first:mt-0', className)} {...props} />
  ),
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => (
    <code
      className={cn(
        'rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-sky-200',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className={cn(
        'mb-3 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] text-zinc-200 last:mb-0',
        className
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }: ComponentPropsWithoutRef<'a'>) => (
    <a
      className={cn('font-medium text-sky-400 underline-offset-2 hover:underline', className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <hr className={cn('my-4 border-white/10', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className={cn('mb-3 border-l-2 border-sky-500/50 pl-3 text-zinc-300 italic last:mb-0', className)}
      {...props}
    />
  ),
};

function CopilotTyping() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 ring-1 ring-sky-400/20">
        <SparklesIcon className="size-4 text-sky-400" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.04]">
        {[0, 120, 240].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-zinc-400"
            style={{
              animation: 'copilot-dot 1.2s ease-in-out infinite',
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreamingTail,
}: {
  message: ChatMessage;
  isStreamingTail?: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 ring-1 ring-sky-400/20">
          <SparklesIcon className="size-4 text-sky-400" />
        </div>
      )}
      <div
        className={cn(
          'min-w-0 max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sky-950/30'
            : 'border border-white/[0.08] bg-white/[0.06] text-zinc-100 ring-1 ring-white/[0.04]'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <div className="copilot-md break-words">
            <ReactMarkdown components={markdownComponents}>{message.content || '\u00A0'}</ReactMarkdown>
            {isStreamingTail && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-400/90 align-middle" aria-hidden />
            )}
          </div>
        )}
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
  }, [messages, isStreaming]);

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
          showCloseButton
          overlayClassName="bg-zinc-950/50 backdrop-blur-sm supports-backdrop-filter:backdrop-blur-md"
          className={cn(
            'flex w-full flex-col gap-0 border-l border-white/[0.08] bg-zinc-950/90 p-0 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:max-w-md',
            '[&_[data-slot=sheet-close]]:top-3.5 [&_[data-slot=sheet-close]]:right-3.5 [&_[data-slot=sheet-close]]:text-zinc-400 hover:[&_[data-slot=sheet-close]]:bg-white/10 hover:[&_[data-slot=sheet-close]]:text-zinc-100'
          )}
        >
          <SheetHeader className="shrink-0 space-y-0 border-b border-white/[0.08] bg-zinc-950/80 px-4 py-3.5 pr-14 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-400/25">
                  <SparklesIcon className="size-[18px] text-sky-400" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-left text-base font-semibold tracking-tight text-zinc-50">
                    AI Copilot
                  </SheetTitle>
                  <p className="text-[11px] text-zinc-500">Portfolio & markets</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Free
                </span>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="hidden h-8 shrink-0 gap-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100 sm:flex"
                >
                  <Trash2Icon className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="mt-2 h-8 w-full gap-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100 sm:hidden"
              >
                <Trash2Icon className="size-3.5" />
                Clear chat
              </Button>
            )}
          </SheetHeader>

          <div
            ref={scrollRef}
            className="copilot-messages-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-5 px-2 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl" />
                  <div className="relative flex size-14 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/30">
                    <SparklesIcon className="size-7 text-sky-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-50">StockPulse AI</h3>
                  <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-zinc-400">
                    Ask about your portfolio, market trends, or quick stock context — answers stream here.
                  </p>
                </div>
                <div className="flex w-full max-w-sm flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Try asking</p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-left text-xs leading-snug text-zinc-300 ring-1 ring-white/[0.04] transition-colors hover:border-sky-500/35 hover:bg-white/[0.08] hover:text-zinc-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const showTyping =
                  msg.role === 'assistant' && isStreaming && isLast && !msg.content.trim();
                if (showTyping) {
                  return <CopilotTyping key={msg.id} />;
                }
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isStreamingTail={Boolean(
                      isStreaming && isLast && msg.role === 'assistant' && msg.content.trim()
                    )}
                  />
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-white/[0.08] bg-zinc-950/90 px-3 py-3 backdrop-blur-md"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.05] p-1.5 pl-2 ring-1 ring-white/[0.04] focus-within:border-sky-500/40 focus-within:ring-sky-500/20">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Copilot…"
                className="h-10 flex-1 border-0 bg-transparent px-2 text-sm text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={stopStreaming}
                  className="size-10 shrink-0 rounded-xl text-zinc-300 hover:bg-white/10 hover:text-zinc-50"
                >
                  <SquareIcon className="size-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  className="size-10 shrink-0 rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-950/40 hover:bg-sky-400 disabled:opacity-40"
                >
                  <SendIcon className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 px-1 text-center text-[10px] leading-snug text-zinc-500">
              AI can make mistakes. Not financial advice.
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
