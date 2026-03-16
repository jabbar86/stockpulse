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
  ai_analyses_used_today: number;
  holdings_count: number;
  broker_connections: number;
}

export default function ProfilePage() {
  const { signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleEditStart = () => {
    if (profile) {
      setEditName(profile.name);
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
        setProfile((prev) => prev ? { ...prev, ...updated } : prev);
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

  const initials = profile
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '';

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load profile.</p>
      </div>
    );
  }

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
                    <h2 className="text-xl sm:text-2xl font-bold">{profile.name || 'No name set'}</h2>
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
                <span className="text-sm">{profile.email}</span>
              </div>

              {/* Badges */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {profile.is_premium ? (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                    <SparklesIcon className="size-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <UserIcon className="size-3" />
                    Free
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <CalendarIcon className="size-3" />
                  Joined {memberSince}
                </Badge>
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                <BrainCircuitIcon className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI Analyses Today</p>
                <p className="text-sm font-semibold">
                  {profile.ai_analyses_used_today} / {profile.max_ai_analyses}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
                <BriefcaseIcon className="size-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holdings</p>
                <p className="text-sm font-semibold">{profile.holdings_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Link2Icon className="size-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Brokers Connected</p>
                <p className="text-sm font-semibold">{profile.broker_connections}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <ShieldIcon className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-semibold">
                  {profile.is_premium ? 'Premium' : 'Free'}
                </p>
              </div>
            </div>
          </div>
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
