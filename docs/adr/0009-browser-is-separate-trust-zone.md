# ADR 0009: Remote browser content is a separate trust zone

**Status:** accepted, implementation deferred

Remote pages will use a main-process-owned WebContentsView with a separate session partition, no preload, no Node integration, no local session cookie, and deny-by-default permissions. The trusted Astro renderer supplies only the opaque visual region and control requests.
