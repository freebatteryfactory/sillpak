import type { ArtifactAddress } from '@sillpak/contracts';
import { routeFor } from './path-policy.js';

export interface Breadcrumb {
  readonly label: string;
  readonly route: string;
}

export function breadcrumbs(address: ArtifactAddress): readonly Breadcrumb[] {
  const result: Breadcrumb[] = [{ label: address.workspace, route: routeFor({ ...address, segments: [] }) }];
  for (let index = 0; index < address.segments.length; index += 1) {
    const segments = address.segments.slice(0, index + 1);
    result.push({ label: segments.at(-1) ?? address.workspace, route: routeFor({ ...address, segments }) });
  }
  return result;
}
