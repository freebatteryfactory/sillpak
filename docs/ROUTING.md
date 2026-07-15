# Routing model

## Route identity

The active artifact is represented by an Astro route:

`/w/local/<encoded relative path>`

The local workspace is concrete. There is no generic provider or resource-graph router in version one.

## Encoding law

- Absolute paths never enter URLs.
- Each relative path segment is encoded independently.
- Empty, `.`, `..`, slash-containing, backslash-containing, NUL-containing, or oversized segments are refused.
- Case is preserved.
- The backend resolves the canonical workspace root, checks lexical containment, resolves symlinks, and checks containment again.

## Page types

- `/w/local` renders the workspace root.
- A directory route renders navigation and directory projection.
- A file route renders the matching artifact projection.
- Browser captures may later be routed artifacts.
- A live remote browser session will have its own session route, not masquerade as a local file.

## Route authority

The URL is the authoritative artifact selection. The shell store may retain panel mode, context attachments, expanded folders, and volatile view state, but it does not maintain a competing selected-file truth.

## Local HTTP authority

The local server binds to an ephemeral `127.0.0.1` port in production and a fixed loopback port in development.

Before Astro handles a request:

1. the Host header must exactly match the bound host and port
2. `/w/*` and `/api/*` require the HttpOnly session cookie or host bearer token
3. mutations require the exact bound Origin
4. cross-site fetch metadata is refused

The application cookie is installed by Electron before the first route loads. It is never exposed through preload or inherited by terminal processes.

## Persistent surfaces

Astro `ClientRouter` owns client-side navigation. The terminal and context shelf use `transition:persist`. Specialist engines remain LiteShip-opaque.

Route navigation may replace the artifact page. It must not terminate terminal or browser sessions.
