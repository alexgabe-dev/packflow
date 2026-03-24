import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Database,
  KeyRound,
  Mail,
  RefreshCcw,
  Shield,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export const AccountSettings: React.FC = () => {
  const {
    sealedStash,
    sessions,
    collection,
    wishlist,
    profile,
    clearCollectionData,
    clearHistoryData,
    clearStashData,
    resetAppData,
    resetSchedule,
  } = useApp();
  const { user, updateEmail, changePassword, deleteAccount } = useAuth();

  const [nextEmail, setNextEmail] = React.useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [deletePassword, setDeletePassword] = React.useState('');
  const [busyAction, setBusyAction] = React.useState<'email' | 'password' | 'delete' | null>(null);

  React.useEffect(() => {
    setNextEmail(user?.email ?? '');
  }, [user?.email]);

  const completedSessions = sessions.filter((session) => session.isCompleted).length;
  const totalStashPacks = sealedStash.reduce((sum, pack) => sum + pack.count, 0);
  const collectionEntries = Object.keys(collection).length;
  const savedRecords = completedSessions + totalStashPacks + collectionEntries + wishlist.length;

  const runDangerAction = (message: string, action: () => void) => {
    if (!window.confirm(message)) return;
    action();
  };

  const handleEmailUpdate = async () => {
    if (!nextEmail.trim() || !emailPassword.trim()) return;
    setBusyAction('email');
    try {
      await updateEmail(nextEmail, emailPassword);
      setEmailPassword('');
      toast.success('Email updated.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update email.');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setBusyAction('password');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update password.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) return;
    if (!window.confirm('Delete this PackFlow account permanently? This removes your login and all saved data.')) {
      return;
    }

    setBusyAction('delete');
    try {
      await deleteAccount(deletePassword);
      toast.success('Account deleted.');
    } catch (error: any) {
      toast.error(error.message || 'Could not delete account.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(249,115,22,0.1),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">Settings</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Account, security, and data controls.</h2>
            <p className="mt-4 text-zinc-500">
              Manage your login, protect the account, and control exactly how much PackFlow keeps in sync.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[520px]">
            <div className="min-h-[124px] rounded-3xl bg-zinc-950 px-5 py-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Username</p>
              <p className="mt-4 truncate text-2xl font-black">{profile.username}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Email</p>
              <p className="mt-4 truncate text-lg font-black">{user?.email ?? 'Signed in'}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Records</p>
              <p className="mt-4 text-4xl font-black">{savedRecords}</p>
            </div>
            <div className="min-h-[124px] rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">History</p>
              <p className="mt-4 text-4xl font-black">{completedSessions}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sky-500">
            <Mail className="h-5 w-5" />
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Email & Identity</h3>
          </div>
          <p className="mt-2 text-zinc-500">Change the login email tied to this PackFlow account.</p>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">New Email</span>
              <input
                type="email"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold outline-none transition focus:border-sky-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Current Password</span>
              <input
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold outline-none transition focus:border-sky-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <button
              onClick={handleEmailUpdate}
              disabled={busyAction === 'email' || !nextEmail.trim() || !emailPassword.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 p-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              <Mail className="h-4 w-4" />
              <span>{busyAction === 'email' ? 'Updating...' : 'Update Email'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-emerald-500">
            <KeyRound className="h-5 w-5" />
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Password & Security</h3>
          </div>
          <p className="mt-2 text-zinc-500">Rotate your password and keep your account protected.</p>

          <div className="mt-6 grid gap-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold outline-none transition focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold outline-none transition focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold outline-none transition focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950">
              Use at least 6 characters. After a password change, your current session stays active.
            </div>
            <button
              onClick={handlePasswordUpdate}
              disabled={busyAction === 'password' || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              <span>{busyAction === 'password' ? 'Saving...' : 'Change Password'}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-orange-500">
            <Database className="h-5 w-5" />
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Data & Privacy</h3>
          </div>
          <p className="mt-2 text-zinc-500">Clean up parts of your account without touching everything at once.</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Collection</p>
              <p className="mt-2 text-2xl font-bold">{collectionEntries}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Wishlist</p>
              <p className="mt-2 text-2xl font-bold">{wishlist.length}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Stash</p>
              <p className="mt-2 text-2xl font-bold">{totalStashPacks}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Completed</p>
              <p className="mt-2 text-2xl font-bold">{completedSessions}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              onClick={resetSchedule}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>Rebuild Future Schedule</span>
            </button>
            <button
              onClick={() => runDangerAction('Reset collection, wishlist, and featured card picks?', clearCollectionData)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <UserCircle2 className="h-4 w-4" />
              <span>Reset Collection Data</span>
            </button>
            <button
              onClick={() => runDangerAction('Delete completed session history and logged pulls?', clearHistoryData)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Database className="h-4 w-4" />
              <span>Reset History</span>
            </button>
            <button
              onClick={() => runDangerAction('Remove all sealed stash items and future scheduled sessions?', clearStashData)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset Stash</span>
            </button>
            <button
              onClick={() =>
                runDangerAction(
                  'Reset all PackFlow app data for this account? This clears stash, history, collection, wishlist, and preferences.',
                  resetAppData
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 p-4 font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>Reset All App Data</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Danger Zone</h3>
            </div>
            <p className="mt-2 text-zinc-500">Permanent actions live here. Use them carefully.</p>

            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Delete Account</p>
              <p className="mt-1 text-sm text-red-600/80 dark:text-red-300/80">
                This removes your login, synced PackFlow state, and the SQLite-backed account record permanently.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Confirm with password"
                  className="rounded-2xl border border-red-200 bg-white p-4 font-semibold text-zinc-900 outline-none transition focus:border-red-400 dark:border-red-900/50 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={busyAction === 'delete' || !deletePassword.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{busyAction === 'delete' ? 'Deleting...' : 'Delete Account'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
