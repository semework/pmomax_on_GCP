

import { validatePMOMaxPID } from './validatePMOMaxPID';
import type { PMOMaxPID } from '../types';
import { geminiParse } from './geminiParse';
import { localParse } from './localParser';

// Gemini enrichment prompt: only fix/normalize, do not re-extract
const GEMINI_ENRICH_PROMPT = `
You are a PMO data enrichment agent. Here is a structured project budget extracted via regex and heuristics. Fix any formatting errors, normalize the dates, and fill in missing justifications. Do not change the dollar amounts unless they are clearly malformed. Do not invent new fields. Only return a single JSON object, no markdown or prose.\n\nPARTIAL_JSON:\n<JSON_PLACEHOLDER>\n\nSOURCE_TEXT:\n<INPUT_PLACEHOLDER>`;

// Helper to inject the schema into the prompt

function getSchemaString(): string {
  // Only for prompt clarity; not used by Gemini for type enforcement
  return JSON.stringify({
    titleBlock: { projectTitle: '', subtitle: '', generatedOn: '' },
    executiveSummary: '',
    problemStatement: '',
    businessCaseExpectedValue: '',
    objectivesSmart: [{ objective: '', successMeasure: '' }],
    kpis: [{ kpi: '', baseline: '', target: '' }],
    scopeInclusions: [''],
    scopeExclusions: [''],
    assumptions: [{ assumption: '' }],
    constraints: [{ constraint: '' }],
    dependencies: [{ dependency: '', teamOrSystem: '', status: 'Pending' }],
    stakeholders: [{ name: '', role: '', contact: '' }],
    projectSponsor: { name: '', role: '' },
    projectManagerOwner: { name: '' },
    teamRaci: [{ teamMember: '', role: '', r: false, a: false, c: false, i: false }],
    timelineOverview: '',
    milestones: [{ milestone: '', targetDate: '' }],
    workBreakdownTasks: [{ name: '', start: '', end: '', owner: '', status: '', priority: '', kind: '', deps: '' }],
    gantt: { rows: [], dependencyEdges: [], canRender: true, reasonIfNotRenderable: null },
    budgetCostBreakdown: [{ task: '', role: '', estimatedHours: 0, rateUsdPerHour: 0, complexityMultiplier: 1, totalCostUsd: 0, justification: '', source: 'deterministic' }],
    budgetSummary: { currency: 'USD', totalCostUsd: 0, subtotalByRoleUsd: {}, notes: [] },
    resourcesTools: [{ resource: '', purpose: '' }],
    risks: [{ risk: '', probability: '', impact: '' }],
    mitigationsContingencies: [{ mitigation: '', contingency: '' }],
    issuesDecisionsLog: [{ issue: '', decision: '', owner: '', date: '' }],
    communicationPlan: [{ audience: '', cadence: '', channel: '' }],
    governanceApprovals: [{ gate: '', signOffRequirement: '' }],
    complianceSecurityPrivacy: [{ requirement: '', notes: '' }],
    openQuestionsNextSteps: [{ question: '', nextStep: '' }],
    notesBackground: ''
  }, null, 2);
}


async function parseData(inputData: { text: string }): Promise<PMOMaxPID | null> {
  if (!inputData?.text) return null;
  // Step 1: Deterministic/local parse (8s timeout)
  const localPromise = new Promise<any>((resolve) => {
    try {
      const det = localParse(inputData.text);
      if (det && det.parse_success && det.data) {
        resolve(det.data);
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });
  const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 8000));
  const detResult = await Promise.race([localPromise, timeoutPromise]);
  if (!detResult) return null;

  // Step 2: AI enrichment (8s timeout)
  const aiPromise = (async () => {
    const prompt = GEMINI_ENRICH_PROMPT
      .replace('<JSON_PLACEHOLDER>', JSON.stringify(detResult, null, 2))
      .replace('<INPUT_PLACEHOLDER>', inputData.text);
    try {
      const aiResult = await geminiParse(prompt);
      if (aiResult && typeof aiResult === 'object' && aiResult.titleBlock && aiResult.objectivesSmart) {
        return aiResult as PMOMaxPID;
      }
    } catch {}
    return null;
  })();
  const aiTimeout = new Promise<any>((resolve) => setTimeout(() => resolve(null), 8000));
  const aiResult = await Promise.race([aiPromise, aiTimeout]);

  // If AI enrichment succeeded, return it; else, return deterministic result
  if (aiResult) return aiResult;
  // Defensive: try to coerce detResult to PMOMaxPID shape
  if (detResult && typeof detResult === 'object') {
    return detResult as PMOMaxPID;
  }
  return null;
}

export async function handleParseSource(inputData: any, setParseError: (msg: string) => void) {
  try {
    const parsedData = await parseData(inputData);
    if (!parsedData) {
      setParseError('');
      return;
    }
    // Validate against canonical schema and rules
    const validationError = validatePMOMaxPID(parsedData);
    if (validationError) {
      setParseError(`${validationError.errorCode}: ${validationError.message}`);
      return;
    }
    return parsedData;
  } catch (err) {
    console.error('Parse Error:', err);
    setParseError('');
  }
}
