import { Boundary } from '@czap/core';

export const shellWidthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'narrow'],
    [900, 'balanced'],
    [1440, 'wide'],
  ],
  hysteresis: 32,
});
