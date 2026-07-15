import type { ArtifactCapabilities, ArtifactKind } from '@sillpak/contracts';

/**
 * The capability declaration is product truth, not a wish list. Add a capability
 * only after the corresponding surface and round-trip behavior ship.
 */
export function capabilitiesFor(kind: ArtifactKind, extension: string): ArtifactCapabilities {
  const edit = kind === 'markdown'
    ? 'markdown'
    : kind === 'code' || kind === 'text' || kind === 'json'
      ? 'text'
      : 'none';
  return {
    preview: true,
    edit,
    search: ['markdown', 'code', 'text', 'json', 'docx'].includes(kind),
    selectText: ['markdown', 'code', 'text', 'json', 'docx', 'spreadsheet'].includes(kind),
    openExternal: kind !== 'directory',
  };
}
