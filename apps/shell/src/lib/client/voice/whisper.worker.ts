import { pipeline } from '@huggingface/transformers';

const model = 'onnx-community/whisper-tiny.en';
let pipelinePromise: Promise<any> | undefined;

function loadPipeline(): Promise<any> {
  return pipelinePromise ??= pipeline('automatic-speech-recognition', model, {
    device: 'gpu' in navigator ? 'webgpu' : 'wasm',
    dtype: 'q4',
  });
}

self.addEventListener('message', async (event: MessageEvent<{
  readonly type: 'transcribe';
  readonly id: number;
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly language?: string;
}>) => {
  const message = event.data;
  try {
    const transcriber = await loadPipeline();
    const output = await transcriber(message.samples, {
      sampling_rate: message.sampleRate,
      language: message.language,
      task: 'transcribe',
    }) as { readonly text: string };
    self.postMessage({ type: 'result', id: message.id, text: output.text.trim(), model });
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : 'transcription failed' });
  }
});
