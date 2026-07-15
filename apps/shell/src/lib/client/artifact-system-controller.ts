import type { ArtifactAddress } from '@sillpak/contracts';

function parseAddress(raw: string | undefined): ArtifactAddress | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<ArtifactAddress>;
    if (value.workspace !== 'local' || !Array.isArray(value.segments)) return undefined;
    if (!value.segments.every((segment) =>
      typeof segment === 'string'
      && segment.length > 0
      && segment !== '.'
      && segment !== '..'
      && !segment.includes('/')
      && !segment.includes('\\')
      && !segment.includes('\0'))) return undefined;
    return { workspace: 'local', segments: value.segments };
  } catch {
    return undefined;
  }
}

export function bootArtifactSystemActions(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-artifact-system-actions]')) {
    if (host.dataset.bound === 'true') continue;
    const bridge = window.sillpak;
    const address = parseAddress(host.dataset.artifactAddress);
    if (!bridge || !address) {
      host.hidden = true;
      continue;
    }
    host.dataset.bound = 'true';
    host.querySelector<HTMLButtonElement>('[data-reveal-artifact]')?.addEventListener('click', () => {
      void bridge.revealArtifact(address).catch((error: unknown) => {
        host.dataset.error = error instanceof Error ? error.message : 'Reveal failed';
      });
    });
    host.querySelector<HTMLButtonElement>('[data-open-artifact]')?.addEventListener('click', () => {
      void bridge.openArtifact(address).catch((error: unknown) => {
        host.dataset.error = error instanceof Error ? error.message : 'Open failed';
      });
    });
  }
}
