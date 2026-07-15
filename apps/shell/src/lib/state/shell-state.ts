export type ShellMode = 'terminal-heavy' | 'balanced' | 'artifact-heavy' | 'artifact-focus';

export interface ShellState {
  readonly mode: ShellMode;
  readonly contextPaths: readonly string[];
  readonly voiceState: 'idle' | 'recording' | 'transcribing' | 'error';
}

export type ShellMessage =
  | { readonly type: 'mode.changed'; readonly mode: ShellMode }
  | { readonly type: 'context.attached'; readonly path: string }
  | { readonly type: 'context.detached'; readonly path: string }
  | { readonly type: 'voice.changed'; readonly state: ShellState['voiceState'] };

export interface StatePort<S, M> {
  snapshot(): S;
  dispatch(message: M): void;
  subscribe(listener: (state: S) => void): () => void;
}

function reduce(state: ShellState, message: ShellMessage): ShellState {
  switch (message.type) {
    case 'mode.changed': return { ...state, mode: message.mode };
    case 'voice.changed': return { ...state, voiceState: message.state };
    case 'context.attached':
      return state.contextPaths.includes(message.path)
        ? state
        : { ...state, contextPaths: [...state.contextPaths, message.path] };
    case 'context.detached':
      return { ...state, contextPaths: state.contextPaths.filter((path) => path !== message.path) };
  }
}

export function createShellStatePort(initial: ShellState = {
  mode: 'balanced',
  contextPaths: [],
  voiceState: 'idle',
}): StatePort<ShellState, ShellMessage> {
  let state = initial;
  const listeners = new Set<(next: ShellState) => void>();
  return {
    snapshot: () => state,
    dispatch(message) {
      const next = reduce(state, message);
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
