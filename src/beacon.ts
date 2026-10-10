import type { EventProps } from './types';

/** The collector's wire payload: name, domain, url path, referrer, screen width, props. */
export interface BeaconPayload {
  n: string;
  d: string;
  u: string;
  r?: string;
  w?: number;
  p?: EventProps;
}

export function isLocalhostHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  );
}

/** Posts one payload; resolves whether the browser queued it or the collector accepted it. */
export async function sendBeacon(endpoint: string, payload: BeaconPayload): Promise<boolean> {
  const body = JSON.stringify(payload);
  // text/plain keeps this a CORS "simple" request: no preflight, adblocker-friendly when proxied.
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain' });
      if (navigator.sendBeacon(endpoint, blob)) return true;
    }
  } catch {
    // sendBeacon unavailable or threw — fall through to fetch.
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
