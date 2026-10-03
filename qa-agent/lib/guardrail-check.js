'use strict';

const path = require('path');

/**
 * Minimal glob-to-regex for the limited pattern vocabulary used in
 * guardrails.json: '**' (any depth), '*' (one segment, no slash),
 * literal path segments. No external dependency on purpose - this is
 * security-relevant code, keep it small enough to read in one sitting.
 */
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1; // consume the following slash too
      } else {
        re += '[^/]*';
      }
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

function normalize(p) {
  return p.split(path.sep).join('/').replace(/^\.\//, '');
}

/**
 * @param {string[]} changedFiles - repo-relative paths, forward-slash normalized
 * @param {{allowedRoots: string[], deniedPatterns: string[]}} guardrails
 * @returns {{ok: boolean, violations: string[]}}
 */
function checkGuardrails(changedFiles, guardrails) {
  const deniedRegexes = guardrails.deniedPatterns.map(globToRegex);
  const violations = [];

  for (const rawFile of changedFiles) {
    const file = normalize(rawFile);

    const deniedMatch = deniedRegexes.some((re) => re.test(file));
    if (deniedMatch) {
      violations.push(`${file} (matches a denied pattern)`);
      continue;
    }

    const underAllowedRoot = guardrails.allowedRoots.some(
      (root) => file === root || file.startsWith(`${root}/`),
    );
    if (!underAllowedRoot) {
      violations.push(`${file} (not under any allowed root)`);
    }
  }

  return { ok: violations.length === 0, violations };
}

module.exports = { checkGuardrails, globToRegex, normalize };
