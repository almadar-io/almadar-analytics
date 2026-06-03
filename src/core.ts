import type { AnalyticsConfig, EventProps } from './types';

interface BeaconPayload {
  n: string;
  d: string;
  u: string;
  r?: string;
  w?: number;
  p?: EventProps;
}

let cfg: Required<AnalyticsConfig> | null = null;
let lastPath: string | null = null;
let historyPatched = false;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof navigator !== 'undefined';

function isLocalhost(): boolean {
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === '[::1]' ||
    h === '' ||
    h.endsWith('.local') ||
    h.endsWith('.localhost')
  );
}

function domain(): string {
  return cfg?.domain || window.location.hostname;
}

function currentPath(): string {
  const { pathname, search, hash } = window.location;
  if (cfg?.hashRouting) {
    const h = hash.replace(/^#/, '') || '/';
    return cfg.includeQuery ? h : h.split('?')[0];
  }
  return cfg?.includeQuery ? pathname + search : pathname;
}

function post(payload: BeaconPayload): void {
  const url = cfg!.endpoint;
  const body = JSON.stringify(payload);
  // text/plain keeps this a CORS "simple" request: no preflight, adblocker-friendly when proxied.
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // sendBeacon unavailable or threw — fall through to fetch.
  }
  void fetch(url, {
    method: 'POST',
    body,
    keepalive: true,
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
  }).catch(() => undefined);
}

export function pageview(path?: string): void {
  if (!cfg || !isBrowser()) return;
  const u = path ?? currentPath();
  if (u === lastPath) return;
  lastPath = u;
  post({
    n: 'pageview',
    d: domain(),
    u,
    r: document.referrer || undefined,
    w: window.screen?.width,
  });
}

export function track(name: string, props?: EventProps): void {
  if (!cfg || !isBrowser()) return;
  post({ n: name, d: domain(), u: currentPath(), p: props });
}

function wrap(method: 'pushState' | 'replaceState'): void {
  const original: History['pushState'] = window.history[method];
  window.history[method] = function (
    this: History,
    ...args: Parameters<History['pushState']>
  ): void {
    original.apply(this, args);
    pageview();
  };
}

function enableAutoPageviews(): void {
  if (historyPatched) return;
  historyPatched = true;
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', () => pageview());
}

export function init(options: AnalyticsConfig): void {
  if (!options?.endpoint) return;
  cfg = {
    autoPageviews: true,
    includeQuery: false,
    hashRouting: false,
    domain: '',
    trackLocalhost: false,
    ...options,
  };
  if (!isBrowser()) return;
  if (!cfg.trackLocalhost && isLocalhost()) {
    // Don't send dev/local traffic to production analytics.
    cfg = null;
    return;
  }
  if (cfg.autoPageviews) enableAutoPageviews();
  pageview();
}
