import { taggedError, type TaggedErrorValue } from '@czap/error';

export type WorkspacePathError = TaggedErrorValue<
  'WorkspacePathError',
  { readonly operation: string; readonly requestedPath: string }
>;

export const WorkspacePathError = (
  operation: string,
  requestedPath: string,
  detail: string,
  cause?: unknown,
): WorkspacePathError =>
  taggedError(
    'WorkspacePathError',
    `${operation}: ${detail}`,
    { operation, requestedPath },
    cause === undefined ? undefined : { cause },
  );

export type ArtifactReadError = TaggedErrorValue<
  'ArtifactReadError',
  { readonly operation: string; readonly path: string }
>;

export const ArtifactReadError = (
  operation: string,
  path: string,
  detail: string,
  cause?: unknown,
): ArtifactReadError =>
  taggedError(
    'ArtifactReadError',
    `${operation}: ${detail}`,
    { operation, path },
    cause === undefined ? undefined : { cause },
  );
