import { expect, test } from 'vitest';

interface Beacon {
  url: string;
  body: string;
}
const beacons: Beacon[] = [];

class FakeBlob {
  text: string;
  constructor(parts: string[]) {
    this.text = parts.join('');
  }
}

const location = { pathname: '/', search: '?utm=x', hash: '', hostname: 'almadar.io' };
const listeners: Record<string, Array<() => void>> = {};

function setPath(url: string): void {
  const [p, q] = url.split('?');
  location.pathname = p;
  location.search = q ? `?${q}` : '';
}

const history = {
  pushState(_s: unknown, _t: string, url: string): void {
    setPath(url);
  },
  replaceState(_s: unknown, _t: string, url: string): void {
    setPath(url);
  },
};

const g = globalThis as unknown as Record<string, unknown>;
g.window = {
  location,
  history,
  screen: { width: 1280 },
  addEventListener(type: string, cb: () => void): void {
    (listeners[type] ??= []).push(cb);
  },
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    sendBeacon(url: string, blob: FakeBlob): boolean {
      beacons.push({ url, body: blob.text });
      return true;
    },
  },
});
g.document = { referrer: 'https://news.ycombinator.com/' };
g.Blob = FakeBlob;

const { init, track } = await import('../src/core');

test('cookieless beacon: autopageview, dedupe, query-strip, custom events', () => {
  init({ endpoint: 'https://stats.almadar.io/e', domain: 'almadar.io' });
  expect(beacons.length).toBe(1);

  const first = JSON.parse(beacons[0].body) as Record<string, unknown>;
  expect(first.n).toBe('pageview');
  expect(first.d).toBe('almadar.io');
  expect(first.u).toBe('/');
  expect(first.r).toBe('https://news.ycombinator.com/');
  expect(first.w).toBe(1280);

  history.pushState(null, '', '/docs?utm=y');
  expect(beacons.length).toBe(2);
  expect((JSON.parse(beacons[1].body) as { u: string }).u).toBe('/docs');

  history.pushState(null, '', '/docs');
  expect(beacons.length).toBe(2);

  (listeners.popstate ?? []).forEach((cb) => cb());
  expect(beacons.length).toBe(2);

  track('signup', { plan: 'pro' });
  const ev = JSON.parse(beacons[2].body) as Record<string, unknown>;
  expect(ev.n).toBe('signup');
  expect(ev.p).toEqual({ plan: 'pro' });
});
