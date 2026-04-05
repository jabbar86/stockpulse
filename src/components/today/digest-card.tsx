'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, MailIcon } from 'lucide-react';

type DigestCardProps = {
  syncEnabled: boolean;
  initialEnabled: boolean;
};

export function DigestCard({ syncEnabled, initialEnabled }: DigestCardProps) {
  const [on, setOn] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOn(initialEnabled);
  }, [initialEnabled]);

  const toggle = async (checked: boolean) => {
    if (!syncEnabled) return;
    setBusy(true);
    setOn(checked);
    try {
      const res = await fetch('/api/today/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digestEmailEnabled: checked }),
      });
      if (!res.ok) setOn(!checked);
    } catch {
      setOn(!checked);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MailIcon className="size-4 text-primary" />
          <CardTitle className="text-sm sm:text-base">Morning email digest</CardTitle>
          {busy && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="digest-email" className="text-sm font-medium">
              Email morning summary
            </Label>
          </div>
          <div className="flex items-center gap-2">
            {!syncEnabled && (
              <Badge variant="outline" className="text-[10px] font-normal">
                Needs DB migration
              </Badge>
            )}
            <Switch
              id="digest-email"
              checked={on}
              disabled={!syncEnabled || busy}
              onCheckedChange={(v) => void toggle(v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
