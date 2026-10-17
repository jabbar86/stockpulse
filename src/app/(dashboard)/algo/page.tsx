'use client';

import { GraduationCapIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PracticeTrading } from '@/components/practice/practice-trading';
import { AiPlanner } from '@/components/algo/ai-planner';

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 pb-24 md:px-6 md:pb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GraduationCapIcon className="size-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Practice</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Try investing with virtual money, or get AI suggestions on the stocks you already own. Nothing here
          places real orders.
        </p>
      </div>

      <Tabs defaultValue="practice">
        <TabsList>
          <TabsTrigger value="practice">Practice trading</TabsTrigger>
          <TabsTrigger value="planner">AI planner (advanced)</TabsTrigger>
        </TabsList>
        <TabsContent value="practice" className="pt-4">
          <PracticeTrading />
        </TabsContent>
        <TabsContent value="planner" className="pt-4">
          <AiPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
