import { createHmac, timingSafeEqual } from 'node:crypto';
import { enterpriseError } from './pidCore.mjs';

const VALID_ROLES = new Set(['user', 'project_manager', 'administrator', 'service_account']);

export function authenticateEnterprise(req) {
  const mode = String(process.env.PMOMAX_AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'internal' : 'disabled')).toLowerCase();
  const authorization = String(req.headers.authorization || '');
  if (mode === 'disabled') {
    if (process.env.NODE_ENV === 'production') throw enterpriseError('AUTHENTICATION_FAILED', 'Authentication cannot be disabled in production.', 503);
    return identityFromClaims({ sub: req.headers['x-pmomax-user-id'] || 'local-user', tenant_id: req.headers['x-pmomax-tenant-id'] || 'local-tenant', roles: String(req.headers['x-pmomax-roles'] || 'administrator').split(',') }, req);
  }
  if (!authorization.startsWith('Bearer ')) throw enterpriseError('AUTHENTICATION_FAILED', 'A bearer access token is required.', 401);
  const token = authorization.slice(7).trim();
  if (mode === 'internal') {
    const expected = String(process.env.PMOMAX_INTERNAL_SERVICE_TOKEN || '');
    if (expected.length < 32 || !safeEqual(token, expected)) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token is invalid.', 401);
    return identityFromClaims({ sub: req.headers['x-pmomax-user-id'], tenant_id: req.headers['x-pmomax-tenant-id'], roles: String(req.headers['x-pmomax-roles'] || '').split(',') }, req);
  }
  if (mode === 'hs256') return identityFromClaims(verifyHs256(token), req);
  throw enterpriseError('AUTHENTICATION_FAILED', 'The configured authentication mode is unsupported.', 503);
}

function verifyHs256(token) {
  const secret = String(process.env.PMOMAX_JWT_SECRET || '');
  if (secret.length < 32) throw enterpriseError('AUTHENTICATION_FAILED', 'JWT verification is not configured.', 503);
  const parts = token.split('.');
  if (parts.length !== 3) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token is malformed.', 401);
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!safeEqual(parts[2], expected)) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token is invalid.', 401);
  let claims;
  try { claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { throw enterpriseError('AUTHENTICATION_FAILED', 'The access token is malformed.', 401); }
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || Number(claims.exp) <= now) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token has expired.', 401);
  if (claims.nbf && Number(claims.nbf) > now + 30) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token is not active.', 401);
  const issuer = process.env.PMOMAX_JWT_ISSUER;
  const audience = process.env.PMOMAX_JWT_AUDIENCE;
  if (issuer && claims.iss !== issuer) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token issuer is invalid.', 401);
  if (audience && ![].concat(claims.aud || []).includes(audience)) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token audience is invalid.', 401);
  return claims;
}

function identityFromClaims(claims, req) {
  const subject = String(claims.sub || '');
  const tenantId = String(claims.tenant_id || claims.organization_id || '');
  const roles = [...new Set([].concat(claims.roles || claims.role || []).flatMap((role) => String(role).split(',')).map((role) => role.trim()).filter((role) => VALID_ROLES.has(role)))];
  if (!subject || !tenantId || !roles.length) throw enterpriseError('AUTHENTICATION_FAILED', 'The access token lacks required identity, tenant, or role claims.', 401);
  return { subject, tenantId, roles, requestId: String(req.headers['x-request-id'] || req.id || '') };
}

function safeEqual(left, right) { const a = Buffer.from(String(left)); const b = Buffer.from(String(right)); return a.length === b.length && timingSafeEqual(a, b); }
