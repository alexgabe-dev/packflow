import React, { useState } from 'react';
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
    } catch (submitError: any) {
      setError(submitError.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f2ee] px-6 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.22),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(251,191,36,0.10),transparent_18%),radial-gradient(circle_at_50%_75%,rgba(17,24,39,0.07),transparent_30%),linear-gradient(135deg,#f8f5f1_0%,#efebe7_45%,#f8f5f1_100%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.18),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(251,191,36,0.10),transparent_18%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.05),transparent_30%),linear-gradient(135deg,#09090b_0%,#111114_45%,#0b0b0d_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.32)_1px,transparent_1px)] [background-size:42px_42px] dark:opacity-10" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-zinc-900/10 blur-3xl dark:bg-white/5" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch">
        <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-white/60 bg-[#4d4d51]/95 p-8 shadow-[0_30px_80px_rgba(249,115,22,0.14)] backdrop-blur dark:border-zinc-700 dark:bg-[#1a1a1d]/95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_55%)]" />
          <div className="absolute -bottom-12 left-10 h-40 w-40 rounded-full border border-white/10 bg-white/5 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-500">PackFlow Cloud</p>
            <h1 className="mt-4 max-w-[12ch] text-5xl font-black tracking-tight text-white">Save your collection to an account.</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-300">
              Register once and your stash, schedule, sessions, and collection progress will persist in SQLite instead of living only in one browser.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                Account Sync
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                SQLite Storage
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                Secure Session
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md rounded-[2rem] border border-zinc-900/80 bg-[#18181c]/96 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="mb-6 flex gap-2 rounded-2xl bg-zinc-800/80 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${mode === 'login' ? 'bg-zinc-700/80 text-white shadow' : 'text-zinc-500'}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${mode === 'register' ? 'bg-zinc-950 text-white shadow' : 'text-zinc-500'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Username</span>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-[#0d0d10] py-3 pl-11 pr-4 font-medium text-white outline-none transition focus:border-orange-400"
                    placeholder="Your collector name"
                    minLength={3}
                    required={mode === 'register'}
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-[#0d0d10] py-3 pl-11 pr-4 font-medium text-white outline-none transition focus:border-orange-400"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">Password</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-[#0d0d10] py-3 pl-11 pr-4 font-medium text-white outline-none transition focus:border-orange-400"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </label>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              <span>{isSubmitting ? 'Working...' : mode === 'login' ? 'Login' : 'Create Account'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
