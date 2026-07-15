import { nodeContext, runGates } from '@czap/gauntlet';
import { resolve } from 'node:path';
import { sillpakGates } from './gates.js';

const repoRoot = resolve(process.cwd());
const context = nodeContext(repoRoot, [
  'package.json',
  'apps/**/*.{ts,astro,json,css,mjs}',
  'packages/**/*.{ts,json}',
]);
const result = runGates(sillpakGates, context);
for (const item of result.findings) {
  process.stderr.write(`${item.severity.toUpperCase()} ${item.ruleId}: ${item.detail}\n`);
}
process.exitCode = result.blocked ? 1 : 0;
