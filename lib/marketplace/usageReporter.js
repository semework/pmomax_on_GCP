import { randomUUID } from 'node:crypto';
import { MARKETPLACE_CONFIG, isMarketplaceEnabled } from './config.js';

const usageQueue = [];
let reporterTimer = null;

function normalizeMetric(sample) {
  if (Object.prototype.hasOwnProperty.call(sample, 'metric')) {
    const metric = String(sample.metric || '').trim();
    if (!metric) return { ok: false, error: 'Metric is required.' };
    return { ok: true, metric };
  }
  const metric = String(MARKETPLACE_CONFIG.defaultMetric || '').trim();
  if (!metric) return { ok: false, error: 'Metric is required.' };
  return { ok: true, metric };
}

function normalizeQuantity(sample) {
  const qty = Number(sample.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Quantity must be > 0.' };
  return { ok: true, quantity: Math.floor(qty) };
}

function normalizeTime(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function toMetricValue(sample) {
  const now = new Date().toISOString();
  const startTime = normalizeTime(sample.startTime, now);
  const endTime = normalizeTime(sample.endTime, now);
  return {
    startTime,
    endTime,
    metric: sample.metric,
    quantity: sample.quantity,
    consumerId: sample.consumerId,
    labels: sample.labels || {},
  };
}

export function enqueueUsage(sample) {
  if (!sample || typeof sample !== 'object') return { ok: false, error: 'Missing usage sample.' };
  const metricRes = normalizeMetric(sample);
  if (!metricRes.ok) return metricRes;
  const qtyRes = normalizeQuantity(sample);
  if (!qtyRes.ok) return qtyRes;

  let consumerId = String(sample.consumerId || MARKETPLACE_CONFIG.consumerId || '').trim();
  if (!consumerId) {
    if (MARKETPLACE_CONFIG.enabled) return { ok: false, error: 'consumerId is required.' };
    consumerId = 'project:unknown';
  }

  const normalized = toMetricValue({
    ...sample,
    metric: metricRes.metric,
    quantity: qtyRes.quantity,
    consumerId,
  });

  if (!MARKETPLACE_CONFIG.enabled && !MARKETPLACE_CONFIG.allowQueueWhenDisabled) {
    return { ok: true, queued: false, skipped: true };
  }

  usageQueue.push(normalized);
  if (usageQueue.length > MARKETPLACE_CONFIG.maxQueueSize) {
    usageQueue.splice(0, usageQueue.length - MARKETPLACE_CONFIG.maxQueueSize);
  }

  return { ok: true, queued: true };
}

async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

function buildReportPayload(samples) {
  const now = new Date().toISOString();
  return {
    operation: {
      operationId: randomUUID(),
      operationName: 'pmomax.usage',
      consumerId: samples[0]?.consumerId || MARKETPLACE_CONFIG.consumerId,
      startTime: samples[0]?.startTime || now,
      endTime: samples[samples.length - 1]?.endTime || now,
      metricValueSets: samples.map((sample) => ({
        metricName: sample.metric,
        metricValues: [
          {
            int64Value: String(sample.quantity),
            startTime: sample.startTime,
            endTime: sample.endTime,
            labels: sample.labels || {},
          },
        ],
      })),
    },
  };
}

async function sendReport(samples) {
  const serviceName = MARKETPLACE_CONFIG.serviceName;
  if (!serviceName) return { ok: false, error: 'Missing service name.' };

  const endpoint =
    MARKETPLACE_CONFIG.reportEndpoint ||
    'https://servicecontrol.googleapis.com/v1/services/' + serviceName + ':report';
  const accessToken = String(MARKETPLACE_CONFIG.accessToken || '').trim();
  if (!accessToken) return { ok: false, error: 'Missing access token.' };

  const doFetch = await getFetch();
  const res = await doFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken,
    },
    body: JSON.stringify(buildReportPayload(samples)),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || 'HTTP ' + res.status };
  }
  return { ok: true };
}

export async function flushUsage() {
  if (!usageQueue.length) return { ok: true, sent: 0 };
  if (!isMarketplaceEnabled()) return { ok: true, skipped: true, queued: usageQueue.length };

  const batch = usageQueue.splice(0, MARKETPLACE_CONFIG.maxBatchSize);
  try {
    const result = await sendReport(batch);
    if (!result.ok) {
      usageQueue.unshift(...batch);
      return { ok: false, error: result.error || 'Usage report failed.', queued: usageQueue.length };
    }
    return { ok: true, sent: batch.length };
  } catch (err) {
    usageQueue.unshift(...batch);
    return { ok: false, error: err?.message || 'Usage report failed.', queued: usageQueue.length };
  }
}

export function startUsageReporter() {
  if (reporterTimer) return;
  if (!MARKETPLACE_CONFIG.enabled || !MARKETPLACE_CONFIG.flushIntervalSeconds) return;
  reporterTimer = setInterval(() => {
    flushUsage().catch((err) => console.error('[usageReporter] flush failed', err));
  }, MARKETPLACE_CONFIG.flushIntervalSeconds * 1000);
}
