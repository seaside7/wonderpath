/**
 * Copy Prisma query engine binaries from generated/prisma/ to dist/generated/prisma/
 * on every build.  This is necessary because:
 *   1. The Nest CLI's assets-manager cannot handle files that live outside the
 *      sourceRoot directory (the .node files are at generated/prisma/, but
 *      sourceRoot = "src", so copyPathResolve strips too many path segments
 *      and puts them in dist/prisma/ instead of dist/generated/prisma/).
 *   2. PrismaClient resolves engines via path.join(__dirname, ...) from the
 *      compiled client.js location, so the engine binaries must sit next to it.
 *
 * This script is cwd-independent: it always resolves paths relative to the
 * project root (the directory containing package.json).
 */

const { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } = require('fs');
const { join, resolve } = require('path');

const rootDir = resolve(__dirname, '..');
const srcEngineDir = join(rootDir, 'generated', 'prisma');
const destEngineDir = join(rootDir, 'dist', 'generated', 'prisma');

if (!existsSync(srcEngineDir)) {
  console.error('[copy-engines] Source engine directory not found:', srcEngineDir);
  process.exit(0); // Don't fail the build if, e.g., Prisma hasn't generated yet
}

if (!existsSync(destEngineDir)) {
  mkdirSync(destEngineDir, { recursive: true });
}

const files = readdirSync(srcEngineDir).filter((f) => f.endsWith('.node'));

if (files.length === 0) {
  console.error('[copy-engines] No .node engine files found in', srcEngineDir);
  process.exit(0);
}

for (const file of files) {
  const src = join(srcEngineDir, file);
  const dest = join(destEngineDir, file);
  copyFileSync(src, dest);
  console.log('[copy-engines] Copied', file, '-> dist/generated/prisma/');
}
