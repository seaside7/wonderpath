/** ts-node bootstrap for Prisma's generated ESM-style relative imports. */
const moduleLoader = require('module') as {
  _resolveFilename: (request: string, parent: unknown, isMain: boolean, options?: unknown) => string;
};
const fs = require('fs') as { existsSync(path: string): boolean };
const originalResolve = moduleLoader._resolveFilename;

moduleLoader._resolveFilename = function resolveGeneratedImport(request, parent, isMain, options) {
  if (request.endsWith('.js')) {
    const tsRequest = request.slice(0, -3) + '.ts';
    try {
      const resolved = originalResolve.call(this, tsRequest, parent, isMain, options);
      if (fs.existsSync(resolved)) return resolved;
    } catch {
      // Let Node produce the normal resolution error below.
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
