---
name: Vite client env vars need VITE_ prefix even for values already in process env
description: A backend-only env var (e.g. ALLOW_DEV_BYPASS) is invisible to Vite client code unless a separately-named VITE_-prefixed copy is also set.
---

Vite only exposes `import.meta.env.*` for variables whose name starts with `VITE_`. If a project has a backend flag like `ALLOW_DEV_BYPASS=true` (read via `process.env` in the API server) and the frontend checks `import.meta.env.VITE_ALLOW_DEV_BYPASS`, setting only the unprefixed name does nothing for the client bundle — you must also set the `VITE_`-prefixed name in the same environment (e.g. via `setEnvVars({ environment: "development", values: { VITE_ALLOW_DEV_BYPASS: "true" } })`), then restart the frontend dev workflow.

**Why:** this is a common source of "dev bypass login doesn't work in browser preview even though the backend accepts it" — curl to the API succeeds, but the frontend never attempts the bypass call because its own env check reads `undefined`.

**How to apply:** whenever a Telegram Mini App / similar frontend has a browser-dev-bypass flag, confirm both the backend var AND its `VITE_`-prefixed twin are set for the `development` environment.
