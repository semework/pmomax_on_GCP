// lib/pidSchema.js
//
// Human-readable description of the PID schema that we pass to Gemini.
// The model is asked to return a single JSON object with these fields.

export const pidSchemaDescription = `
Return a single JSON object describing a Project Initiation Document (PID).
Do NOT wrap it in markdown or prose. No \`\`\` fences. Pure JSON only.

The top-level object may contain up to 28 fields:

{
  "title": string | null,
  "projectId": string | null,
  "executiveSummary": string | null,

  "objectives": string | string[] | null,
  "kpis": string | string[] | null,

  "scopeIn": string | string[] | null,
  "scopeOut": string | string[] | null,
  "assumptions": string | string[] | null,
  "constraints": string | string[] | null,

  "stakeholders": string | string[] | null,
  "sponsor": string | null,
  "projectManager": string | null,
  "team": string | string[] | null,
  "governance": string | string[] | null,

  "timelineOverview": string | null,
  "milestones": string | string[] | null,
  "deliverables": string | string[] | null,
  "dependencies": string | string[] | null,

  "budgetAndCost": {
    "summary": string | null,
    "capex": string | null,
    "opex": string | null,
    "other": string | null
  } | null,

  "resources": string | string[] | null,

  "risks": string | string[] | null,
  "mitigations": string | string[] | null,
  "issues": string | string[] | null,

  "communicationPlan": string | string[] | null,
  "changeControl": string | string[] | null,
  "acceptanceCriteria": string | string[] | null,
  "openQuestions": string | string[] | null,
  "notes": string | null
}

Rules:

1. Only populate fields that are clearly supported by the PID text.
   If the PID does not mention something, set that field to null or omit it.
   Never fabricate detailed numbers, owners, or dates.

2. \\"executiveSummary\\" should be a short paragraph (2–5 sentences) summarizing
   purpose, outcome, and value.

3. If the source text presents items as bullets, you may return them as an array
   of strings. The frontend will normalize both string and array shapes.

4. Lifetime/temporal information (phases, milestones) should go into
   "timelineOverview", "milestones", and "deliverables" where possible.

5. Return valid JSON. No comments, no trailing commas, no markdown formatting.
`;
