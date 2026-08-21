import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticateEnterprise } from './auth.mjs';
import { ProjectService } from './projectService.mjs';

export function createEnterpriseRouter({ service = new ProjectService() } = {}) {
  const router = express.Router();
  const buckets = new Map();
  router.use((req, res, next) => {
    req.id = String(req.headers['x-request-id'] || randomUUID());
    res.set('X-Request-Id', req.id);
    try {
      req.identity = authenticateEnterprise(req);
      enforceRate(req.identity, req.path, buckets);
      next();
    } catch (error) { sendError(res, error, req.id); }
  });

  router.get('/ready', (_req, res) => res.json({ ok: true, data: { status: 'ready' } }));
  router.post('/projects', route(async (req) => service.create(req.identity, req.body || {})));
  router.post('/pid/generate', route(async (req) => service.generatePid(req.identity, req.body || {})));
  router.get('/projects/:projectId', route(async (req) => service.get(req.identity, req.params.projectId)));
  router.patch('/projects/:projectId', route(async (req) => service.update(req.identity, { ...(req.body || {}), projectId: req.params.projectId })));
  router.post('/projects/:projectId/analyze', route(async (req) => service.analyze(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/risks', route(async (req) => service.risks(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/compliance', route(async (req) => service.compliance(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/gantt', route(async (req) => service.gantt(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/schedule', route(async (req) => service.schedule(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/cost', route(async (req) => service.cost(req.identity, req.params.projectId)));
  router.post('/projects/:projectId/compare', route(async (req) => service.compare(req.identity, req.params.projectId, req.body?.fromVersion, req.body?.toVersion)));
  router.post('/projects/:projectId/export', route(async (req) => service.export(req.identity, req.params.projectId, req.body?.format)));
  router.post('/projects/:projectId/search', route(async (req) => service.search(req.identity, req.params.projectId, req.body?.query, req.body?.limit)));
  return router;
}

function route(handler) { return async (req, res) => { try { res.json({ ok: true, data: await handler(req, res), requestId: req.id }); } catch (error) { sendError(res, error, req.id); } }; }
function sendError(res, error, requestId) { const status = Number(error?.status) || 500; const code = error?.code || 'INTERNAL_PROCESSING_FAILURE'; const eventType = status === 401 || status === 403 ? 'pmomax.authorization_denied' : 'pmomax.error'; console.error(JSON.stringify({ timestamp: new Date().toISOString(), eventType, requestId, code, status, message: status >= 500 ? 'Internal processing failure' : String(error?.message || 'Request rejected') })); res.status(status).json({ ok: false, error: { code, message: status >= 500 && !error?.code ? 'The operation could not be completed.' : String(error?.message || 'The operation could not be completed.'), ...(error?.safeDetails === undefined ? {} : { details: error.safeDetails }) }, requestId }); }
function enforceRate(identity, path, buckets) { const expensive = /analyze|risks|compliance|gantt|schedule|cost|export|search/.test(path); const limit = Number(process.env[expensive ? 'PMOMAX_EXPENSIVE_RATE_LIMIT_PER_MINUTE' : 'PMOMAX_RATE_LIMIT_PER_MINUTE'] || (expensive ? 30 : 120)); const window = Math.floor(Date.now() / 60000); const key = `${identity.tenantId}:${identity.subject}:${expensive}:${window}`; const count = (buckets.get(key) || 0) + 1; buckets.set(key, count); if (count > limit) { const error = new Error('Rate limit exceeded. Retry after the current minute window.'); error.code = 'RATE_LIMITED'; error.status = 429; throw error; } if (buckets.size > 10_000) for (const stored of buckets.keys()) if (!stored.endsWith(`:${window}`)) buckets.delete(stored); }
