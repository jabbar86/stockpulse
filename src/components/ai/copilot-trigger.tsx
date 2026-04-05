'use client';

import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopilotTriggerProps {
  onClick: () => void;
}

export function CopilotTrigger({ onClick }: CopilotTriggerProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-20 right-4 z-50 size-12 rounded-2xl border border-white/15 bg-zinc-950/85 text-sky-400 shadow-xl shadow-black/35 backdrop-blur-xl ring-1 ring-white/10 transition-transform hover:scale-[1.03] hover:bg-zinc-900/90 hover:text-sky-300 md:bottom-6 md:right-6 md:size-14 md:rounded-2xl"
      aria-label="Open AI Copilot"
    >
      <SparklesIcon className="size-5 md:size-6" />
    </Button>
  );
}
