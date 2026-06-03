# @almadar/analytics

Cookieless, GDPR-friendly first-party analytics beacon. No cookies, no
`localStorage`, no persistent identifier, no consent banner required. ~1 KB,
zero runtime dependencies. Works in any SPA and in Docusaurus.

It sends pageviews and custom events to a first-party collector
([`@almadar/analytics-server`](../almadar-analytics-server)). Visitor uniqueness
and geography are computed server-side from a daily-rotating salted hash and the
request IP, which the collector discards immediately — the browser never sends
an IP or any identifier.

## What it sends

```jsonc
{ "n": "pageview", "d": "almadar.io", "u": "/docs", "r": "https://news.ycombinator.com/", "w": 1280 }
```

`n` event name · `d` domain · `u` path (query string dropped by default) ·
`r` referrer · `w` screen width · `p` optional custom props. Delivered with
`navigator.sendBeacon` (falls back to `fetch(keepalive)`), as `text/plain` so it
is a CORS-simple request with no preflight.

## SPA apps (`apps/*` — React + react-router)

Mount once near the root. Route changes are tracked automatically (the History
API is patched, which is exactly what react-router v7 drives).

```tsx
import { Analytics } from '@almadar/analytics/react';

<Analytics endpoint="https://stats.almadar.io/e" domain="almadar.io" />
```

Custom events:

```tsx
import { useTrackEvent } from '@almadar/analytics/react';

const track = useTrackEvent();
track('app_created', { template: 'ecommerce' }); // never send raw PII as props
```

For a `HashRouter` app (the builder uses one under Electron) pass
`hashRouting`. Non-React SPAs can call `init()` from `@almadar/analytics`
directly.

## Docusaurus (`almadar/*` sites)

Add a client module that wires route changes to the beacon:

```ts
// shared/theme/analytics.ts
import { createRouteListener } from '@almadar/analytics/docusaurus';

export const onRouteDidUpdate = createRouteListener({
  endpoint: 'https://stats.almadar.io/e',
  domain: 'almadar.io',
});
```

Register it in `docusaurus.config.ts` (or the shared `base-config.ts`):

```ts
clientModules: [
  // …existing modules…
  require.resolve('./shared/theme/analytics.ts'),
],
```

No `headTags`, no consent banner, no gtag.

## API

| Export | Where | Description |
|---|---|---|
| `init(config)` | `.` | Configure + start. Fires the first pageview. |
| `pageview(path?)` | `.` | Manual pageview (de-duplicated by path). |
| `track(name, props?)` | `.` | Custom event. |
| `<Analytics {...config} />` | `./react` | Mount-once component. |
| `useTrackEvent()` | `./react` | Returns `track`. |
| `createRouteListener(config)` | `./docusaurus` | Builds `onRouteDidUpdate`. |

`config`: `endpoint` (required), `domain`, `autoPageviews` (default `true`),
`includeQuery` (default `false`), `hashRouting` (default `false`).

## Privacy

No cookies or storage are ever written. The query string is dropped by default
so UTM/campaign and other identifiers in the URL are not collected — keep it
that way to stay inside the CNIL audience-measurement exemption. Pair with
`@almadar/analytics-server`, which truncates/discards the IP after deriving
geography and rotates the uniqueness salt daily so visitors cannot be linked
across days.
