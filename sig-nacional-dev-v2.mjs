import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';

const root = process.cwd();
const viteFile = resolve(root, 'node_modules/vite/bin/vite.js');
const apiFile = resolve(root, 'server/index.js');
const envFile = resolve(root, '.env');

for (const file of [viteFile, apiFile, envFile]) {
  if (!existsSync(file)) {
    console.error('Falta archivo:', file);
    process.exit(1);
  }
}

const services = [
  {
    name: 'Express',
    port: 8001,
    url: 'http://127.0.0.1:8001/api/health',
    args: ['--env-file=.env', apiFile],
    child: null,
    starting: false,
    lastStart: 0,
    announced: ''
  },
  {
    name: 'Vite',
    port: 5173,
    url: 'http://127.0.0.1:5173/',
    args: [viteFile, '--host', '127.0.0.1',
           '--port', '5173', '--strictPort'],
    child: null,
    starting: false,
    lastStart: 0,
    announced: ''
  }
];

let stopping = false;
let checking = false;

async function probe(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500)
    });
    return response.ok;
  } catch {
    return false;
  }
}

function portBusy(port) {
  return new Promise(resolveResult => {
    const socket = net.connect({
      host: '127.0.0.1',
      port
    });

    socket.setTimeout(1500);

    socket.once('connect', () => {
      socket.destroy();
      resolveResult(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolveResult(false);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolveResult(false);
    });
  });
}

function launch(service) {
  if (stopping || service.child) return;

  service.starting = true;
  service.lastStart = Date.now();

  console.log(`[${service.name}] iniciando...`);

  const child = spawn(process.execPath, service.args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false
  });

  service.child = child;

  child.on('error', error => {
    console.error(`[${service.name}] ${error.message}`);
  });

  child.on('exit', (code, signal) => {
    if (service.child === child) {
      service.child = null;
      service.starting = false;
    }

    if (!stopping) {
      console.error(
        `[${service.name}] termino: ${code ?? signal}`
      );
    }
  });
}

async function checkServices() {
  if (checking || stopping) return;
  checking = true;

  try {
    for (const service of services) {
      if (stopping) break;

      const healthy = await probe(service.url);

      if (healthy) {
        service.starting = false;

        if (service.announced !== 'ready') {
          console.log(`[${service.name}] disponible`);
          service.announced = 'ready';
        }
        continue;
      }

      if (service.announced !== 'unavailable') {
        console.warn(`[${service.name}] no responde`);
        service.announced = 'unavailable';
      }

      // No duplicar un proceso propio que sigue arrancando.
      if (service.child) continue;

      // No reiniciar en bucle ante errores persistentes.
      if (Date.now() - service.lastStart < 10000) continue;

      // Un puerto ocupado puede pertenecer a otro proceso.
      if (await portBusy(service.port)) {
        console.warn(
          `[${service.name}] puerto ${service.port} ocupado; ` +
          'no se iniciara otra instancia'
        );
        continue;
      }

      launch(service);
    }
  } finally {
    checking = false;
  }
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(interval);

  console.log('Deteniendo procesos propios...');

  for (const service of services) {
    if (service.child) {
      try {
        service.child.kill();
      } catch {}
    }
  }

  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('SIG Nacional - Supervisor v2');
console.log('Express: 8001 | Vite: 5173');

const interval = setInterval(checkServices, 5000);
await checkServices();
