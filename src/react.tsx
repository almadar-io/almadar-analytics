import { useEffect, useRef } from 'react';
import { init, track } from './core';
import type { AnalyticsConfig, EventProps } from './types';

/** Drop-in component: mount once near the app root to start cookieless tracking. */
export function Analytics(config: AnalyticsConfig): null {
  const ref = useRef(config);
  ref.current = config;
  useEffect(() => {
    init(ref.current);
  }, []);
  return null;
}

export function useTrackEvent(): (name: string, props?: EventProps) => void {
  return track;
}

export type { AnalyticsConfig, EventProps };
