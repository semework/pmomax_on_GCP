const env = process.env;

const asBool = (v, fallback = false) => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  return fallback;
};

const asInt = (v, fallback) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

export const MARKETPLACE_CONFIG = {
  enabled: asBool(env.MARKETPLACE_ENABLED, false),
  serviceName: env.MARKETPLACE_SERVICE_NAME || env.GCP_SERVICE_NAME || '',
  consumerId: env.MARKETPLACE_CONSUMER_ID || '',
  defaultMetric: env.MARKETPLACE_USAGE_DEFAULT_METRIC || 'custom.googleapis.com/pmomax/requests',
  reportEndpoint: env.MARKETPLACE_REPORT_ENDPOINT || '',
  accessToken: env.MARKETPLACE_ACCESS_TOKEN || env.GOOGLE_OAUTH_ACCESS_TOKEN || '',
  flushIntervalSeconds: asInt(env.MARKETPLACE_USAGE_FLUSH_INTERVAL_SECONDS, 60),
  maxBatchSize: asInt(env.MARKETPLACE_USAGE_BATCH_MAX, 200),
  maxQueueSize: asInt(env.MARKETPLACE_USAGE_QUEUE_MAX, 2000),
  allowQueueWhenDisabled: asBool(env.MARKETPLACE_QUEUE_WHEN_DISABLED, false),
  entitlementEnabled: asBool(env.MARKETPLACE_ENTITLEMENT_ENABLED, false),
  entitlementEndpoint: env.MARKETPLACE_ENTITLEMENT_ENDPOINT || '',
};

export function isMarketplaceEnabled() {
  return Boolean(MARKETPLACE_CONFIG.enabled && MARKETPLACE_CONFIG.serviceName);
}
