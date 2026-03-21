'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <CardDescription className="text-xs sm:text-sm">
          Optional plain-text summary to your profile email. Schedule{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">GET /api/cron/daily-digest</code> with your{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">CRON_SECRET</code> (same pattern as news scrape).
          Server needs <code className="rounded bg-muted px-1 py-0.5 text-[10px]">RESEND_API_KEY</code> in env (see{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">.env.example</code>). Optional{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">EMAIL_FROM</code>; defaults to Resend test sender.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="digest-email" className="text-sm font-medium">
              Send digest when cron runs
            </Label>
            <p className="text-[11px] text-muted-foreground">Not instant mail — server must trigger the cron job.</p>
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
        <p className="mt-2 text-[10px] text-muted-foreground">
          Browser push is not enabled yet — email only. Content includes holdings count, today&apos;s note snippet, and
          a link to /today.
        </p>
      </CardContent>
    </Card>
  );
}
