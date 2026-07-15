import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadTypeScript() {
  try {
    return await import('typescript');
  } catch {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return import(pathToFileURL(join(globalRoot, 'typescript/lib/typescript.js')).href);
  }
}

const ts = await loadTypeScript();
const root = resolve(process.cwd());
const failures = [];

function walk(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    if (['node_modules', 'dist', '.git', 'artifacts'].includes(name)) continue;
    const absolute = join(directory, name);
    if (statSync(absolute).isDirectory()) result.push(...walk(absolute));
    else result.push(absolute);
  }
  return result;
}

for (const file of walk(root).filter((path) => path.endsWith('.ts') && !path.endsWith('.d.ts'))) {
  const source = readFileSync(file, 'utf8');
  try {
    const output = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ESNext,
        isolatedModules: true,
      },
    });
    for (const diagnostic of output.diagnostics ?? []) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      failures.push(`${relative(root, file)}: TypeScript syntax diagnostic ${message}`);
    }
  } catch (error) {
    failures.push(`${relative(root, file)}: TypeScript parser crashed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const file of walk(join(root, 'docs')).filter((path) => path.endsWith('.md'))) {
  const source = readFileSync(file, 'utf8');
  const linkPattern = /\[[^\]]+\]\((?!https?:|#|mailto:)([^)]+)\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].split('#')[0];
    if (!target) continue;
    const absolute = resolve(dirname(file), target);
    if (!existsSync(absolute)) failures.push(`${relative(root, file)}: broken link ${match[1]}`);
  }
}

const handoff = readFileSync(join(root, 'docs/HANDOFF.md'), 'utf8');
for (const phrase of ['What exists', 'What has not been claimed', 'First implementation agent task', 'Important code entrypoints']) {
  if (!handoff.includes(phrase)) failures.push(`HANDOFF.md missing ${phrase}`);
}
const checkpoint = readFileSync(join(root, 'docs/checkpoint/CURRENT.md'), 'utf8');
if (!checkpoint.includes('One next action')) failures.push('CURRENT.md lacks one next action');
const issue = readFileSync(join(root, 'docs/upstream/liteship-effect-migration-boundary.issue.md'), 'utf8');
if (!/\*\*Status:\*\* (?:filed|not filed)/.test(issue)) failures.push('upstream issue packet does not disclose filing status');

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('handoff QA passed: syntax and documentation checks clean\n');
}
