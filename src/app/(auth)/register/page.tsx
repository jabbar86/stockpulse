'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, EyeIcon, EyeOffIcon, CheckIcon, MailIcon, UserIcon, AtSignIcon, LockIcon } from 'lucide-react';
import { friendlySupabaseAuthMessage } from '@/lib/auth/supabase-auth-errors';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const passwordChecks = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Letter', met: /[a-zA-Z]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(friendlySupabaseAuthMessage(authError.message));
        setLoading(false);
        return;
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Please sign in instead.');
        setLoading(false);
        return;
      }

      setEmailSent(true);
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-5">
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MailIcon className="size-10 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground mt-2">
            We&apos;ve sent a verification link to
          </p>
          <p className="text-sm font-semibold mt-1">{email}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click the link in the email to verify your account, then come back to sign in.
            Check your spam folder if you don&apos;t see it.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="w-full h-12 mt-2 rounded-xl text-base">
            Back to Sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start tracking your portfolio in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-destructive/10 p-3.5 text-left text-sm font-medium leading-relaxed text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-12 text-base pl-10 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <AtSignIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base pl-10 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 text-base pl-10 pr-10 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex gap-2 pt-1.5">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      check.met
                        ? 'bg-gain/10 text-gain'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <CheckIcon className={`size-2.5 ${check.met ? '' : 'opacity-30'}`} />
                    {check.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 font-semibold rounded-xl text-base shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground/50">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
