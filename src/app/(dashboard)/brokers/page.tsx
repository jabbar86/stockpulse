'use client';

import { useEffect, useState } from 'react';
import type { BrokerConnection } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LinkIcon,
  UnlinkIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
} from 'lucide-react';

interface BrokerConfig {
  id: 'upstox' | 'zerodha';
  name: string;
  description: string;
  authUrl: string;
  color: string;
}

const BROKERS: BrokerConfig[] = [
  {
    id: 'upstox',
    name: 'Upstox',
    description: 'Connect your Upstox trading account to import holdings and track portfolio.',
    authUrl: '/api/brokers/upstox/auth',
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'zerodha',
    name: 'Zerodha',
    description: 'Connect your Zerodha Kite account to sync holdings automatically.',
    authUrl: '/api/brokers/zerodha/auth',
    color: 'text-orange-600 dark:text-orange-400',
  },
];

export default function BrokersPage() {
  const [connections, setConnections] = useState<Record<string, BrokerConnection | null>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchBrokerStatus();
  }, []);

  async function fetchBrokerStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/brokers');
      if (res.ok) {
        const data = await res.json();
        const connMap: Record<string, BrokerConnection | null> = {};
        const brokerConnections: BrokerConnection[] = data.connections || data || [];
        for (const broker of BROKERS) {
          connMap[broker.id] = brokerConnections.find((c) => c.broker === broker.id) || null;
        }
        setConnections(connMap);
      }
    } catch {
      // Failed to fetch broker status
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(broker: BrokerConfig) {
    // Redirect to OAuth flow
    window.location.href = broker.authUrl;
  }

  async function handleSync(brokerId: string) {
    setSyncing(brokerId);
    try {
      const res = await fetch(`/api/brokers/${brokerId}/sync`, { method: 'POST' });
      if (res.ok) {
        await fetchBrokerStatus();
      }
    } catch {
      // sync failed silently
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
      // disconnect failed silently
    } finally {
      setDisconnecting(null);
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Broker Connections</h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Broker Connections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your trading accounts to automatically import and sync holdings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {BROKERS.map((broker) => {
          const connection = connections[broker.id];
          const isConnected = connection?.status === 'connected';
          const isExpired = connection?.status === 'expired';
          const isSyncing = syncing === broker.id;
          const isDisconnecting = disconnecting === broker.id;

          return (
            <Card key={broker.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={broker.color}>{broker.name}</CardTitle>
                  {isConnected && (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 gap-1">
                      <CheckCircle2Icon className="size-3" />
                      Connected
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 gap-1">
                      <XCircleIcon className="size-3" />
                      Expired
                    </Badge>
                  )}
                  {!connection && (
                    <Badge variant="outline" className="gap-1">
                      <XCircleIcon className="size-3" />
                      Disconnected
                    </Badge>
                  )}
                </div>
                <CardDescription>{broker.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-4">
                    {/* Last Synced */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Last Synced</p>
                        <p className="text-sm font-medium">
                          {formatLastSynced(connection.last_synced)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(broker.id)}
                        disabled={isSyncing}
                        className="gap-1.5"
                      >
                        {isSyncing ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="size-3.5" />
                        )}
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </div>

                    {/* Disconnect Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(broker.id)}
                      disabled={isDisconnecting}
                      className="gap-1.5 w-full"
                    >
                      {isDisconnecting ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <UnlinkIcon className="size-3.5" />
                      )}
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isExpired && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Your session has expired. Please reconnect to continue syncing.
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={() => handleConnect(broker)}
                      className="gap-1.5 w-full"
                    >
                      <LinkIcon className="size-3.5" />
                      Connect {broker.name}
                      <ExternalLinkIcon className="size-3 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card size="sm">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <LinkIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">How broker connections work</p>
              <p className="text-xs text-muted-foreground mt-1">
                We use secure OAuth to connect to your broker account. We only read your holdings
                data and never place orders or make changes to your account. You can disconnect
                at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
