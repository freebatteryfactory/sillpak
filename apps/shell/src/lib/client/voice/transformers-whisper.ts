import type { TranscriptionPort, TranscriptionRequest, TranscriptionResult } from '@sillpak/contracts';

interface PendingRequest {
  readonly startedAt: number;
  readonly resolve: (result: TranscriptionResult) => void;
  readonly reject: (error: Error) => void;
}

type WorkerResponse =
  | { readonly type: 'result'; readonly id: number; readonly text: string; readonly model: string }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

export class TransformersWhisperPort implements TranscriptionPort {
  private readonly worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module', name: 'sillpak-whisper' });
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private disposed = false;

  constructor() {
    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.type === 'error') request.reject(new Error(event.data.message));
      else request.resolve({ text: event.data.text, model: event.data.model, elapsedMs: performance.now() - request.startedAt });
    });
    this.worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Whisper worker failed');
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    });
  }

  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (this.disposed) return Promise.reject(new Error('Transcription port is disposed'));
    const id = this.nextId++;
    return new Promise<TranscriptionResult>((resolve, reject) => {
      this.pending.set(id, { startedAt: performance.now(), resolve, reject });
      this.worker.postMessage({
        type: 'transcribe',
        id,
        samples: request.samples,
        sampleRate: request.sampleRate,
        language: request.language,
      }, [request.samples.buffer as ArrayBuffer]);
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    const error = new Error('Transcription port disposed');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
