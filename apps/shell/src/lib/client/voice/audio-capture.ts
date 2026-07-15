export interface AudioCaptureResult {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

export class AudioCapture {
  private stream: MediaStream | undefined;
  private recorder: MediaRecorder | undefined;
  private chunks: Blob[] = [];

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.addEventListener('dataavailable', (event) => { if (event.data.size) this.chunks.push(event.data); });
    this.recorder.start(250);
  }

  async stop(): Promise<AudioCaptureResult> {
    const recorder = this.recorder;
    if (!recorder) throw new Error('Audio capture is not running');
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
    this.stream?.getTracks().forEach((track) => track.stop());
    const buffer = await new Blob(this.chunks).arrayBuffer();
    const context = new AudioContext();
    try {
      const decoded = await context.decodeAudioData(buffer);
      return { samples: decoded.getChannelData(0).slice(), sampleRate: decoded.sampleRate };
    } finally {
      await context.close();
      this.recorder = undefined;
      this.stream = undefined;
    }
  }
}
