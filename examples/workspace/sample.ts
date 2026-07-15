export interface Projection {
  readonly artifact: string;
  readonly route: string;
}

export function describeProjection(value: Projection): string {
  return `${value.artifact} is available at ${value.route}`;
}
