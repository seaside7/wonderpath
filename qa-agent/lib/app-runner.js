'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { REPO_ROOT } = require('./git');

/**
 * On Windows, spawning with shell:true means proc.pid is the cmd.exe
 * wrapper's PID, not the actual node/next-server process it launches -
 * killing the wrapper does NOT free the port, and every run leaks an
 * orphaned process holding it forever. Kill by port instead, which
 * targets whatever process is actually listening, regardless of how it
 * got there. Called both before boot (clear a previous crashed run's
 * leftovers) and after (real teardown).
 */
function killPort(port) {
  spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
    ],
    { stdio: 'ignore' },
  );
}

/**
 * A stale Next.js dev cache can bake in an old NEXT_PUBLIC_API_URL from a
 * previous run on a different port, silently pointing the browser at the
 * wrong API with no error - exactly the kind of thing that produces a
 * false "0 findings" result on an unattended agent. Always start clean.
 */
function clearWebDevCache() {
  const nextDir = path.join(REPO_ROOT, 'apps', 'web', '.next');
  fs.rmSync(nextDir, { recursive: true, force: true });
}

function waitForPort(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.status < 500) {
          resolve();
          return;
        }
      } catch {
        // not ready yet
      }
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 1000);
    };
    attempt();
  });
}

/**
 * Confirms the dev server PROCESS is up (accepting TCP connections) without
 * requesting a page - fetching a Next.js App Router route (even HEAD)
 * triggers Turbopack to lazily compile that specific route as a side
 * effect, which can take well over a minute on this machine's slow disk
 * (see the "Slow filesystem detected" warning Next itself logs) and has no
 * bearing on whether the server process itself started successfully.
 */
function waitForTcpPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for TCP port ${port} to accept connections`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

/**
 * The actual slow part: Turbopack's first, on-demand compile of each route.
 * Warmed once here (generous timeout, clear logging) so it doesn't get
 * mistaken for a flaky flow failure later, when a Playwright page.goto to
 * the same route hits its own, much tighter default navigation timeout.
 */
async function warmWebRoutes(webPort, routes, timeoutMs) {
  for (const route of routes) {
    try {
      await fetch(`http://localhost:${webPort}${route}`, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      throw new Error(`Warming route "${route}" failed or timed out after ${timeoutMs}ms: ${err.message}`);
    }
  }
}

/**
 * Boots apps/api and apps/web against the QA database/ports as child
 * processes. Returns { stop() } which kills both, always call it in a
 * finally block.
 */
async function startApps({ apiPort, webPort, qaDatabaseUrl }) {
  clearWebDevCache();
  killPort(apiPort);
  killPort(webPort);

  const apiProc = spawn('npx', ['nest', 'start'], {
    cwd: path.join(REPO_ROOT, 'apps', 'api'),
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: qaDatabaseUrl,
      PORT: String(apiPort),
      ATLAS_CONTENT_PROVIDER: 'mock',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const webProc = spawn('npx', ['next', 'dev', '-p', String(webPort)], {
    cwd: path.join(REPO_ROOT, 'apps', 'web'),
    shell: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const apiLog = [];
  const webLog = [];
  apiProc.stdout.on('data', (d) => apiLog.push(d.toString()));
  apiProc.stderr.on('data', (d) => apiLog.push(d.toString()));
  webProc.stdout.on('data', (d) => webLog.push(d.toString()));
  webProc.stderr.on('data', (d) => webLog.push(d.toString()));

  /**
   * Killing by port only catches whatever is bound AT THIS INSTANT. On a
   * cold build, nest start can still be mid-compile when a timeout fires -
   * killPort finds nothing, then the build finishes seconds later and binds
   * an unkillable orphan that also keeps this whole qa-agent process alive
   * (its piped stdout/stderr listeners hold the Node event loop open).
   * Explicitly killing the spawned handles drops our own references
   * immediately; the delayed re-sweep catches a late bind.
   */
  function stop() {
    try {
      apiProc.stdout.destroy();
      apiProc.stderr.destroy();
      apiProc.kill();
    } catch {
      // best effort - process may already be gone
    }
    try {
      webProc.stdout.destroy();
      webProc.stderr.destroy();
      webProc.kill();
    } catch {
      // best effort - process may already be gone
    }
    killPort(apiPort);
    killPort(webPort);
    setTimeout(() => {
      killPort(apiPort);
      killPort(webPort);
    }, 5000).unref();
  }

  try {
    // Nest doesn't lazy-compile per route, so a real HTTP check is fine and
    // fast once the build finishes. The web dev server is checked at the
    // TCP level only here - see warmWebRoutes for why an HTTP check on a
    // Next.js route can't be used as a quick readiness probe.
    await Promise.all([
      waitForPort(`http://localhost:${apiPort}/auth/login`, 90000),
      waitForTcpPort(webPort, 30000),
    ]);
    await warmWebRoutes(webPort, ['/', '/register', '/login'], 120000);
  } catch (err) {
    stop();
    throw new Error(
      `App boot failed: ${err.message}\n--- API log tail ---\n${apiLog.join('').slice(-2000)}\n--- Web log tail ---\n${webLog.join('').slice(-2000)}`,
    );
  }

  return { stop, apiLog, webLog, apiPort, webPort };
}

module.exports = { startApps };
