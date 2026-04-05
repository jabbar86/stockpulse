'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, EyeIcon, EyeOffIcon, MailIcon, AtSignIcon, LockIcon, CheckCircle2Icon } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const justVerified = searchParams.get('verified') === 'true';
  const authErrorCode = searchParams.get('authError');
  const authErrorBanner =
    authErrorCode === 'missing_code' || authErrorCode === 'verification_failed'
      ? authErrorCode === 'missing_code'
        ? 'That confirmation link is missing or expired. On the sign-in page, use “Resend verification email” if your account is not confirmed yet.'
        : 'We could not confirm your email from that link. Open the link in the same browser you used to sign up, or request a new verification email below.'
      : authErrorCode
        ? (() => {
            try {
              return decodeURIComponent(authErrorCode);
            } catch {
              return authErrorCode;
            }
          })()
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsVerification(false);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setNeedsVerification(true);
      } else if (authError.message.toLowerCase().includes('invalid login credentials')) {
        setError(
          'Invalid email or password. If you don\'t have an account, please sign up first.'
        );
      } else {
        setError(authError.message);
      }
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleResendVerification() {
    setResending(true);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
    }
  }

  return (
    <div className="space-y-7">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your StockPulse account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {justVerified && (
          <div className="bg-gain/10 text-gain text-sm p-3.5 rounded-xl text-center font-medium flex items-center justify-center gap-2">
            <CheckCircle2Icon className="size-4" />
            Email verified! You can now sign in.
          </div>
        )}

        {authErrorBanner && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3.5 text-center text-sm font-medium text-destructive">
            {authErrorBanner}
          </div>
        )}

        {needsVerification && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm p-4 rounded-xl text-center space-y-3">
            <div className="flex justify-center">
              <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <MailIcon className="size-5" />
              </div>
            </div>
            <p className="font-semibold text-sm">Email not verified</p>
            <p className="text-xs opacity-80">
              Check your inbox for the verification link sent to{' '}
              <span className="font-semibold">{email}</span>
            </p>
            {resent ? (
              <p className="text-xs text-gain font-medium flex items-center justify-center gap-1">
                <CheckCircle2Icon className="size-3" />
                Verification email resent!
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs rounded-lg"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                Resend verification email
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3.5 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
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
                autoFocus
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 font-semibold rounded-xl text-base shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign in
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
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
