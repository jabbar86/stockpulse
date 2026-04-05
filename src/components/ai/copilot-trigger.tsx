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
      className="fixed bottom-20 right-4 z-50 size-12 rounded-full shadow-lg shadow-primary/25 md:bottom-6 md:right-6 md:size-14"
      aria-label="Open AI Copilot"
    >
      <SparklesIcon className="size-5 md:size-6" />
    </Button>
  );
}
