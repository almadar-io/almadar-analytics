import { afterEach, expect, test } from 'vitest';
import { isLocalhostHost, sendBeacon, type BeaconPayload } from '../src/beacon';

class FakeBlob {
  text: string;
  type: string;
  constructor(parts: string[], opts: { type: string }) {
    this.text = parts.join('');
    this.type = opts.type;
  }
}

interface Sent {
  via: 'beacon' | 'fetch';
  url: string;
  body: string;
  type: string;
}

const payload: BeaconPayload = { n: 'pageview', d: 'orb.almadar.io', u: '/docs', r: 'https://x.dev/', w: 1440 };

function install(beacon: ((url: string, blob: FakeBlob) => boolean) | null, fetchOk: boolean | 'reject'): Sent[] {
  const sent: Sent[] = [];
  Object.defineProperty(globalThis, 'Blob', { configurable: true, value: FakeBlob });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: beacon === null ? {} : {
      sendBeacon(url: string, blob: FakeBlob): boolean {
        const ok = beacon(url, blob);
        if (ok) sent.push({ via: 'beacon', url, body: blob.text, type: blob.type });
        return ok;
      },
    },
  });
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: (url: string, init: { body: string; headers: Record<string, string> }): Promise<{ ok: boolean }> => {
      if (fetchOk === 'reject') return Promise.reject(new Error('offline'));
      sent.push({ via: 'fetch', url, body: init.body, type: init.headers['Content-Type'] });
      return Promise.resolve({ ok: fetchOk });
    },
  });
  return sent;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'navigator');
  Reflect.deleteProperty(globalThis, 'fetch');
});

test('queues through sendBeacon as text/plain JSON', async () => {
  const sent = install(() => true, true);
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(true);
  expect(sent).toEqual([{ via: 'beacon', url: 'https://c.example/e', body: JSON.stringify(payload), type: 'text/plain' }]);
});

test('falls back to fetch when sendBeacon refuses the payload', async () => {
  const sent = install(() => false, true);
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(true);
  expect(sent.map((s) => s.via)).toEqual(['fetch']);
  expect(sent[0].type).toBe('text/plain');
});

test('falls back to fetch when sendBeacon throws or is absent', async () => {
  const thrown = install(() => {
    throw new Error('blocked');
  }, true);
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(true);
  expect(thrown.map((s) => s.via)).toEqual(['fetch']);

  const absent = install(null, true);
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(true);
  expect(absent.map((s) => s.via)).toEqual(['fetch']);
});

test('reports false when the collector rejects or the network fails', async () => {
  install(() => false, false);
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(false);
  install(() => false, 'reject');
  await expect(sendBeacon('https://c.example/e', payload)).resolves.toBe(false);
});

test('localhost hosts are recognised; public hosts are not', () => {
  for (const h of ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', '', 'box.local', 'app.localhost']) {
    expect(isLocalhostHost(h)).toBe(true);
  }
  for (const h of ['orb.almadar.io', 'almadar.io', 'localhost.example.com', '127.0.0.2.nip.io']) {
    expect(isLocalhostHost(h)).toBe(false);
  }
});
