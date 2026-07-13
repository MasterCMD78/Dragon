---
name: Artifact re-registration can overwrite existing files
description: createArtifact on a slug whose directory already exists can silently re-adopt sibling artifacts AND overwrite the target artifact's source files with scaffold defaults.
---

When a project is re-imported (e.g. from GitHub) and the platform's artifact registry is empty even though `.replit-artifact/artifact.toml` files already exist on disk, calling `createArtifact` for one slug can:

1. Auto-register/adopt **all** sibling artifacts found in the repo at once (not just the one requested) — confirmed via automatic_updates messages naming each adopted artifact.
2. **Overwrite the target artifact's directory** with fresh scaffold content (generic placeholder pages, default `App.tsx`, modified `vite.config.ts`/`tsconfig.json`), destroying real application code that was already there — even though the intent was only to restore *registration*, not regenerate files.

**Why:** the scaffold step runs unconditionally as part of `createArtifact`, regardless of whether the directory already has real content; it does not detect "this is a re-registration of existing code" vs "this is a brand-new artifact."

**How to apply:** before calling `createArtifact` on a slug whose directory already exists (e.g. during import recovery), back up that directory first (`cp -r` to `/tmp`). After the call, diff `git status` across ALL artifact directories (not just the one you targeted) to see what actually changed, then restore real files from the backup while keeping only the newly-generated `.replit-artifact/artifact.toml` (which carries correct IDs/ports for registration).
