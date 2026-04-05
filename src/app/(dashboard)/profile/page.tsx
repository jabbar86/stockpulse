'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/session-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  UserIcon,
  MailIcon,
  ShieldIcon,
  BrainCircuitIcon,
  BriefcaseIcon,
  Link2Icon,
  CalendarIcon,
  Loader2Icon,
  PencilIcon,
  CheckIcon,
  XIcon,
  LogOutIcon,
  SparklesIcon,
} from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  is_premium: boolean;
  max_ai_analyses: number;
  created_at: string;
  ai_analyses_used: number;
  holdings_count: number;
  broker_connections: number;
}

export default function ProfilePage() {
  const { signOut, refreshProfile, profile: authProfile, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEditStart = () => {
    if (displayName) {
      setEditName(displayName);
      setEditing(true);
    }
  };

  const handleEditCancel = () => {
    setEditing(false);
    setEditName('');
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) =>
          prev
            ? { ...prev, ...updated }
            : {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                is_premium: updated.is_premium,
                max_ai_analyses: updated.max_ai_analyses,
                created_at: updated.created_at,
                ai_analyses_used: 0,
                holdings_count: 0,
                broker_connections: 0,
              }
        );
        setEditing(false);
        toast.success('Profile updated');
        refreshProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const canShowShell = !!(profile || authProfile);

  const displayName = profile?.name ?? authProfile?.name ?? '';
  const displayEmail = profile?.email ?? authProfile?.email ?? '';

  const initials = (displayName || displayEmail || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '';

  if ((authLoading || detailLoading) && !canShowShell) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!canShowShell && !detailLoading && loadFailed) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load profile.</p>
      </div>
    );
  }

  if (!canShowShell) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load profile.</p>
      </div>
    );
  }

  const hasFullProfile = !!profile;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      <h1 className="text-lg sm:text-3xl font-bold">Profile</h1>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <Avatar className="size-20 sm:size-24 ring-4 ring-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl sm:text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3 w-full">
              {/* Name */}
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-xs h-9 text-lg font-semibold"
                      placeholder="Your name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleEditSave}
                      disabled={saving || !editName.trim()}
                      className="size-8"
                    >
                      {saving ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <CheckIcon className="size-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleEditCancel}
                      className="size-8"
                    >
                      <XIcon className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl font-bold sm:text-2xl">
                      {displayName || 'No name set'}
                    </h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleEditStart}
                      className="size-7"
                    >
                      <PencilIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                <MailIcon className="size-4" />
                <span className="text-sm">{displayEmail}</span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {detailLoading && !hasFullProfile ? (
                  <Skeleton className="h-6 w-28 rounded-full" />
                ) : hasFullProfile ? (
                  profile!.is_premium ? (
                    <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600">
                      <SparklesIcon className="size-3" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <UserIcon className="size-3" />
                      Free
                    </Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <UserIcon className="size-3" />
                    Free
                  </Badge>
                )}
                {detailLoading && !memberSince ? (
                  <Skeleton className="h-6 w-36 rounded-full" />
                ) : memberSince ? (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <CalendarIcon className="size-3" />
                    Joined {memberSince}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasFullProfile ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <BrainCircuitIcon className="size-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Credits Used</p>
                  <p className="text-sm font-semibold">
                    {profile!.ai_analyses_used} / {profile!.max_ai_analyses}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
                  <BriefcaseIcon className="size-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Holdings</p>
                  <p className="text-sm font-semibold">{profile!.holdings_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
                  <Link2Icon className="size-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Brokers Connected</p>
                  <p className="text-sm font-semibold">{profile!.broker_connections}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <ShieldIcon className="size-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm font-semibold">
                    {profile!.is_premium ? 'Premium' : 'Free'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
            onClick={() => signOut()}
          >
            <LogOutIcon className="size-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
