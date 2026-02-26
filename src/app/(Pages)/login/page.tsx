'use client';

import CurvedLoop from '@/app/components/CircularText';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const WORKSPACE_TYPES = [
  { value: 'SOLO', label: 'Solo Creator', description: 'For individuals and freelancers', icon: '👤' },
  { value: 'TEAM', label: 'Team', description: 'For small teams (2-50 members)', icon: '👥' },
  { value: 'ENTERPRISE', label: 'Enterprise', description: 'For large organizations (50+ members)', icon: '🏢' },
];

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
      {/* Left wallpaper */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full lg:w-1/2 relative min-h-[50vh] lg:min-h-screen items-center justify-center hidden lg:flex overflow-hidden bg-gradient-to-br from-primary via-violet-500 to-blue-500"
      >
        <Image
          src="/Immortel_Side.png"
          alt="Immortel"
          fill
          className="object-cover opacity-90"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-500/10 pointer-events-none" />
      </motion.div>

      {/* Right Auth Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6 sm:p-8 md:p-12 overflow-y-auto min-h-screen">
        <CurvedLoop
          marqueeText="Immortel ✦ Your Videos made Immortal ✦"
          speed={3}
          curveAmount={500}
          direction="right"
          className="-mt-20"
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md glass-card p-8 md:p-10"
        >
          <motion.h1
            key={mode}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent mb-6 tracking-wide text-center"
          >
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
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
                  className="w-full bg-gradient-to-r from-primary to-violet-500 text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
                  className="w-full bg-gradient-to-r from-primary to-violet-500 text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
                <button type="button" onClick={toggleMode} className="text-primary font-semibold hover:underline focus:outline-none transition-colors">
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
