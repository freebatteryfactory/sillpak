import type { TranscriptionPort } from '@sillpak/contracts';
import { AudioCapture } from './audio-capture.js';

let controller: { dispose(): Promise<void> } | undefined;

export function bootVoiceControl(): void {
  const host = document.querySelector<HTMLElement>('[data-voice-control]');
  const button = host?.querySelector<HTMLButtonElement>('[data-voice-toggle]');
  const status = host?.querySelector<HTMLElement>('[data-voice-status]');
  const target = host?.querySelector<HTMLSelectElement>('[data-voice-target]');
  if (!host || !button || !status || !target || host.dataset.bound === 'true') return;
  host.dataset.bound = 'true';

  const capture = new AudioCapture();
  let transcriber: TranscriptionPort | undefined;
  let recording = false;

  const getTranscriber = async (): Promise<TranscriptionPort> => {
    if (transcriber) return transcriber;
    const { TransformersWhisperPort } = await import('./transformers-whisper.js');
    transcriber = new TransformersWhisperPort();
    return transcriber;
  };

  const toggle = async () => {
    try {
      if (!recording) {
        await capture.start();
        recording = true;
        button.textContent = 'Stop dictation';
        status.textContent = 'recording';
        return;
      }
      recording = false;
      button.disabled = true;
      button.textContent = 'Dictate';
      status.textContent = 'loading local transcription';
      const audio = await capture.stop();
      const port = await getTranscriber();
      status.textContent = 'transcribing locally';
      const result = await port.transcribe(audio);
      window.dispatchEvent(new CustomEvent('sillpak:transcript', {
        detail: { text: result.text, target: target.value },
      }));
      status.textContent = `${Math.round(result.elapsedMs)} ms`;
    } catch (error) {
      recording = false;
      status.textContent = error instanceof Error ? error.message : 'dictation failed';
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener('click', toggle);
  controller = {
    async dispose() {
      button.removeEventListener('click', toggle);
      await transcriber?.dispose();
    },
  };
}

export async function disposeVoiceControl(): Promise<void> {
  await controller?.dispose();
  controller = undefined;
}
