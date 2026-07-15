import {
  defineGate,
  finding,
  memoryContext,
  type Finding,
  type Gate,
  type GateContext,
} from '@czap/gauntlet';

const bannedDependencyNames = [
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

function scanDependencyPolicy(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('package.json')) continue;
    const source = context.readFile(file);
    if (!source) continue;
    for (const dependency of bannedDependencyNames) {
      if (source.includes(`"${dependency}"`)) {
        findings.push(
          finding({
            ruleId: 'sillpak/no-vibe-stack',
            severity: 'error',
            level: 'L2',
            title: 'Banned presentation dependency',
            detail: `${file} declares ${dependency}. The shell is Astro + LiteShip + framework-neutral instruments.`,
            location: { file },
          }),
        );
      }
    }
  }
  return findings;
}

export const noVibeStackGate: Gate = defineGate({
  id: 'sillpak/no-vibe-stack',
  level: 'L2',
  describe: 'Reject React, TipTap, Lucide, Tailwind, and generic component-kit drift.',
  run: scanDependencyPolicy,
  fixtures: {
    red: {
      name: 'React dependency is present',
      context: memoryContext({ 'package.json': '{"dependencies":{"react":"19"}}' }),
    },
    green: {
      name: 'LiteShip-only shell package',
      context: memoryContext({ 'package.json': '{"dependencies":{"@czap/astro":"0.10.0"}}' }),
    },
    mutation: {
      describe: 'A mutant that scans for a missing token must fail the red fixture.',
      mutate: (gate) => ({ ...gate, run: () => [] }),
    },
  },
});

function scanEffectBoundary(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  const sanctioned = 'apps/shell/src/lib/liteship/effect-boundary.ts';
  for (const file of context.files()) {
    if (!file.endsWith('.ts') || file === sanctioned || file.startsWith('packages/quality/')) continue;
    const source = context.readFile(file) ?? '';
    if (/from\s+['"]effect(?:\/[^'"]+)?['"]/.test(source)) {
      findings.push(
        finding({
          ruleId: 'sillpak/effect-boundary',
          severity: 'error',
          level: 'L2',
          title: 'Direct Effect import outside migration seam',
          detail: `${file} imports Effect directly. Route temporary Effect coupling through ${sanctioned}.`,
          location: { file },
        }),
      );
    }
  }
  return findings;
}

export const effectBoundaryGate: Gate = defineGate({
  id: 'sillpak/effect-boundary',
  level: 'L2',
  describe: 'Keep LiteShip Effect coupling inside one disposable boundary.',
  run: scanEffectBoundary,
  fixtures: {
    red: {
      name: 'Direct effect import',
      context: memoryContext({ 'apps/shell/src/lib/state.ts': "import { Effect } from 'effect';" }),
    },
    green: {
      name: 'Boundary owns the import',
      context: memoryContext({ 'apps/shell/src/lib/liteship/effect-boundary.ts': "import { Effect } from 'effect';" }),
    },
    mutation: { describe: 'A silent scanner must fail self-proof.', mutate: (gate) => ({ ...gate, run: () => [] }) },
  },
});

function scanUnsafeDom(context: GateContext): readonly Finding[] {
  const allow = new Set([
    'apps/shell/src/components/TrustedProjection.astro',
    'apps/shell/src/lib/client/docx-controller.ts',
  ]);
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (allow.has(file) || file.startsWith('packages/quality/')) continue;
    const source = context.readFile(file) ?? '';
    if (/\binnerHTML\b|set:html=/.test(source)) {
      findings.push(
        finding({
          ruleId: 'sillpak/no-raw-html',
          severity: 'error',
          level: 'L2',
          title: 'Unreviewed HTML sink',
          detail: `${file} contains an HTML sink outside the two reviewed trust seams.`,
          location: { file },
        }),
      );
    }
  }
  return findings;
}

export const noRawHtmlGate: Gate = defineGate({
  id: 'sillpak/no-raw-html',
  level: 'L2',
  describe: 'HTML enters the live DOM only through reviewed projection trust seams.',
  run: scanUnsafeDom,
  fixtures: {
    red: { name: 'Unsafe sink', context: memoryContext({ 'x.ts': 'target.innerHTML = value;' }) },
    green: { name: 'Text sink', context: memoryContext({ 'x.ts': 'target.textContent = value;' }) },
    mutation: { describe: 'A silent scanner must fail self-proof.', mutate: (gate) => ({ ...gate, run: () => [] }) },
  },
});

export const sillpakGates: readonly Gate[] = [noVibeStackGate, effectBoundaryGate, noRawHtmlGate];
