'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';
import type { BrokerConnection } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UnlinkIcon,
  RefreshCwIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  PlusIcon,
  TimerIcon,
  UploadIcon,
  ShieldCheckIcon,
  InfoIcon,
  LogInIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  LockIcon,
  SendIcon,
  CrownIcon,
} from 'lucide-react';
import CSVImportDialog from '@/components/portfolio/csv-import-dialog';
import { CSV_EXPORT_GUIDES } from '@/lib/brokers/csv-guides';

// ── Broker definitions ──────────────────────────────────────────────

interface ApiBroker {
  id: string;
  name: string;
  description: string;
  authUrl: string;
  color: string;
  bgColor: string;
  loginLabel: string;
}

interface CsvBroker {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

const API_BROKERS: ApiBroker[] = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    description: 'Auto-import via Kite Connect. Just login with your Kite credentials.',
    authUrl: '/api/brokers/zerodha/auth',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    loginLabel: 'Login with Zerodha',
  },
  {
    id: 'upstox',
    name: 'Upstox',
    description: 'Auto-import holdings and real-time prices from Upstox.',
    authUrl: '/api/brokers/upstox/auth',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    loginLabel: 'Login with Upstox',
  },
  {
    id: 'angelone',
    name: 'Angel One',
    description: 'Connect via SmartAPI for real-time holdings sync.',
    authUrl: '/api/brokers/angelone/auth',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    loginLabel: 'Login with Angel One',
  },
  {
    id: 'fyers',
    name: 'FYERS',
    description: 'Auto-sync your FYERS portfolio via API.',
    authUrl: '/api/brokers/fyers/auth',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    loginLabel: 'Login with FYERS',
  },
  {
    id: 'dhan',
    name: 'Dhan',
    description: 'Import holdings from Dhan via their HQ API.',
    authUrl: '/api/brokers/dhan/auth',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    loginLabel: 'Login with Dhan',
  },
  {
    id: '5paisa',
    name: '5paisa',
    description: 'Connect via 5paisa Open API for holdings.',
    authUrl: '/api/brokers/5paisa/auth',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    loginLabel: 'Login with 5paisa',
  },
  {
    id: 'icici',
    name: 'ICICI Direct',
    description: 'Auto-import via Breeze API. Login with your ICICI Direct account.',
    authUrl: '/api/brokers/icici/auth',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-500/10',
    loginLabel: 'Login with ICICI Direct',
  },
  {
    id: 'kotak',
    name: 'Kotak Securities',
    description: 'Auto-sync via Kotak Neo API. Login with your Kotak account.',
    authUrl: '/api/brokers/kotak/auth',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    loginLabel: 'Login with Kotak',
  },
];

