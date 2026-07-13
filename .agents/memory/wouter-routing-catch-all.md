---
name: Wouter nested routing gotcha
description: Using /:rest* catch-all in wouter 3.x with JSX children breaks public route rendering; use flat routes instead.
---

## Rule
In wouter 3.x (tested 3.10.0), do NOT use `<Route path="/:rest*">` with JSX children to wrap a nested `<Switch>` for public routes. The catch-all pattern with JSX children renders the Layout but the inner Switch's routes fail to match, resulting in a completely black/empty page.

**Why:** Wouter's `/:rest*` pattern with JSX children (not the `component` prop) may not correctly propagate the matched path to inner Switch contexts. Admin routes with `nest` prop work fine, but the catch-all wrapper for public routes silently fails.

**How to apply:**
- Flatten the route structure: define each public route at the top-level Switch with Layout inlined.
- Create wrapper components: `const PHome = () => <Layout><Home /></Layout>` and use `<Route path="/" component={PHome} />`.
- Admin routes: use explicit routes (no nest) with a shared `<AdminPage>` wrapper instead of a nested Switch.
- Never use `<Route path="/:rest*">` as a Layout wrapper — always use either `component` prop or explicit route-per-page pattern.
