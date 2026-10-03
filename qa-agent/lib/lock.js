'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'qa-agent');
const LOCK_PATH = path.join(STATE_DIR, 'qa-agent.lock');
const STALE_MS = 3 * 60 * 60 * 1000; // 3 hours - a fix cycle with LLM calls + full e2e can genuinely take a while

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Acquires the exclusive run lock. Returns true if acquired, false if
 * another live run holds it. Reclaims a stale lock (dead PID or too old)
 * automatically.
 */
function acquireLock() {
  ensureStateDir();

  const existing = readLock();
  if (existing) {
    const age = Date.now() - existing.startedAt;
    if (isPidAlive(existing.pid) && age < STALE_MS) {
      return false;
    }
    // stale (crashed) or dead PID - reclaim
  }

  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify({ pid: process.pid, startedAt: Date.now() }, null, 2),
  );
  return true;
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // already gone, fine
  }
}

module.exports = { STATE_DIR, acquireLock, releaseLock, LOCK_PATH };
