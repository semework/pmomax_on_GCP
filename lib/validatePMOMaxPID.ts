import type { PMOMaxPID } from '../types';

export type PIDValidationError = {
  errorCode: string;
  message: string;
};

const isPlainObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v: any) => typeof v === 'string';

const okStringOrUndef = (v: any) => v === undefined || v === null || isString(v);
const okArrayOrUndef = (v: any) => v === undefined || v === null || Array.isArray(v);
const okObjectOrUndef = (v: any) => v === undefined || v === null || isPlainObject(v);

/**
 * Returns null when the PID is safe to render.
 * Returns a structured error ONLY for malformed shapes that could break rendering.
 *
 * NOTE: This is intentionally lenient; missing/empty fields are allowed.
 */
export function validatePMOMaxPID(pid: any): PIDValidationError | null {
  const errors: string[] = [];

  if (!isPlainObject(pid)) {
    return { errorCode: 'INVALID_PID', message: 'Parsed PID is not an object.' };
  }

  // titleBlock is expected to exist, but don't fail hard if missing; only fail if wrong type.
  if (pid.titleBlock !== undefined && !okObjectOrUndef(pid.titleBlock)) {
    errors.push('titleBlock must be an object.');
  }

  if (isPlainObject(pid.titleBlock)) {
    if (!okStringOrUndef(pid.titleBlock.projectTitle)) errors.push('titleBlock.projectTitle must be a string.');
    if (!okStringOrUndef(pid.titleBlock.subtitle)) errors.push('titleBlock.subtitle must be a string.');
    if (!okStringOrUndef(pid.titleBlock.generatedOn)) errors.push('titleBlock.generatedOn must be a string.');
  }

  const stringFields = [
    'executiveSummary',
    'problemStatement',
    'businessCaseExpectedValue',
    'timelineOverview',
    'notesBackground',
    'businessCase',
    'resourcesPlan',
    'communicationsPlan',
  ];
  for (const k of stringFields) {
    if (!okStringOrUndef(pid[k])) errors.push(`${k} must be a string.`);
  }

  const arrayFields = [
    'objectivesSmart',
    'kpis',
    'scopeInclusions',
    'scopeExclusions',
    'assumptions',
    'constraints',
    'dependencies',
    'stakeholders',
    'teamRaci',
    'milestones',
    'workBreakdownTasks',
    'budgetCostBreakdown',
    'resourcesTools',
    'risks',
    'mitigationsContingencies',
    'issuesDecisionsLog',
    'communicationPlan',
    'governanceApprovals',
    'complianceSecurityPrivacy',
    'openQuestionsNextSteps',
    'deliverablesOutputs',
  ];
  for (const k of arrayFields) {
    if (!okArrayOrUndef(pid[k])) errors.push(`${k} must be an array.`);
  }

  const objectFields = ['projectSponsor', 'projectManagerOwner', 'budgetSummary', 'fields', 'tables'];
  for (const k of objectFields) {
    if (!okObjectOrUndef(pid[k])) errors.push(`${k} must be an object.`);
  }

  // Optional deeper checks for known nested objects (still lenient)
  if (isPlainObject(pid.projectSponsor)) {
    if (!okStringOrUndef(pid.projectSponsor.name)) errors.push('projectSponsor.name must be a string.');
    if (!okStringOrUndef(pid.projectSponsor.role)) errors.push('projectSponsor.role must be a string.');
  }
  if (isPlainObject(pid.projectManagerOwner)) {
    if (!okStringOrUndef(pid.projectManagerOwner.name)) errors.push('projectManagerOwner.name must be a string.');
  }

  return errors.length ? { errorCode: 'PID_VALIDATION', message: errors.join(' ') } : null;
}
