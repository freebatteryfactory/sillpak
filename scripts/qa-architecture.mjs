import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const failures = [];
const required = [
  'README.md',
  'AGENTS.md',
  'CANON.md',
  'docs/ARCHITECTURE.md',
  'docs/PLAN.md',
  'docs/SECURITY.md',
  'docs/SESSION-LIFECYCLE.md',
  'docs/BROWSER-SESSIONS.md',
  'docs/MECHANICAL-CORE.md',
  'docs/EXTERNAL-INTEGRATION.md',
  'docs/LITESHIP-25-PACKAGE-MATRIX.md',
  'docs/TANSTACK-EVALUATION.md',
  'docs/checkpoint/CURRENT.md',
  'docs/upstream/liteship-effect-migration-boundary.issue.md',
  'apps/shell/src/middleware.ts',
  'apps/shell/src/lib/server/request-auth.ts',
  'apps/shell/src/pages/w/[workspace]/[...path].astro',
  'apps/shell/src/layouts/ShellLayout.astro',
  'apps/desktop/src/local-origin.ts',
  'apps/desktop/src/workspace-registry.ts',
  'apps/desktop/src/terminal-broker.ts',
  'apps/desktop/src/pty-host.ts',
  'packages/quality/src/gates.ts',
];

for (const path of required) {
  try { statSync(join(root, path)); }
  catch { failures.push(`missing required file: ${path}`); }
}

function walk(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    if (['node_modules', 'dist', '.git', 'artifacts'].includes(name)) continue;
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) result.push(...walk(absolute));
    else result.push(absolute);
  }
  return result;
}

const files = walk(root);
const textFiles = files.filter((path) => /\.(?:ts|astro|mjs|css|md|json|yml|yaml)$/.test(path));
const bannedDependencies = [
  'react',
  'react-dom',
  '@lexical/react',
  '@tiptap/core',
  'lucide',
  'lucide-react',
  'tailwindcss',
  '@mui/material',
  '@chakra-ui/react',
  'antd',
];

for (const packageFile of files.filter((path) => path.endsWith('package.json'))) {
  const relativePath = relative(root, packageFile).replaceAll('\\', '/');
  const manifest = JSON.parse(readFileSync(packageFile, 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (bannedDependencies.includes(name)) failures.push(`${relativePath}: banned dependency ${name}`);
      if (typeof version === 'string' && !version.startsWith('workspace:') && /^[~^*]|latest$/.test(version)) {
        failures.push(`${relativePath}: dependency ${name} is not exactly pinned (${version})`);
      }
    }
  }
}

const effectBoundary = 'apps/shell/src/lib/liteship/effect-boundary.ts';
const rawHtmlAllow = new Set([
  'apps/shell/src/components/TrustedProjection.astro',
  'apps/shell/src/lib/client/docx-controller.ts',
]);
const configuredPrivateTerms = (process.env.SILLPAK_PRIVATE_VOCABULARY ?? '')
  .split(',')
  .map((term) => term.trim())
  .filter(Boolean);

