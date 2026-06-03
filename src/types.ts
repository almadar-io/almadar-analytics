export type EventProps = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsConfig {
  /** Collector ingest URL, e.g. `https://stats.almadar.io/e`. */
  endpoint: string;
  /** Logical site id sent with every event. Defaults to `location.hostname`. */
  domain?: string;
  /** Patch the History API so SPA route changes fire pageviews. Default `true`. */
  autoPageviews?: boolean;
  /** Send the query string as part of the path. Default `false` (drops UTM/PII). */
  includeQuery?: boolean;
  /** Derive the path from `location.hash` (HashRouter). Default `false`. */
  hashRouting?: boolean;
  /** Send events when running on localhost/127.0.0.1/*.local. Default `false`. */
  trackLocalhost?: boolean;
}
