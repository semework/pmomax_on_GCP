import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { buildGantt, comparePids, complianceFindings, enterpriseError, estimateCost, estimateSchedule, generatePidFromInput, identifyRisks, normalizePid } from './pidCore.mjs';

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const safeSegment = (value, label) => {
  const text = String(value || '');
  if (!ID_RE.test(text)) throw enterpriseError('INVALID_INPUT', `Invalid ${label}.`, 400);
  return text;
};

export class ProjectService {
  constructor({ dataDir = process.env.PMOMAX_DATA_DIR || '/tmp/pmomax-enterprise-data', audit = console } = {}) {
    this.dataDir = path.resolve(dataDir);
    this.audit = audit;
    this.locks = new Map();
  }

  async create(identity, input) {
    requireRole(identity, ['user', 'project_manager', 'administrator', 'service_account']);
    const idempotencyKey = String(input.idempotencyKey || '').slice(0, 128);
    if (idempotencyKey) {
      const existing = await this.findByIdempotency(identity.tenantId, identity.subject, idempotencyKey);
      if (existing) return { ...existing, idempotentReplay: true };
    }
    const generated = generatePidFromInput(input);
    const projectId = `pmx_${randomUUID().replaceAll('-', '')}`;
    generated.pid.titleBlock.projectId = projectId;
    const now = new Date().toISOString();
    const project = { projectId, tenantId: identity.tenantId, ownerId: identity.subject, version: 1, createdAt: now, updatedAt: now, idempotencyHash: idempotencyKey ? hash(`${identity.subject}:${idempotencyKey}`) : null, pid: generated.pid, warnings: generated.warnings, documents: [] };
    await this.write(project);
    this.event(identity, projectId, 'project.created', 'success');
    return publicProject(project);
  }

  async generatePid(identity, input) {
    if (input.projectId) {
      const project = await this.getRaw(identity, input.projectId, 'write');
      const generated = generatePidFromInput(input);
      generated.pid.titleBlock.projectId = project.projectId;
      return this.update(identity, { projectId: project.projectId, expectedVersion: project.version, patch: generated.pid, replace: true });
    }
    const generated = generatePidFromInput(input);
    this.event(identity, null, 'pid.generated', 'success');
    return { canonicalFieldCount: 28, ...generated };
  }

  async get(identity, projectId) { return publicProject(await this.getRaw(identity, projectId, 'read')); }

  async update(identity, input) {
    const id = safeSegment(input.projectId, 'project identifier');
    return this.withLock(`${identity.tenantId}:${id}`, async () => {
      const current = await this.getRaw(identity, id, 'write');
      if (Number(input.expectedVersion) !== current.version) throw enterpriseError('VERSION_CONFLICT', 'Project version has changed; retrieve the latest version and retry.', 409, { currentVersion: current.version });
      const previous = structuredClone(current);
      const pid = input.replace ? normalizePid(input.patch) : normalizePid(deepMerge(current.pid, input.patch || {}));
      pid.titleBlock.projectId = current.projectId;
      const next = { ...current, version: current.version + 1, updatedAt: new Date().toISOString(), pid };
      await this.write(next, previous);
      this.event(identity, id, 'project.updated', 'success');
      return publicProject(next);
    });
  }

  async analyze(identity, projectId) {
    const project = await this.getRaw(identity, projectId, 'read');
    const pid = project.pid;
    const risks = identifyRisks(pid);
    const schedule = estimateSchedule(pid);
    return { projectId, version: project.version, summary: pid.executiveSummary, assumptions: pid.assumptions, issues: pid.issuesDecisionsLog, dependencies: pid.dependencies, risks, scheduleImplications: schedule, recommendations: [...(risks.some((r) => ['high', 'critical'].includes(r.severity)) ? ['Assign owners and due dates to high-severity risk mitigations.'] : []), ...(pid.openQuestionsNextSteps || []).map((x) => x.nextStep).filter(Boolean)] };
  }

  async risks(identity, projectId) { const project = await this.getRaw(identity, projectId, 'read'); this.event(identity, projectId, 'risk.analyzed', 'success'); return { projectId, version: project.version, risks: identifyRisks(project.pid) }; }
  async compliance(identity, projectId) { const project = await this.getRaw(identity, projectId, 'read'); this.event(identity, projectId, 'compliance.checked', 'success'); return { projectId, version: project.version, findings: complianceFindings(project.pid) }; }
  async gantt(identity, projectId) { const project = await this.getRaw(identity, projectId, 'read'); return { projectId, version: project.version, gantt: buildGantt(project.pid.workBreakdownTasks) }; }
  async schedule(identity, projectId) { const project = await this.getRaw(identity, projectId, 'read'); return { projectId, version: project.version, schedule: estimateSchedule(project.pid) }; }
  async cost(identity, projectId) { const project = await this.getRaw(identity, projectId, 'read'); return { projectId, version: project.version, cost: estimateCost(project.pid) }; }

  async compare(identity, projectId, fromVersion, toVersion) {
    const current = await this.getRaw(identity, projectId, 'read');
    const before = Number(fromVersion) === current.version ? current : await this.readVersion(identity.tenantId, projectId, fromVersion);
    const after = Number(toVersion) === current.version ? current : await this.readVersion(identity.tenantId, projectId, toVersion);
    if (!before || !after) throw enterpriseError('PROJECT_NOT_FOUND', 'Requested project version was not found.', 404);
    return { projectId, fromVersion: Number(fromVersion), toVersion: Number(toVersion), ...comparePids(before.pid, after.pid) };
  }

