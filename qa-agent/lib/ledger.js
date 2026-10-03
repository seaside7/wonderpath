'use strict';

const fs = require('fs');
const path = require('path');
const { STATE_DIR } = require('./lock');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ledgerPath(date = todayStr()) {
  return path.join(STATE_DIR, 'runs', `${date}.json`);
}

function readLedger(date = todayStr()) {
  try {
    return JSON.parse(fs.readFileSync(ledgerPath(date), 'utf8'));
  } catch {
    return { date, entries: [] };
  }
}

function writeLedger(ledger) {
  fs.mkdirSync(path.dirname(ledgerPath(ledger.date)), { recursive: true });
  fs.writeFileSync(ledgerPath(ledger.date), JSON.stringify(ledger, null, 2));
}

function appendEntry(ledger, entry) {
  ledger.entries.push(entry);
  writeLedger(ledger);
  return ledger;
}

function updateEntryStatus(ledger, findingId, status, extra = {}) {
  const entry = ledger.entries.find((e) => e.findingId === findingId);
  if (entry) {
    entry.status = status;
    Object.assign(entry, extra);
    writeLedger(ledger);
  }
  return ledger;
}

function keptCount(ledger) {
  return ledger.entries.filter((e) => e.status === 'kept').length;
}

function inProgressEntries(ledger) {
  return ledger.entries.filter((e) => e.status === 'in-progress');
}

module.exports = {
  todayStr,
  ledgerPath,
  readLedger,
  writeLedger,
  appendEntry,
  updateEntryStatus,
  keptCount,
  inProgressEntries,
};
