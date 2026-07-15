# LiteShip 25-package evaluation

The shell consumes LiteShip. It does not modify LiteShip or turn it into a desktop backend.

| Package | Decision | Reason |
|---|---|---|
| `@czap/_spine` | transitive | Declaration-only support pulled by published LiteShip types. Never import at runtime. |
| `@czap/error` | now | Use `taggedError` for downstream path, preview, PTY, and permission variants. It stays useful during Effect removal. |
| `@czap/gauntlet` | now-dev | Author downstream self-proving gates for architecture and visual-policy drift. |
| `@czap/canonical` | later | Useful when preview-cache or persisted projection identity needs deterministic bytes. Not needed in the first vertical slice. |
| `@czap/genui` | later | Potential safe generated inspector surface. External agents remain terminal-first; no generated UI is needed to prove v1. |
| `@czap/core` | now | Boundary definitions, diagnostics, and stable LiteShip vocabulary. Effect-backed state primitives remain behind the migration boundary. |
| `@czap/quantizer` | evaluated, not direct | The current shell uses the core `Boundary` plus `@czap/astro` satellite runtime. Add quantizer directly only when product code actually imports live quantization APIs. |
| `@czap/compiler` | transitive | Reached through the Astro/Vite integration. The shell does not import compiler APIs directly in the first slice. |
| `@czap/web` | now | Morph, MorphOpaque, physical state, wire events, and sanitized DOCX DOM insertion. |
| `@czap/detect` | transitive | `@czap/astro` owns the current detection path. Add a direct dependency only when shell code consumes detection APIs itself. |
| `@czap/edge` | no-runtime | Astro pulls it transitively for host capability logic. The local desktop app does not configure an edge cache. |
| `@czap/cloudflare` | later-hosted | Only when a hosted shell actually targets Cloudflare. |
| `@czap/worker` | later | Its current worker contracts are compositor/render specific, not a generic task pool. Voice uses a product-owned worker seam. |
| `@czap/vite` | transitive | Installed by `@czap/astro`; supports LiteShip authoring and virtual modules. |
| `@czap/astro` | now | Primary host integration, detection middleware, directives, and Astro 7 wiring. |
| `@czap/remotion` | no | Video composition is outside the daily-driver shell slice. |
| `@czap/scene` | no | Timeline/ECS media composition is not a viewer requirement yet. |
| `@czap/stage` | no | Dual export is unrelated to artifact routing in v1. |
| `@czap/assets` | later | Use when audio waveforms, beat analysis, or deeper media projections are requested. Native media elements are sufficient now. |
| `@czap/audit` | now-dev | Run consumer structural, integrity, and surface audits after dependency installation. |
| `@czap/command` | pattern-only | Its one-registry-to-CLI-and-MCP law is valuable, but CZAP commands are not shell commands. Build a shell registry only when needed. |
| `@czap/cli` | no-direct | The scaffold imports Audit and Gauntlet APIs directly in the quality package. Add the CLI only if its human command surface becomes useful. |
| `@czap/mcp-server` | later | LiteShip-specific MCP does not replace a future workspace MCP surface. |
| `create-liteship` | no | Astro scaffold generator, not an application dependency. |
| `liteship` | no | Umbrella package would pull the whole fleet. Use targeted scopes. |

## Effect migration posture

Only `apps/shell/src/lib/liteship/effect-boundary.ts` imports Effect directly. The application uses a small local `StatePort` for volatile UI state. This avoids deepening coupling while LiteShip removes Effect, without pretending current LiteShip APIs are not Effect-shaped.

## Upstream candidate

The only concrete upstream gap found during this pass is documentation or a small public adapter for downstream consumers that need to isolate Effect-shaped state while LiteShip migrates. A local shim and issue-ready draft exist under `docs/upstream`.
