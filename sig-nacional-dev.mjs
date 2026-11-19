import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const vite = resolve(root, 'node_modules/vite/bin/vite.js');
const server = resolve(root, 'server/index.js');
const envFile = resolve(root, '.env');

for (const file of [vite, server, envFile]) {
  if (!existsSync(file)) {
    console.error(`Falta archivo necesario: ${file}`);
    process.exit(1);
  }
}

let stopping = false;
const children = new Map();
const timers = new Set();

function launch(name, args, restart = false) {
  if (stopping) return;

  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false
  });

  children.set(name, child);
  console.log(`[${name}] iniciado (PID ${child.pid ?? 'desconocido'})`);

  child.on('error', error => {
    console.error(`[${name}] error: ${error.message}`);
  });

  child.on('exit', (code, signal) => {
    if (children.get(name) === child) children.delete(name);
    if (stopping) return;

    console.error(`[${name}] finalizo (codigo ${code}, senal ${signal ?? 'ninguna'})`);

    if (restart) {
      console.log(`[${name}] reinicio en 3 segundos...`);
      const timer = setTimeout(() => {
        timers.delete(timer);
        launch(name, args, true);
      }, 3000);
      timers.add(timer);
    } else {
      console.error(`[${name}] revisa el error anterior.`);
      shutdown();
    }
  });
}

function shutdown() {
  if (stopping) return;
  stopping = true;

  for (const timer of timers) clearTimeout(timer);
  timers.clear();

  for (const child of children.values()) {
    try { child.kill(); } catch {}
  }

  children.clear();
  setTimeout(() => process.exit(0), 300).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('SIG Nacional - Express 8001 + Vite 5173');

launch('Express', ['--env-file=.env', server], true);
launch('Vite', [vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
