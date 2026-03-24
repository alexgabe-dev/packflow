import { spawn } from 'node:child_process';

const server = spawn('node', ['server/index.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', PORT: '3001' },
});

const client = spawn('npm', ['run', 'dev:client'], {
  stdio: 'inherit',
  env: process.env,
});

const shutdown = (code = 0) => {
  server.kill('SIGTERM');
  client.kill('SIGTERM');
  process.exit(code);
};

server.on('exit', (code) => {
  if (code && code !== 0) {
    shutdown(code);
  }
});

client.on('exit', (code) => {
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
