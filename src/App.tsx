import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { Collection } from './components/Collection';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { Settings } from './components/Settings';
import { AccountSettings } from './components/AccountSettings';
import { SessionMode } from './components/SessionMode';
import { AuthScreen } from './components/AuthScreen';
import { BookOpen, Calendar, Database, History, LayoutDashboard, LogOut, Menu, Settings as SettingsIcon, UserCircle2, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'calendar' | 'collection' | 'history' | 'profile' | 'management' | 'settings';
const APP_ACTIVE_TAB_KEY = 'packflow:active-tab';

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const savedTab = window.localStorage.getItem(APP_ACTIVE_TAB_KEY);
    if (savedTab === 'settings') {
      return 'management';
    }
    if (savedTab === 'dashboard' || savedTab === 'calendar' || savedTab === 'collection' || savedTab === 'history' || savedTab === 'profile' || savedTab === 'management') {
      return savedTab;
    }
    return 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { sessions, profile, isReady } = useApp();
  const { user, logout } = useAuth();

  const activeSession = sessions.find((session) => session.id === activeSessionId);

  React.useEffect(() => {
    window.localStorage.setItem(APP_ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'collection', label: 'Collection', icon: BookOpen },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: UserCircle2 },
    { id: 'management', label: 'Management', icon: Database },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        Loading your collection...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-orange-100 selection:text-orange-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Toaster position="top-center" />

      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-200 bg-white transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col p-6">
          <div className="mb-12 flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-orange-500 text-xl font-black italic text-white shadow-lg shadow-orange-500/20"
            >
              PF
            </motion.div>
            <div>
              <span className="block text-2xl font-black tracking-tighter">PackFlow</span>
              <span className="text-xs text-zinc-400">{profile.username}</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-all',
                  activeTab === item.id ? 'text-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="nav-bg"
                    className="absolute inset-0 rounded-xl bg-zinc-900 shadow-lg dark:bg-white"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn('relative z-10 h-5 w-5 transition-transform group-hover:scale-110', activeTab === item.id && 'scale-110')} />
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <div className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-900/10">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">Synced Account</p>
              <p className="text-xs leading-relaxed text-orange-800 dark:text-orange-300">
                Your stash, sessions, and collection are now saved to SQLite.
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black italic text-white">PF</div>
          <span className="font-black tracking-tighter">PackFlow</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main className="min-h-screen pt-20 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-6xl p-6 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {activeTab === 'dashboard' && <Dashboard onStartSession={(id) => setActiveSessionId(id)} onOpenSettings={() => setActiveTab('management')} />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'collection' && <Collection />}
              {activeTab === 'history' && <HistoryView />}
              {activeTab === 'profile' && <ProfileView />}
              {activeTab === 'management' && <Settings onOpenSession={(id) => setActiveSessionId(id)} />}
              {activeTab === 'settings' && <AccountSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {activeSession && <SessionMode session={activeSession} onClose={() => setActiveSessionId(null)} />}
      </AnimatePresence>
    </div>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        Checking your account...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
