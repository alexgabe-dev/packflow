import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const port = Number(process.env.PORT || 3001);
const host = '127.0.0.1';
const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'packflow.sqlite');
const sessionCookieName = 'packflow_session';

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_state (
    user_id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const defaultAppState = (username = 'Collector') => ({
  sealedStash: [],
  sessions: [],
  preferences: {
    packsPerSession: 2,
    sessionsPerWeek: 2,
    pacing: 'balanced',
    startDate: new Date().toISOString(),
  },
  wishlist: [],
  collection: {},
  profile: {
    username,
    avatarId: 'ember-fox',
    avatarUrl: '',
    thumbnailUrl: '',
    tagline: 'Building the binder one session at a time.',
    featuredCardKeys: [],
    comments: [],
  },
});

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [key, ...rest] = part.split('=');
      acc[key] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.password_salt);
  return hash === user.password_hash;
}

function sanitizeUser(user) {
  return user ? { id: user.id, email: user.email } : null;
}

function createSession(userId) {
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, userId, expires.toISOString(), now.toISOString());

  return { id, expires };
}

function setSessionCookie(res, session) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${session.id}; Path=/; HttpOnly; SameSite=Lax; Expires=${session.expires.toUTCString()}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(0).toUTCString()}`
  );
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[sessionCookieName];
  if (!sessionId) return null;

  const session = db
    .prepare(
      `SELECT sessions.id, sessions.user_id, sessions.expires_at, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .get(sessionId);

  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }

  return session;
}

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = { id: session.user_id, email: session.email };
  req.session = session;
  next();
}

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.json({ user: null });
    return;
  }

  res.json({ user: { id: session.user_id, email: session.email } });
});

app.post('/api/auth/register', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const username = String(req.body?.username || '').trim();

  if (!email || !password || password.length < 6 || username.length < 3) {
    res.status(400).json({ error: 'Provide a valid email, a username with at least 3 characters, and a password with at least 6 characters.' });
    return;
  }

  const existing = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: hash,
    password_salt: salt,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (@id, @email, @password_hash, @password_salt, @created_at)'
  ).run(user);

  db.prepare('INSERT INTO app_state (user_id, json, updated_at) VALUES (?, ?, ?)').run(
    user.id,
    JSON.stringify(defaultAppState(username)),
    new Date().toISOString()
  );

  const session = createSession(user.id);
  setSessionCookie(res, session);

  res.status(201).json({ user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const { hash } = hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const session = createSession(user.id);
  setSessionCookie(res, session);
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[sessionCookieName];
  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.put('/api/auth/email', requireAuth, (req, res) => {
  const nextEmail = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!nextEmail || !password) {
    res.status(400).json({ error: 'Provide your new email and current password.' });
    return;
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!currentUser || !verifyPassword(password, currentUser)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(nextEmail, req.user.id);
  if (existing) {
    res.status(409).json({ error: 'That email address is already in use.' });
    return;
  }

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(nextEmail, req.user.id);
  const updatedUser = { ...currentUser, email: nextEmail };
  res.json({ user: sanitizeUser(updatedUser) });
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Provide your current password and a new password with at least 6 characters.' });
    return;
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!currentUser || !verifyPassword(currentPassword, currentUser)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const { salt, hash } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/auth/account', requireAuth, (req, res) => {
  const password = String(req.body?.password || '');
  if (!password) {
    res.status(400).json({ error: 'Enter your password to delete the account.' });
    return;
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!currentUser || !verifyPassword(password, currentUser)) {
    res.status(401).json({ error: 'Password is incorrect.' });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM app_state WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  });

  transaction();
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/app-state', requireAuth, (req, res) => {
  const record = db.prepare('SELECT json FROM app_state WHERE user_id = ?').get(req.user.id);
  if (!record) {
    const state = defaultAppState();
    db.prepare('INSERT INTO app_state (user_id, json, updated_at) VALUES (?, ?, ?)').run(
      req.user.id,
      JSON.stringify(state),
      new Date().toISOString()
    );
    res.json({ state });
    return;
  }

  res.json({ state: JSON.parse(record.json) });
});

app.put('/api/app-state', requireAuth, (req, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== 'object') {
    res.status(400).json({ error: 'Invalid state payload.' });
    return;
  }

  db.prepare(
    `INSERT INTO app_state (user_id, json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`
  ).run(req.user.id, JSON.stringify(state), new Date().toISOString());

  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(rootDir, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
} else {
  app.get(/^\/(?!api).*/, (req, res) => {
    const target = `http://127.0.0.1:3000${req.originalUrl === '/' ? '' : req.originalUrl}`;
    res.redirect(target);
  });
}

app.listen(port, host, () => {
  console.log(`PackFlow server listening on http://${host}:${port}`);
});
