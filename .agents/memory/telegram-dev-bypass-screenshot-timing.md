---
name: Telegram Mini App dev-bypass screenshot timing
description: Screenshotting a Telegram Mini App's root page right after load can show a perpetual "connecting" spinner even when auth works — this is a timing artifact, not a bug.
---

Telegram Mini App frontends that support browser/dev testing typically wait for the real Telegram WebApp SDK to populate `initData` before falling back to a dev-bypass login — commonly a short retry loop (e.g. 5 attempts × 400ms ≈ 2s) before the fallback fires and the auth request is sent.

**Why:** the SDK script (`telegram-web-app.js`) always defines `window.Telegram.WebApp` even outside Telegram, so the frontend can't use its mere presence to detect "really in Telegram" — it must wait to see if `initData` ever gets populated, which takes real time.

**How to apply:** if a screenshot taken immediately after a fresh page load shows a stuck loading/connecting state for such an app, don't treat it as a broken auth flow. Verify the backend independently first — `curl -c cookies.txt` the login endpoint and then the "current user" endpoint with `-b cookies.txt` against the real dev domain (not bare `localhost`, since `Secure` cookies need the HTTPS-terminated proxy) — and check the workflow's request log for the expected `POST .../auth/...` → 200 → `GET .../me` → 200 sequence. If that round-trip succeeds, the frontend is fine; the screenshot was just taken inside the SDK-detection retry window.
