export interface LocalOrigin {
  readonly origin: string;
  readonly expectedHost: string;
}

export function parseLocalOrigin(value: string): LocalOrigin {
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new Error('local application URL is invalid', { cause });
  }
  if (url.protocol !== 'http:'
    || url.hostname !== '127.0.0.1'
    || !url.port
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash) {
    throw new Error('local application URL must be an origin-only http://127.0.0.1:<port> value');
  }
  return { origin: url.origin, expectedHost: url.host };
}
