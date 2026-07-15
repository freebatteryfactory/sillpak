# Voice transcription

Voice is an input method, not an authority bypass.

## Pipeline

1. The user presses Dictate.
2. MediaRecorder captures audio from the exact local application origin.
3. AudioContext decodes the recording into samples.
4. On the first transcription only, SillPak dynamically loads the transcription port and creates a module worker.
5. Transformers.js runs a quantized Whisper model.
6. WebGPU is preferred; Wasm remains the fallback.
7. The transcript is inserted into the selected editor or terminal.
8. Terminal text is never automatically executed.

The application does not use Electron's Web Speech API because behavior and service availability differ from Chrome and can fail with network errors.

## Security and privacy

- microphone permission is audio-only
- permission is restricted to the exact bound local origin
- the worker receives audio samples, not native authority
- the model loads only after a user gesture
- child terminals receive no local HTTP credentials
- first-run model download and cache controls must be disclosed before release

## Required runtime QA

- packaged Windows and macOS microphone permission
- Linux portal behavior
- model cache path and deletion
- offline behavior after caching
- WebGPU and Wasm fallback
- long dictation chunking
- non-English model selection
- recording-state accessibility announcements
