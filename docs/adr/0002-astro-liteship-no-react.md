# ADR 0002: Astro and LiteShip, no React

**Status:** accepted

Astro owns route composition and LiteShip owns adaptive projection. Specialist engines are framework-neutral opaque islands. React and `@lexical/react` are rejected because they add a second rendering and state lifecycle without owning the terminal, editor, PDF, or canvas surfaces.
