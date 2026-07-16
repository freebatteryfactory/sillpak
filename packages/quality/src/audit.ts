import { runAuditPasses, type DevopsProfile } from '@czap/audit';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let repoRoot = resolve(process.cwd());
while (!existsSync(resolve(repoRoot, 'pnpm-workspace.yaml'))) {
  const parent = resolve(repoRoot, '..');
  if (parent === repoRoot) throw new Error('workspace root with pnpm-workspace.yaml not found');
  repoRoot = parent;
}
const profile: Partial<DevopsProfile> = {
  repoRoot,
  internalPackagePrefix: '@sillpak/',
  packageTopology: {
    '@sillpak/contracts': { allowedInternalImports: [], kind: 'core' },
    '@sillpak/quality': { allowedInternalImports: [], kind: 'standalone' },
  },
  dynamicImportExemptions: new Set(),
  surfacePolicy: {},
};

const result = runAuditPasses(profile);
for (const item of result.findings) {
  const location = item.location?.file ? ` ${item.location.file}` : '';
  process.stderr.write(`${item.severity.toUpperCase()} ${item.id}${location}: ${item.summary}\n`);
}
process.stdout.write(
  `audit complete: ${result.counts.error} errors, ${result.counts.warning} warnings, ${result.counts.info} info\n`,
);
process.exitCode = result.counts.error > 0 ? 1 : 0;
