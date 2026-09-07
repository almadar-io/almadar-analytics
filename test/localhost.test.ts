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

const location = { pathname: '/', search: '', hash: '', hostname: 'localhost' };

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    location,
    history: { pushState() {}, replaceState() {} },
    screen: { width: 1280 },
    addEventListener() {},
  },
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    sendBeacon(url: string, blob: FakeBlob): boolean {
      beacons.push({ url, body: blob.text });
      return true;
    },
  },
});
Object.defineProperty(globalThis, 'document', { configurable: true, value: { referrer: '' } });
Object.defineProperty(globalThis, 'Blob', { configurable: true, value: FakeBlob });

const { init, track } = await import('../src/core');

test('localhost is not tracked by default, but opt-in re-enables it', () => {
  init({ endpoint: 'https://stats.almadar.io/e' });
  expect(beacons.length).toBe(0);
  track('signup');
  expect(beacons.length).toBe(0);

  init({ endpoint: 'https://stats.almadar.io/e', trackLocalhost: true });
  expect(beacons.length).toBe(1);
});
