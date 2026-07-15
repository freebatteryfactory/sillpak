import { basename } from 'node:path';
import type { ArtifactAddress, WorkspaceLease, WorkspaceSnapshot } from '@sillpak/contracts';
import {
  canonicalWorkspaceRoot,
  resolveWorkspaceArtifact,
  resolveWorkspaceDirectory,
} from './workspace-path.js';

export interface PreparedWorkspace {
  readonly workspaceId: 'local';
  readonly generation: number;
  readonly rootRealPath: string;
  readonly displayName: string;
  readonly route: '/w/local';
}

export class WorkspaceRegistry {
  private active?: PreparedWorkspace;

  async initialize(path: string): Promise<PreparedWorkspace> {
    if (this.active) return this.active;
    const generation = Math.max(1, Number(process.env.SILLPAK_WORKSPACE_GENERATION ?? '1') || 1);
    const prepared = await this.prepare(path, generation);
    this.commit(prepared);
    return prepared;
  }

  async prepare(path: string, generation = (this.active?.generation ?? 0) + 1): Promise<PreparedWorkspace> {
    const rootRealPath = await canonicalWorkspaceRoot(path);
    return {
      workspaceId: 'local',
      generation,
      rootRealPath,
      displayName: basename(rootRealPath) || rootRealPath,
      route: '/w/local',
    };
  }

  commit(workspace: PreparedWorkspace): void {
    this.active = workspace;
    process.env.SILLPAK_WORKSPACE_ROOT = workspace.rootRealPath;
    process.env.SILLPAK_WORKSPACE_GENERATION = String(workspace.generation);
  }

  current(): PreparedWorkspace {
    if (!this.active) throw new Error('workspace registry is not initialized');
    return this.active;
  }

  snapshot(): WorkspaceSnapshot {
    const workspace = this.current();
    return {
      workspaceId: workspace.workspaceId,
      generation: workspace.generation,
      displayName: workspace.displayName,
      route: workspace.route,
    };
  }

  lease(): WorkspaceLease {
    const workspace = this.current();
    return {
      workspaceId: workspace.workspaceId,
      generation: workspace.generation,
      issuedAt: new Date().toISOString(),
    };
  }

  assertCurrent(workspaceId: string, generation: number): PreparedWorkspace {
    const workspace = this.current();
    if (workspaceId !== workspace.workspaceId || generation !== workspace.generation) {
      throw new Error(`workspace lease is stale; active generation is ${workspace.generation}`);
    }
    return workspace;
  }

  async resolveArtifact(address: ArtifactAddress, generation: number): Promise<string> {
    const workspace = this.assertCurrent(address.workspace, generation);
    return resolveWorkspaceArtifact(workspace.rootRealPath, address);
  }

  async resolveDirectory(address: ArtifactAddress, generation: number): Promise<string> {
    const workspace = this.assertCurrent(address.workspace, generation);
    return resolveWorkspaceDirectory(workspace.rootRealPath, address);
  }
}