const CSV_BROKERS: CsvBroker[] = [
  {
    id: 'groww',
    name: 'Groww',
    description: 'Export holdings CSV from Groww app and upload here.',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'hdfc',
    name: 'HDFC Securities',
    description: 'Export holdings from HDFC Securities portal.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'motilal',
    name: 'Motilal Oswal',
    description: 'Download holdings from MO Investor platform.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'sharekhan',
    name: 'Sharekhan',
    description: 'Export from Sharekhan or Trade Tiger platform.',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'paytm',
    name: 'Paytm Money',
    description: 'Export your stock holdings from Paytm Money app.',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
];

const ALL_BROKER_IDS = [...API_BROKERS.map((b) => b.id), ...CSV_BROKERS.map((b) => b.id)];

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000;

// ── Page component ──────────────────────────────────────────────────

export default function BrokersPage() {
  const router = useRouter();
  const navPending = useOptionalNavigationPending();
  const [connections, setConnections] = useState<Record<string, BrokerConnection | null>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [autoSyncing, setAutoSyncing] = useState<Set<string>>(new Set());
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [showAllCsv, setShowAllCsv] = useState(false);
  const [premiumRequested, setPremiumRequested] = useState(false);
  const [premiumSubmitting, setPremiumSubmitting] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    fetchBrokerStatus();
  }, []);

  useEffect(() => {
    if (loading || !autoSyncEnabled) return;

    const connectedBrokers = API_BROKERS.filter(
      (b) => connections[b.id]?.status === 'connected'
    );
    if (connectedBrokers.length === 0) return;

    autoSyncAll(connectedBrokers.map((b) => b.id));

    const interval = setInterval(() => {
      const currentConnected = API_BROKERS.filter(
        (b) => connections[b.id]?.status === 'connected'
      );
      if (currentConnected.length > 0) {
        autoSyncAll(currentConnected.map((b) => b.id));
      }
    }, AUTO_SYNC_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, autoSyncEnabled, JSON.stringify(Object.keys(connections).filter((k) => connections[k]?.status === 'connected'))]);

  async function autoSyncAll(brokerIds: string[]) {
    setAutoSyncing(new Set(brokerIds));
    await Promise.allSettled(
      brokerIds.map(async (brokerId) => {
        try {
          await fetch(`/api/brokers/${brokerId}/sync`, { method: 'POST' });
        } catch {
          // silent
        }
      })
    );
    setAutoSyncing(new Set());
    await fetchBrokerStatusSilent();
  }

  async function fetchBrokerStatus() {
    setLoading(true);
    try {
      await fetchBrokerStatusInner();
    } finally {
      setLoading(false);
    }
  }

  async function fetchBrokerStatusSilent() {
    try {
      await fetchBrokerStatusInner();
    } catch {
      // silent
    }
  }

  async function fetchBrokerStatusInner() {
    const res = await fetch('/api/brokers');
    if (res.ok) {
      const data = await res.json();
      const connMap: Record<string, BrokerConnection | null> = {};
      const brokerConnections: BrokerConnection[] = data.connections || data || [];
      for (const id of ALL_BROKER_IDS) {
        connMap[id] = brokerConnections.find((c) => c.broker === id) || null;
      }
      setConnections(connMap);
    }
  }

  async function handleConnect(broker: ApiBroker) {
    setConnecting(broker.id);
    try {
      const res = await fetch(broker.authUrl);
      const data = await res.json();

      if (res.status === 503) {
        setUnavailable((prev) => new Set(prev).add(broker.id));
        return;
      }

      if (!res.ok) {
        alert(data.error || `Failed to connect ${broker.name}`);
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.connected) {
        await fetchBrokerStatusSilent();
      }
    } catch {
      alert(`Failed to connect ${broker.name}. Please try again.`);
    } finally {
      setConnecting(null);
    }
  }

  async function handleSync(brokerId: string) {
    setSyncing(brokerId);
    try {
      const res = await fetch(`/api/brokers/${brokerId}/sync`, { method: 'POST' });
      if (res.ok) {
        await fetchBrokerStatusSilent();
      }
    } catch {
      // silent
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(brokerId: string) {
    setDisconnecting(brokerId);
    try {
      const res = await fetch(`/api/brokers/${brokerId}`, { method: 'DELETE' });
      if (res.ok) {
        setConnections((prev) => ({ ...prev, [brokerId]: null }));
      }
    } catch {
      // silent
    } finally {
      setDisconnecting(null);
    }
  }

  async function handlePremiumRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!contactEmail.trim()) return;
    setPremiumSubmitting(true);
    try {
      const res = await fetch('/api/brokers/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
        }),
      });
      if (res.ok) {
        setPremiumRequested(true);
      } else {
        alert('Failed to submit request. Please try again.');
      }
    } catch {
      alert('Failed to submit request. Please try again.');
    } finally {
      setPremiumSubmitting(false);
    }
  }

  function formatLastSynced(dateStr?: string): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-7 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const visibleCsvBrokers = showAllCsv ? CSV_BROKERS : CSV_BROKERS.slice(0, 4);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold">Import Portfolio</h1>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Support for all major Indian brokers. Connect via API or import CSV.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {autoSyncing.size > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 hidden sm:flex">
              <Loader2Icon className="size-3 animate-spin" />
              Syncing...
            </span>
          )}
          <Button
            variant={autoSyncEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
            className="gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
          >
            <TimerIcon className="size-3 sm:size-3.5" />
            <span className="hidden sm:inline">Auto-Sync {autoSyncEnabled ? 'On' : 'Off'}</span>
            {autoSyncEnabled && (
              <span className="sm:hidden size-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick Import */}
      <div>
        <h2 className="text-sm sm:text-base font-semibold text-muted-foreground mb-3">Quick Import (Any broker)</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <Card className="border-dashed">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                <PlusIcon className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">Add Manually</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Add stocks one by one with quantity and buy price
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navPending ? navPending.navigate('/portfolio') : router.push('/portfolio')
                }
                className="shrink-0"
              >
                <PlusIcon className="size-3.5 mr-1" />
                Add
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                <UploadIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">CSV Import</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Works with CSV from any broker — auto-detects format
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)} className="shrink-0">
                <UploadIcon className="size-3.5 mr-1" />
                Upload
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── API Brokers (Auto-sync) — LOCKED / Premium ────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm sm:text-base font-semibold text-muted-foreground">
            Connect Broker (Auto-sync)
            <span className="ml-2 text-xs font-normal">— {API_BROKERS.length} brokers</span>
          </h2>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-[10px]">
            <CrownIcon className="size-2.5" />
            Premium
          </Badge>
        </div>

        {/* Locked broker grid — blurred with overlay */}
        <div className="relative">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 pointer-events-none select-none opacity-40 blur-[2px]">
            {API_BROKERS.map((broker) => (
              <Card key={broker.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${broker.bgColor}`}>
                      <span className={`text-base font-bold ${broker.color}`}>
                        {broker.name[0]}
                      </span>
                    </div>
                    <div>
                      <p className={`font-semibold text-sm sm:text-base ${broker.color}`}>{broker.name}</p>
                      <p className="text-[11px] text-muted-foreground">{broker.description}</p>
                    </div>
                  </div>
                  <Button disabled className="gap-1.5 w-full text-sm">
                    <LockIcon className="size-3.5" />
                    {broker.loginLabel}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4 shadow-lg border-amber-500/20">
              <CardContent className="p-5 sm:p-6">
                <div className="text-center mb-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 mx-auto mb-3">
                    <LockIcon className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold">Premium Feature</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Auto-sync with brokers is available for premium users. Request access and we&apos;ll enable it for you.
                  </p>
                </div>

                {premiumRequested ? (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
                    <CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Request Submitted!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We&apos;ll review your request and get back to you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handlePremiumRequest} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Your email *"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Which broker(s) do you use? (optional)"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={premiumSubmitting}
                      className="w-full gap-1.5"
                    >
                      {premiumSubmitting ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SendIcon className="size-3.5" />
                      )}
                      {premiumSubmitting ? 'Submitting...' : 'Request Access'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── CSV-Only Brokers ───────────────────────────────────────── */}
      <div>
        <h2 className="text-sm sm:text-base font-semibold text-muted-foreground mb-3">
          CSV Import (Step-by-step guides)
          <span className="ml-2 text-xs font-normal">— {CSV_BROKERS.length} brokers</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {visibleCsvBrokers.map((broker) => {
            const guide = CSV_EXPORT_GUIDES[broker.id];
            const isExpanded = expandedGuide === broker.id;

            return (
              <Card key={broker.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${broker.bgColor}`}>
                      <span className={`text-base font-bold ${broker.color}`}>
                        {broker.name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm sm:text-base ${broker.color}`}>{broker.name}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">{broker.description}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setCsvOpen(true)}
                    >
                      <UploadIcon className="size-3" />
                      Upload CSV
                    </Button>
                    {guide && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-muted-foreground"
                        onClick={() => setExpandedGuide(isExpanded ? null : broker.id)}
                      >
                        <FileTextIcon className="size-3" />
                        How to export
                        {isExpanded ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
                      </Button>
                    )}
                  </div>

                  {isExpanded && guide && (
                    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-medium mb-2">Export from {guide.broker}:</p>
                      <ol className="space-y-1.5">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                            <span className="font-semibold text-foreground shrink-0">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                      {guide.tip && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">
                          Tip: {guide.tip}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {CSV_BROKERS.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShowAllCsv(!showAllCsv)}
          >
            {showAllCsv ? (
              <>
                <ChevronUpIcon className="size-3" />
                Show fewer brokers
              </>
            ) : (
              <>
                <ChevronDownIcon className="size-3" />
                Show {CSV_BROKERS.length - 4} more brokers
              </>
            )}
          </Button>
        )}
      </div>

      {/* Security Note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 sm:p-5 flex gap-3">
          <ShieldCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Your data is secure</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
              When you click &quot;Login with...&quot;, you&apos;re redirected to your broker&apos;s official login page.
              We never see your broker password. Your broker sends us a secure token to read your holdings —
              we can&apos;t place trades or modify your account. Tokens are encrypted and can be revoked anytime by disconnecting.
              CSV imports are processed locally — your file never leaves this device.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <InfoIcon className="size-4 text-muted-foreground" />
            How broker connect works
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-medium">Click Login</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">You&apos;re redirected to your broker&apos;s official site</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-medium">Authorize</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Login with your broker credentials and approve read access</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-medium">Auto-import</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Holdings are imported and auto-synced every 5 minutes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onSuccess={() =>
          navPending ? navPending.navigate('/portfolio') : router.push('/portfolio')
        }
      />
    </div>
  );
}
