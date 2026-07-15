import * as watcher from '@parcel/watcher';
import { relative, resolve } from 'node:path';
import type { WorkspacePathChange, WorkspaceWatcherEvent } from '@sillpak/contracts';

export class WorkspaceWatcher {
  private subscription: watcher.AsyncSubscription | undefined;
  private root = '';
  private generation = 0;
  private sequence = 0;
  private timer: NodeJS.Timeout | undefined;
  private readonly pending = new Map<string, WorkspacePathChange['type']>();
  private notify: ((event: WorkspaceWatcherEvent) => void) | undefined;

  async watch(root: string, generation: number, notify: (event: WorkspaceWatcherEvent) => void): Promise<void> {
    await this.stop();
    this.root = resolve(root);
    this.generation = generation;
    this.sequence = 0;
    this.notify = notify;
    try {
      this.subscription = await watcher.subscribe(this.root, (error, events) => {
        if (error) {
          this.reportFault(error.message);
          return;
        }
        for (const event of events) {
          const relativePath = relative(this.root, event.path).replaceAll('\\', '/');
          if (!relativePath || relativePath.startsWith('../')) continue;
          this.pending.set(relativePath, event.type);
        }
        this.scheduleFlush();
      }, {
        ignore: ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/.astro/**'],
      });
    } catch (error) {
      this.reportFault(error instanceof Error ? error.message : 'workspace watcher failed to start');
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.flush();
    await this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.pending.clear();
    this.notify = undefined;
  }

  private reportFault(message: string): void {
    if (!this.notify) return;
    this.sequence += 1;
    this.notify({
      type: 'watcher-error',
      workspaceId: 'local',
      generation: this.generation,
      sequence: this.sequence,
      observedAt: new Date().toISOString(),
      message,
    });
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.flush();
    }, 75);
  }

  private flush(): void {
    if (!this.notify || this.pending.size === 0) return;
    const changes = [...this.pending.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([relativePath, type]) => ({ type, relativePath }));
    this.pending.clear();
    this.sequence += 1;
    this.notify({
      type: 'changes',
      workspaceId: 'local',
      generation: this.generation,
      sequence: this.sequence,
      observedAt: new Date().toISOString(),
      changes,
    });
  }
}
