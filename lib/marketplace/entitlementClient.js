import { MARKETPLACE_CONFIG } from './config.js';

async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

export async function getEntitlement(entitlementName) {
  const name = String(entitlementName || '').trim();
  if (!name) return { name: '', active: false, state: 'ENTITLEMENT_STATE_UNSPECIFIED' };
  if (!MARKETPLACE_CONFIG.entitlementEnabled) {
    return { name, active: false, state: 'ENTITLEMENT_STATE_UNSPECIFIED', reason: 'disabled' };
  }

  const endpoint =
    MARKETPLACE_CONFIG.entitlementEndpoint ||
    'https://cloudcommerceprocurement.googleapis.com/v1/' + name;
  const accessToken = String(MARKETPLACE_CONFIG.accessToken || '').trim();
  if (!accessToken) {
    return { name, active: false, state: 'ENTITLEMENT_STATE_UNSPECIFIED', reason: 'missing_access_token' };
  }

  const doFetch = await getFetch();
  const res = await doFetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return { name, active: false, state: 'ENTITLEMENT_STATE_UNSPECIFIED', error: text || 'HTTP ' + res.status };
  }

  const data = await res.json();
  const state = String(data?.state || 'ENTITLEMENT_STATE_UNSPECIFIED');
  const active = state === 'ACTIVE';
  return { ...data, name, state, active };
}
