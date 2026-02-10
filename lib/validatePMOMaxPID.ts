// validatePMOMaxPID.ts
// Validator for canonical PMOMaxPID objects (28 fields, strict)
import { PMOMaxPID } from '../types';

export type PMOMaxPIDValidationError = {
  errorCode: string;
  message: string;
  field?: string;
};

// Reference minimums for completeness guards (update as needed)
const MIN_OBJECTIVES = 3;
const MIN_KPIS = 4;
const MIN_TASKS = 8;
const MAX_TASKS = 32;

// Example reference lengths for size guards (replace with actual PDF values)
const REFERENCE_FIELD_LENGTHS: Record<string, number> = {
  executiveSummary: 1200, // Example: update with real PDF field lengths
  problemStatement: 800,
  businessCaseExpectedValue: 1000,
  // ...add all string fields as needed
};

export function validatePMOMaxPID(data: PMOMaxPID): PMOMaxPIDValidationError | null {
  // 1. Size guards
  for (const [field, refLen] of Object.entries(REFERENCE_FIELD_LENGTHS)) {
    const val = (data as any)[field];
    if (typeof val === 'string' && val.length > 2 * refLen) {
      return {
        errorCode: 'FIELD_TOO_LARGE',
        message: `Field '${field}' is abnormally large; aborting to prevent UI overload.`,
        field,
      };
    }
  }

  // 2. Completeness guards
  if (!data.titleBlock?.projectTitle || !data.titleBlock?.subtitle || !data.titleBlock?.generatedOn) {
    return {
      errorCode: 'MISSING_OR_UNDERPOPULATED_SECTION',
      message: 'Missing required title block fields.',
      field: 'titleBlock',
    };
  }
  if (!data.executiveSummary || !data.problemStatement || !data.businessCaseExpectedValue) {
    return {
      errorCode: 'MISSING_OR_UNDERPOPULATED_SECTION',
      message: 'Missing required summary/problem/business case.',
    };
  }
  if (!Array.isArray(data.objectivesSmart) || data.objectivesSmart.length < MIN_OBJECTIVES) {
    return {
      errorCode: 'MISSING_OR_UNDERPOPULATED_SECTION',
      message: 'Too few objectives — minimum of 3 required.',
      field: 'objectivesSmart',
    };
  }
  if (!Array.isArray(data.kpis) || data.kpis.length < MIN_KPIS) {
    return {
      errorCode: 'MISSING_OR_UNDERPOPULATED_SECTION',
      message: 'Too few KPIs — minimum of 4 required.',
      field: 'kpis',
    };
  }
  if (!Array.isArray(data.workBreakdownTasks) || data.workBreakdownTasks.length < MIN_TASKS) {
    return {
      errorCode: 'MISSING_OR_UNDERPOPULATED_SECTION',
      message: 'Too few tasks — minimum of 8 required for Gantt chart!',
      field: 'workBreakdownTasks',
    };
  }

  // 3. Gantt renderability guards
  if (!data.gantt || !Array.isArray(data.gantt.rows) || data.gantt.rows.length === 0) {
    return {
      errorCode: 'GANTT_NOT_RENDERABLE',
      message: 'Gantt cannot be plotted due to missing/invalid rows.',
      field: 'gantt',
    };
  }
  for (const row of data.gantt.rows) {
    if (!row.start || !row.end) {
      return {
        errorCode: 'GANTT_NOT_RENDERABLE',
        message: 'Gantt cannot be plotted due to missing/invalid dates.',
        field: 'gantt',
      };
    }
  }

  // 4. Performance guards (cap tasks at 32)
  if (data.workBreakdownTasks.length > MAX_TASKS) {
    // Truncate in parser, but validator can flag
    return {
      errorCode: 'TASKS_TOO_MANY',
      message: 'Too many tasks — maximum of 32 allowed.',
      field: 'workBreakdownTasks',
    };
  }

  // 5. Table shape/column checks (optional: add as needed)
  // ...

  // All checks passed
  return null;
}