for (const file of textFiles) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  const isProductSource = rel.startsWith('apps/shell/src/')
    || rel.startsWith('apps/desktop/src/')
    || rel.startsWith('packages/contracts/src/');

  if (rel.startsWith('apps/shell/src/') && rel !== effectBoundary && /^\s*import[\s\S]*?from\s+['"]effect(?:\/[^'"]+)?['"]/m.test(source)) {
    failures.push(`${rel}: direct Effect import`);
  }
  if (rel.startsWith('apps/shell/src/lib/client/') && /^\s*import[\s\S]*?from\s+['"](?:electron|node:)/m.test(source)) {
    failures.push(`${rel}: native import in client code`);
  }
  if (isProductSource && rel !== 'apps/desktop/src/pty-host.ts' && /^\s*import[\s\S]*?from\s+['"]node-pty['"]/m.test(source)) {
    failures.push(`${rel}: node-pty outside utility process`);
  }
  if (isProductSource && !rawHtmlAllow.has(rel) && (/\binnerHTML\b/.test(source) || /set:html=/.test(source))) {
    failures.push(`${rel}: unreviewed HTML sink`);
  }
  if (rel.endsWith('.css') && /(?:linear-gradient|radial-gradient|backdrop-filter)/.test(source)) {
    failures.push(`${rel}: banned visual effect`);
  }
  if (isProductSource && /\b(?:TODO|FIXME)\b/.test(source)) failures.push(`${rel}: placeholder marker in source`);
  for (const term of configuredPrivateTerms) {
    if (source.toLowerCase().includes(term.toLowerCase())) failures.push(`${rel}: configured private vocabulary leak`);
  }
}

const standaloneSentence = 'SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.';
for (const file of ['README.md', 'AGENTS.md', 'CANON.md']) {
  if (!readFileSync(join(root, file), 'utf8').includes(standaloneSentence)) failures.push(`${file}: standalone boundary sentence missing`);
}

const layout = readFileSync(join(root, 'apps/shell/src/layouts/ShellLayout.astro'), 'utf8');
if (!layout.includes('ClientRouter')) failures.push('ShellLayout lacks ClientRouter');
if (!layout.includes('satelliteAttrs')) failures.push('ShellLayout lacks LiteShip satelliteAttrs');
const terminal = readFileSync(join(root, 'apps/shell/src/components/TerminalDock.astro'), 'utf8');
if (!terminal.includes('transition:persist')) failures.push('terminal is not Astro-persisted');
if (!terminal.includes('data-czap-morph-opaque')) failures.push('terminal is not LiteShip opaque');
const terminalController = readFileSync(join(root, 'apps/shell/src/lib/client/terminal-controller.ts'), 'utf8');
if (!terminalController.includes('bridge?.detach(sessionId)')) failures.push('terminal cleanup does not detach');
if (/return \(\) =>[\s\S]*bridge\?\.kill\(sessionId\)/.test(terminalController)) failures.push('terminal cleanup kills the session');

const middleware = readFileSync(join(root, 'apps/shell/src/middleware.ts'), 'utf8');
if (!middleware.includes('authorizeLocalRequest')) failures.push('Astro middleware does not authorize local requests');
const runtime = readFileSync(join(root, 'apps/desktop/src/astro-runtime.ts'), 'utf8');
if (!runtime.includes('request.headers.host !== expectedHost')) failures.push('production host does not reject Host mismatch before Astro');
const main = readFileSync(join(root, 'apps/desktop/src/main.ts'), 'utf8');
if (!main.includes("httpOnly: true") || !main.includes("sameSite: 'strict'")) failures.push('local session cookie is not hardened');
if (!main.includes('assertTrustedSender')) failures.push('desktop IPC lacks centralized sender validation');
if (!main.includes('parseLocalOrigin(devUrl)')) failures.push('development shell URL is not restricted to a bound loopback origin');

const projections = readFileSync(join(root, 'apps/shell/src/lib/server/projections.ts'), 'utf8');
if (/^import .* from ['"](?:mammoth|exceljs)['"]/m.test(projections)) failures.push('document projection engines are statically imported');
const markdownController = readFileSync(join(root, 'apps/shell/src/lib/client/markdown-editor-controller.ts'), 'utf8');
if (/^import .* from ['"](?:lexical|@lexical\/|codemirror|@codemirror\/)/m.test(markdownController.replace(/^import type .*$/gm, ''))) {
  failures.push('Markdown specialist editors are statically imported');
}
const voiceController = readFileSync(join(root, 'apps/shell/src/lib/client/voice/voice-controller.ts'), 'utf8');
if (/^import .*TransformersWhisperPort/m.test(voiceController)) failures.push('Whisper controller is statically imported');

const matrix = readFileSync(join(root, 'docs/LITESHIP-25-PACKAGE-MATRIX.md'), 'utf8');
const packages = [
  '@czap/_spine','@czap/error','@czap/gauntlet','@czap/canonical','@czap/genui','@czap/core',
  '@czap/quantizer','@czap/compiler','@czap/web','@czap/detect','@czap/edge','@czap/cloudflare',
  '@czap/worker','@czap/vite','@czap/astro','@czap/remotion','@czap/scene','@czap/stage',
  '@czap/assets','@czap/audit','@czap/command','@czap/cli','@czap/mcp-server','create-liteship','liteship',
];
for (const name of packages) if (!matrix.includes(`\`${name}\``)) failures.push(`LiteShip matrix missing ${name}`);

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`architecture QA passed: ${files.length} files inspected\n`);
}
