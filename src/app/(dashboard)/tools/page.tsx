'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SipCalculator } from '@/components/tools/sip-calculator';
import { ChargesCalculator } from '@/components/tools/charges-calculator';
import { PositionSizeCalculator } from '@/components/tools/position-size-calculator';
import { CapitalGainsCalculator } from '@/components/tools/capital-gains-calculator';

export default function ToolsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-3xl font-bold">Tools</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Free calculators for SIP planning, capital gains tax, trade charges and position sizing.
        </p>
      </div>

      <Tabs defaultValue="sip">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="sip">SIP &amp; Lumpsum</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="position">Position size</TabsTrigger>
        </TabsList>
        <TabsContent value="sip" className="pt-2">
          <SipCalculator />
        </TabsContent>
        <TabsContent value="tax" className="pt-2">
          <CapitalGainsCalculator />
        </TabsContent>
        <TabsContent value="charges" className="pt-2">
          <ChargesCalculator />
        </TabsContent>
        <TabsContent value="position" className="pt-2">
          <PositionSizeCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
