import { Effect } from 'effect';

/**
 * The only application-owned Effect import. LiteShip 0.10 still exposes some
 * Effect-shaped operations; this module keeps that coupling disposable while
 * LiteShip migrates its runtime away from Effect.
 */
export async function runLiteShipEffect<A, E>(operation: Effect.Effect<A, E>): Promise<A> {
  return Effect.runPromise(operation);
}

export function runLiteShipEffectSync<A, E>(operation: Effect.Effect<A, E>): A {
  return Effect.runSync(operation);
}