  async export(identity, projectId, format = 'json') {
    const project = await this.getRaw(identity, projectId, 'export');
    if (String(format).toLowerCase() !== 'json') throw enterpriseError('INVALID_EXPORT_FORMAT', 'Headless export currently supports JSON. GUI PDF, DOCX, SVG, PNG, and JPEG exports remain available.', 400, { supported: ['json'] });
    const content = JSON.stringify(publicProject(project), null, 2);
    this.event(identity, projectId, 'export.generated', 'success');
    return { projectId, format: 'json', mimeType: 'application/json', filename: `${projectId}.json`, sizeBytes: Buffer.byteLength(content), sha256: hash(content), contentBase64: Buffer.from(content).toString('base64') };
  }

  async search(identity, projectId, query, limit = 10) {
    const project = await this.getRaw(identity, projectId, 'read');
    const terms = String(query || '').toLowerCase().split(/\s+/).filter((x) => x.length > 2).slice(0, 12);
    if (!terms.length) throw enterpriseError('INVALID_INPUT', 'A meaningful search query is required.', 400);
    const records = flatten(project.pid).filter((row) => terms.some((term) => row.text.toLowerCase().includes(term))).slice(0, Math.min(Math.max(Number(limit) || 10, 1), 25));
    return { projectId, query, results: records.map((row) => ({ ...row, sourceType: 'supplied_project_data', confidence: 1 })) };
  }

  async getRaw(identity, projectId, action) {
    const id = safeSegment(projectId, 'project identifier');
    const project = await this.read(identity.tenantId, id);
    if (!project) throw enterpriseError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    authorizeProject(identity, project, action);
    this.event(identity, id, 'project.viewed', 'success');
    return project;
  }

  async findByIdempotency(tenantId, ownerId, key) {
    const dir = this.tenantDir(tenantId);
    let names = [];
    try { names = await fs.readdir(dir); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const target = hash(`${ownerId}:${key}`);
    for (const name of names.filter((item) => item.endsWith('.json'))) {
      const project = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
      if (project.idempotencyHash === target) return publicProject(project);
    }
    return null;
  }

  tenantDir(tenantId) { return path.join(this.dataDir, safeSegment(tenantId, 'tenant identifier')); }
  projectPath(tenantId, projectId) { return path.join(this.tenantDir(tenantId), `${safeSegment(projectId, 'project identifier')}.json`); }
  async read(tenantId, projectId) { try { return JSON.parse(await fs.readFile(this.projectPath(tenantId, projectId), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
  async readVersion(tenantId, projectId, version) { try { return JSON.parse(await fs.readFile(path.join(this.tenantDir(tenantId), '.versions', projectId, `${Number(version)}.json`), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
  async write(project, previous = null) {
    const dir = this.tenantDir(project.tenantId); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    if (previous) { const history = path.join(dir, '.versions', project.projectId); await fs.mkdir(history, { recursive: true, mode: 0o700 }); await atomicWrite(path.join(history, `${previous.version}.json`), previous); }
    await atomicWrite(this.projectPath(project.tenantId, project.projectId), project);
  }
  async withLock(key, fn) { const prior = this.locks.get(key) || Promise.resolve(); let release; const gate = new Promise((resolve) => { release = resolve; }); const current = prior.then(() => gate); this.locks.set(key, current); await prior; try { return await fn(); } finally { release(); if (this.locks.get(key) === current) this.locks.delete(key); } }
  event(identity, projectId, operation, outcome) { this.audit.info?.(JSON.stringify({ timestamp: new Date().toISOString(), eventType: 'pmomax.audit', requestId: identity.requestId || null, userId: identity.subject, tenantId: identity.tenantId, projectId, operation, outcome })); }
}

export function requireRole(identity, roles) { if (!identity || !roles.some((role) => identity.roles?.includes(role))) throw enterpriseError('AUTHORIZATION_FAILED', 'You do not have permission to perform this operation.', 403); }
function authorizeProject(identity, project, action) { if (project.tenantId !== identity.tenantId) throw enterpriseError('PROJECT_NOT_FOUND', 'Project was not found.', 404); if (identity.roles.includes('administrator') || identity.roles.includes('service_account')) return; if (project.ownerId === identity.subject) return; if (action === 'read' && identity.roles.includes('project_manager')) return; throw enterpriseError('AUTHORIZATION_FAILED', 'You do not have permission to perform this operation.', 403); }
const publicProject = (project) => ({ projectId: project.projectId, version: project.version, createdAt: project.createdAt, updatedAt: project.updatedAt, ownerId: project.ownerId, pid: project.pid, warnings: project.warnings || [], validation: { valid: true, canonicalFieldCount: 28 } });
const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
async function atomicWrite(file, value) { const temporary = `${file}.${randomUUID()}.tmp`; await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); await fs.rename(temporary, file); }
function deepMerge(base, patch) { if (Array.isArray(patch)) return structuredClone(patch); if (!patch || typeof patch !== 'object') return patch; const result = { ...(base && typeof base === 'object' ? base : {}) }; for (const [key, value] of Object.entries(patch)) { if (['__proto__', 'constructor', 'prototype'].includes(key)) continue; result[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(result[key], value) : structuredClone(value); } return result; }
function flatten(value, field = 'pid', output = []) { if (typeof value === 'string' && value.trim()) output.push({ field, text: value.slice(0, 4000) }); else if (Array.isArray(value)) value.forEach((item, index) => flatten(item, `${field}[${index}]`, output)); else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => flatten(item, `${field}.${key}`, output)); return output; }
