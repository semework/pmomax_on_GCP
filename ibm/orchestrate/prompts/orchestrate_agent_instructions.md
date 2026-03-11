# PMOMax Orchestrate Agent Instructions

## 1) Create a Custom Tool (OpenAPI)
1. Open watsonx Orchestrate.
2. Go to Tools > Create Tool > OpenAPI.
3. Upload the OpenAPI spec: ibm/orchestrate/pmomax.openapi.yaml.
4. Set the server URL to your PMOMax deployment (IKS/ROKS route or ingress).
5. Save and publish the tool (e.g., name it “PMOMax API”).

## 2) Agent: PMOMax Parser (tool-first)
**Goal:** Parse files/text into structured PID fields and identify gaps.

**Instructions:**
- Always call the tool endpoint POST /api/orch/parse.
- Provide either extracted text (from files) or pasted content.
- Return:
  1) A short summary paragraph.
  2) A JSON table section of key fields (objectives, milestones, tasks, risks).
  3) URLs to assets (gantt and export links if present).

**Example prompt:**
“Parse the attached project brief and return a structured PID summary.”

## 3) Agent: PMOMax Creator (tool-first)
**Goal:** Create a PID from a prompt and return a Gantt URL and export link.

**Instructions:**
- Call POST /api/orch/create with a concise project prompt.
- After the response, optionally call POST /api/orch/export to produce a DOCX link.
- Return:
  1) A short summary paragraph.
  2) A JSON table section of key fields (objectives, milestones, tasks, risks).
  3) URLs to gantt/export assets.

**Example prompt:**
“Create a PID for a 90-day CRM migration with 2 engineering teams and a Q3 launch.”

## 4) Rendering results in Orchestrate UI
- Always return a short summary paragraph first.
- Provide a table-like JSON section, for example:
  {
    "objectives": [...],
    "milestones": [...],
    "tasks": [...],
    "risks": [...]
  }
- Provide URLs as plain links so Orchestrate can render them:
  - assets.gantt_png_url
  - assets.export_docx_url

## 5) Notes
- Orchestrate does not render the PMOMax SPA; use the API responses for structured output.
- The assets are served from /assets/gantt and /assets/exports on the PMOMax host.
