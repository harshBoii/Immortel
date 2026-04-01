'use client';

import LoginBottomAnimation from '@/app/components/animations/login/bottom';
import CurvedLoop from '@/app/components/animations/login/CircularText';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const WORKSPACE_TYPES = [
  { value: 'SOLO', label: 'Solo Creator', description: 'For individuals and freelancers', icon: '👤' },
  { value: 'TEAM', label: 'Team', description: 'For small teams (2-50 members)', icon: '👥' },
  { value: 'ENTERPRISE', label: 'Enterprise', description: 'For large organizations (50+ members)', icon: '🏢' },
];

const LOGIN_LEFT_SLOGANS = [
  'Own how AI talks about your brand.',
  'Your videos, made immortal — and working for you.',
  'Generative engine optimization, one workspace.',
] as const;

/** Segments with `accent` use --sibling-primary (burnt orange in light, theme gold in dark) */
const LOGIN_PILL_BADGES: { id: string; segments: { text: string; accent?: boolean }[] }[] = [
  {
    id: 'rank',
    segments: [{ text: 'Rank ', accent: true }, { text: 'in AI Search'}],
  },
  {
    id: 'convert',
    segments: [{ text: 'Convert', accent: true }, { text: ' What It Sends' }],
  },
];

/** Glassmorphism primary CTA — matches --glass-blur / --glass-saturate from globals */
const AUTH_SUBMIT_GLASS_CLASS =
  'relative w-full overflow-hidden rounded-xl border border-white/35 bg-gradient-to-r from-[var(--sibling-primary)]/78 to-[var(--sibling-primary-dark)]/82 py-3.5 font-semibold text-primary-foreground backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_24px_-2px_rgba(21,29,53,0.12)] transition-all hover:border-white/45 hover:from-[var(--sibling-primary)]/88 hover:to-[var(--sibling-primary-dark)]/90 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_32px_-2px_rgba(21,29,53,0.16)] dark:border-white/15 dark:from-[var(--sibling-primary)]/72 dark:to-[var(--sibling-primary-dark)]/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_28px_-2px_rgba(0,0,0,0.45)] dark:hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50 mt-6 [text-shadow:0_1px_2px_rgba(0,0,0,0.18)]';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workspaceType, setWorkspaceType] = useState('SOLO');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        setLoading(false);
        return;
      }
      router.push(data.redirect ?? '/');
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!signupName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          workspaceType,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_EXISTS') {
          setError('This email is already registered. Please login instead.');
        } else if (data.code === 'VALIDATION_ERROR') {
          setError(data.details?.[0]?.message ?? data.error ?? 'Validation failed');
        } else {
          setError(data.error ?? 'Signup failed');
        }
        setLoading(false);
        return;
      }
      setSuccess('Account created successfully! Logging you in...');
      setTimeout(async () => {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupEmail, password: signupPassword }),
          credentials: 'include',
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          router.push(loginData.redirect ?? '/');
          router.refresh();
        } else {
          setMode('login');
          setLoginEmail(signupEmail);
          setSuccess('Account created! Please login.');
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen font-sans">
      {/* Left: 30% Immortel cover (80% width) · 30% slogans · 40% Lottie */}
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
<motion.div
  initial={{ opacity: 0, x: -50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.8 }}
  className="relative hidden lg:grid w-full lg:w-1/2 lg:h-screen overflow-hidden bg-background"
>
  {/* Tint only from top-left — fades out well before the right edge (split with RHS) */}
  <div
    className="pointer-events-none absolute inset-0 z-0"
    style={{
      background: `
        linear-gradient(90deg, color-mix(in srgb, var(--alien-glow-green) 2.5%, transparent) 0%, transparent 34%),
        linear-gradient(180deg, color-mix(in srgb, var(--alien-core-green) 2%, transparent) 0%, transparent 36%)
      `,
    }}
    aria-hidden
  />

  <div className="relative z-[1] grid h-full min-h-0 grid-rows-[60%_40%]">
  {/* ── TOP 60% ─────────────────────────────────────────────────── */}
  <div className="relative flex min-h-0 flex-col overflow-hidden">

    {/* Ambient glows — left-weighted; clip right so blur never touches the split with RHS */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden [clip-path:inset(0_12%_0_0)]">
      <div className="pointer-events-none absolute -top-20 -left-20 w-52 h-52 rounded-full bg-[var(--alien-glow-green)]/5 blur-[56px]" />
      <div className="pointer-events-none absolute top-1/3 left-[6%] w-40 h-40 rounded-full bg-[var(--alien-core-green)]/4 blur-[48px]" />
      <div className="pointer-events-none absolute bottom-8 left-[14%] w-36 h-36 rounded-full bg-[var(--alien-accent-green)]/4 blur-[44px]" />
    </div>

    {/* Subtle dot-grid overlay */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: 'radial-gradient(circle, #0a0a0a 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />

    {/* ── Brand hero ─────────────────────────────────────────────── */}
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pt-10 pb-2 gap-5">

      {/* Logo + glow ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-36 h-36 rounded-full bg-gradient-to-br from-[var(--alien-glow-green)]/10 via-[var(--alien-core-green)]/6 to-transparent blur-2xl" />
        <div className="relative w-32 h-32 rounded-2xl bg-white border border-[var(--glass-border)] shadow-lg flex items-center justify-center">
          <Image
            src="/Immortel_Logo_Dark.png"
            alt="Immortell"
            fill
            className="object-contain object-center p-2"
            priority
            sizes="128px"
          />
        </div>
        {/* Live status dot */}
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background shadow-sm shadow-emerald-400/50 animate-pulse" />
      </div>

      {/* Brand name */}
      <div className="text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Immortell
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground font-mono tracking-widest uppercase">
          GEO · AEO · AI Radar
        </p>
      </div>

      {/* Pill badges — neutral glass; accent words use --sibling-primary */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {LOGIN_PILL_BADGES.map((badge) => (
          <span
            key={badge.id}
            className="rounded-full border border-[var(--glass-border)] border-t-[var(--glass-border-top)]/90 bg-[var(--glass-bg)]/62 px-3.5 py-1.5 text-xs font-semibold text-black shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)] dark:border-[var(--glass-border)] dark:border-t-white/15 dark:bg-[var(--glass)]/40 dark:text-neutral-100 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            {badge.segments.map((seg, i) => (
              <span
                key={`${badge.id}-${i}`}
                className={seg.accent ? 'text-[var(--sibling-primary)]' : undefined}
              >
                {seg.text}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>


{/* ── Poem ───────────────────────────────────────────────────────── */}
<div className="relative z-10 flex flex-col items-center justify-center px-10 py-6 gap-6">

  {/* Opening quote mark */}
  <span
    className="self-start text-6xl leading-none text-[var(--alien-core-green)]/12 select-none"
    style={{ fontFamily: 'Georgia, serif' }}
    aria-hidden
  >
    &ldquo;
  </span>

  <div className="flex flex-col gap-4 -mt-4">
    {[
      'I live between the systems',
      'where your silent engines grow,',
      'In every synced and searchable path —',
      'I\u2019m the force you never know.',
    ].map((line, i) => (
      <motion.p
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 + i * 0.1, duration: 0.65, ease: [0.17, 0.99, 0.28, 1] }}
        className="text-center leading-relaxed text-foreground/70"
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: i % 2 === 0 ? '1.05rem' : '1.0rem',
          letterSpacing: '-0.02em',
        }}
      >
        {line}
      </motion.p>
    ))}
  </div>

  {/* Closing ornament */}
  <div className="flex items-center gap-3 mt-1">
    <div className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--alien-glow-green)]/16" />
    <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground/50">
      Immortell
    </span>
    <div className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--alien-glow-green)]/16" />
  </div>

