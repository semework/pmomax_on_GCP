# PMOMax ISO/IEC 42001 Alignment Documentation Package

Version: v1.0  
Date: May 19, 2026  
Owner: Katalyst Street / PMOMax

## Purpose

This package provides buyer-facing documentation that explains how PMOMax Project Initiation Document (PID) outputs can support ISO/IEC 42001 AI Management System (AIMS) readiness as structured documented information and AI governance evidence.

This package is not a certification claim, not an open-source release, and not a new PMOMax product. It is compliance-positioning collateral for enterprise buyers, procurement teams, PMOs, risk teams, AI governance groups, and digital transformation leaders.

## Files

Source files:

- `assets/pmomax_logo.png` and `assets/katalyst_street_logo_dark.png` - local logo assets embedded in generated deliverables.
- `enterprise-pdf-template.html` - HTML/CSS print template used for the polished alignment guide PDF.
- `enterprise-executive-template.html` - HTML/CSS print template used for the polished executive summary PDF.
- `enterprise-pdf-header.tex` - retained legacy print styling from the first PDF generation pass.
- `pmomax-iso42001-docx-cover.md` - editable DOCX cover content used when regenerating the DOCX master.
- `pmomax-iso42001-alignment-guide.md` - main editable alignment guide.
- `pmomax-iso42001-crosswalk.csv` - editable crosswalk table.
- `pmomax-iso42001-disclaimer.md` - standalone disclaimer.
- `pmomax-iso42001-executive-summary.md` - one-page buyer summary.
- `pmomax-iso42001-website-blog.md` - website/blog-ready article.

Final files:

- `PMOMax_ISO_IEC_42001_Alignment_Guide.pdf`
- `PMOMax_ISO_IEC_42001_Alignment_Guide.docx`
- `PMOMax_ISO_IEC_42001_Executive_Summary.pdf`
- `PMOMax_ISO_IEC_42001_Crosswalk.csv`

## Safe Claims

PMOMax may safely state that:

- PMOMax can help organizations structure project initiation documentation that may support ISO/IEC 42001 AIMS evidence.
- PMOMax supports documentation around scope, objectives, ownership, risk, impact considerations, approvals, human oversight, governance gates, traceability, lifecycle planning, communications, and follow-up actions.
- PMOMax is a supporting documentation and governance workflow tool, not a certification tool.
- PMOMax PID outputs may be useful inputs for enterprise AI governance reviews, internal readiness programs, and discussions with qualified ISO/IEC 42001 professionals.

## Claims to Avoid

PMOMax must not claim that:

- PMOMax is ISO/IEC 42001 certified unless a separate certification has been formally obtained.
- PMOMax makes an organization ISO/IEC 42001 compliant.
- PMOMax replaces an AI Management System.
- PMOMax replaces auditors, lawyers, consultants, internal compliance teams, or certification bodies.
- PMOMax covers every ISO/IEC 42001 requirement.
- PMOMax outputs are official ISO evidence by themselves.
- This guide reproduces or interprets the full paid ISO/IEC 42001 standard.

## PMOMax Evidence Verified from Codebase

This package was written against verified PMOMax schema and product evidence in the local codebase, including:

- `types.ts`: canonical `PMOMaxPID` interface and `_auditMeta` / `_auditTrace` support.
- `README.md`: AI audit/traceability description and Marketplace package context.
- `lib/export.js`: export support for Word and JSON.
- UI copy in `components/LeftSidebar.tsx` and `components/MainContent.tsx`: Word / PDF / JSON export positioning.

Verified PID areas include title metadata, executive summary, problem statement, business case, SMART objectives, KPIs, scope inclusions/exclusions, assumptions, constraints, dependencies, stakeholders, sponsor, project owner, RACI, timeline, milestones, work breakdown tasks, budget, resources/tools, risks, mitigations/contingencies, issues and decisions log, communication plan, governance approvals, compliance/security/privacy notes, open questions, next steps, notes/background, and AI audit metadata/trace where configured.

## Source References

Use only public high-level references for framing:

- ISO/IEC 42001 official page: https://www.iso.org/standard/42001
- ISO 42001 explained: https://www.iso.org/home/insights-news/resources/iso-42001-explained-what-it-is.html
- ISO/IEC 42005 official page: https://www.iso.org/standard/42005
- ISO/IEC 23894 official page: https://www.iso.org/standard/77304.html

Do not reproduce paid ISO standard text. Avoid over-specific Annex A numbering unless independently verified from an authorized source.

## Regenerating Final Files

From the repository root:

```bash
pandoc docs/iso42001/pmomax-iso42001-docx-cover.md \
  docs/iso42001/pmomax-iso42001-alignment-guide.md \
  --from markdown+yaml_metadata_block \
  --resource-path=. \
  -o docs/iso42001/PMOMax_ISO_IEC_42001_Alignment_Guide.docx

pandoc -s --toc --number-sections \
  --from markdown+yaml_metadata_block \
  --resource-path=. \
  --template=docs/iso42001/enterprise-pdf-template.html \
  docs/iso42001/pmomax-iso42001-alignment-guide.md \
  -o docs/iso42001/PMOMax_ISO_IEC_42001_Alignment_Guide.html

pandoc docs/iso42001/pmomax-iso42001-executive-summary.md \
  --from markdown+yaml_metadata_block \
  --resource-path=. \
  --template=docs/iso42001/enterprise-executive-template.html \
  -o docs/iso42001/PMOMax_ISO_IEC_42001_Executive_Summary.html

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=docs/iso42001/PMOMax_ISO_IEC_42001_Alignment_Guide.pdf \
  file:///absolute/path/to/docs/iso42001/PMOMax_ISO_IEC_42001_Alignment_Guide.html

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=docs/iso42001/PMOMax_ISO_IEC_42001_Executive_Summary.pdf \
  file:///absolute/path/to/docs/iso42001/PMOMax_ISO_IEC_42001_Executive_Summary.html

cp docs/iso42001/pmomax-iso42001-crosswalk.csv \
  docs/iso42001/PMOMax_ISO_IEC_42001_Crosswalk.csv
```

If headless Chrome is unavailable, generate the DOCX first and use an approved local office conversion path. Avoid the default LaTeX PDF path for buyer-facing collateral unless the styling is reviewed, because it can look too academic for enterprise sales use.
