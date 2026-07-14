---
name: Manual vite build requires PORT/BASE_PATH
description: Running `pnpm run build` by hand for a Replit artifact's vite app fails with "PORT/BASE_PATH environment variable is required" unless you export them yourself.
---

Replit-scaffolded Vite artifacts (web apps under `artifacts/<name>`) read
`PORT` and `BASE_PATH` from `process.env` inside `vite.config.ts`. These are
injected automatically by the platform's dev workflow and deploy/build
pipeline, but not when you invoke `pnpm run build` manually from the shell
for local verification.

**Why:** the config throws immediately ("PORT environment variable is
required but was not provided" / same for `BASE_PATH`) instead of silently
defaulting, so a manual build looks broken when the app itself is fine.

**How to apply:** when manually verifying a production build outside the
managed workflow, export the same values the workflow uses, e.g.
`PORT=<workflow port> BASE_PATH=/ pnpm run build` (root-mounted artifact) or
`BASE_PATH=/<slug>/` for a path-mounted one. Don't treat this failure as a
real build regression until you've confirmed via the workflow logs (which
already run `pnpm run build` with the right env) or by supplying the env
vars yourself.