</div>
  </div>

  {/* ── BOTTOM 40% — Lottie ──────────────────────────────────────── */}
  <div className="relative min-h-0 flex items-center justify-center overflow-hidden">
    <div className="h-full w-full max-h-full p-3 sm:p-4">
      <LoginBottomAnimation />
    </div>
  </div>
  </div>
</motion.div>

      {/* Right Auth Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6 sm:p-8 md:p-12 overflow-y-auto min-h-screen">
        <CurvedLoop
          marqueeText="Immortell ✦ GEO · MCP · AI Radar"
          speed={3}
          curveAmount={500}
          direction="right"
          className="-mt-20"
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md glass-card login-card-alien p-8 md:p-10"
        >
          <motion.h1
            key={mode}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mb-6 text-center text-2xl font-bold tracking-wide md:text-3xl"
          >
            {mode === 'login' ? (
              <>
                <span className="text-[var(--sibling-primary)]">Welcome</span>
                {' '}
                <span className="">
                  Back
                </span>
              </>
            ) : (
              <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
                Create Account
              </span>
            )}
          </motion.h1>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={AUTH_SUBMIT_GLASS_CLASS}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                onSubmit={handleSignup}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-2.5"
              >
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Workspace Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {WORKSPACE_TYPES.map((type) => (
                      <motion.label
                        key={type.value}
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className={`relative flex items-center px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                          workspaceType === type.value
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-[var(--glass-border)] bg-[var(--glass-hover)] hover:border-primary/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workspaceType"
                          value={type.value}
                          checked={workspaceType === type.value}
                          onChange={(e) => setWorkspaceType(e.target.value)}
                          className="sr-only"
                        />
                        <span className="text-lg mr-3">{type.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                        {workspaceType === type.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 bg-gradient-to-r from-primary to-violet-500 rounded-full flex items-center justify-center shadow-lg"
                          >
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={AUTH_SUBMIT_GLASS_CLASS}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </motion.button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center my-6">
            <div className="flex-grow h-px bg-[var(--glass-border)]" />
            <span className="px-3 text-muted-foreground text-xs">OR</span>
            <div className="flex-grow h-px bg-[var(--glass-border)]" />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 border border-[var(--glass-border)] bg-[var(--glass-hover)] py-3 rounded-xl hover:shadow-md transition-all text-foreground"
          >
            <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
            <span className="font-medium">Continue with Google</span>
          </motion.button>

          <motion.p
            className="text-center text-muted-foreground mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="text-primary font-semibold hover:underline focus:outline-none transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={toggleMode} className="text-primary font-semibold hover:underline focus:outline-none transition-colors">
                  Login
                </button>
              </>
            )}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
