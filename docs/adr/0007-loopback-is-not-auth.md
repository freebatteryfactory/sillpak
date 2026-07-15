# ADR 0007: Loopback binding is not authorization

**Status:** accepted

Every local workspace page and API requires authentication. The Node host rejects any Host header other than the exact bound loopback host and port before Astro. Mutations also require the exact local Origin. Electron installs an HttpOnly SameSite Strict session cookie before loading the application.
