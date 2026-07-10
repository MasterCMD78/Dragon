---
name: Trim env vars used in URLs/config
description: Secrets/env vars can contain accidental leading/trailing whitespace, silently breaking constructed URLs
---

`TELEGRAM_BOT_USERNAME` (and similar user-entered secrets) may contain leading/trailing
whitespace, which is invisible in normal display but breaks any URL built by string
interpolation (e.g. `https://t.me/ BotName` with a stray space).

**Why:** Found in HustleCoin when `TELEGRAM_BOT_USERNAME` had leading spaces, producing a
malformed referral deep link that passed typecheck/build but failed at runtime.

**How to apply:** When reading an env var / secret directly into a URL or other
user-facing string, `.trim()` it defensively rather than assuming it's clean.
