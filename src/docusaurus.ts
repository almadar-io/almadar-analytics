import { init, pageview } from './core';
import type { AnalyticsConfig } from './types';

export { init, pageview, track } from './core';
export type { AnalyticsConfig, EventProps } from './types';

interface RouteUpdate {
  location: { pathname: string };
  previousLocation: { pathname: string } | null;
}

/**
 * Builds a Docusaurus `onRouteDidUpdate` listener. Auto-pageviews are disabled
 * because Docusaurus drives route changes here, not the History API.
 */
export function createRouteListener(
  config: AnalyticsConfig,
): (update: RouteUpdate) => void {
  init({ ...config, autoPageviews: false });
  return ({ location, previousLocation }: RouteUpdate): void => {
    if (previousLocation?.pathname !== location.pathname) {
      pageview(location.pathname);
    }
  };
}
