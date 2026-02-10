import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rows: Array<{ area: string; requirement: string; status: string; evidence: string; owner: string; target: string }> = [
  {
    area: 'Product Overview',
    requirement: 'Marketplace product description, use cases, and value props',
    status: '⧖',
    evidence: 'README and intro content in README.md',
    owner: 'Product Owner',
    target: '2026-01-15',
  },
  {
    area: 'Terms of Service',
    requirement: 'Public ToS aligned to Google Marketplace terms',
    status: '✓',
    evidence: 'TERMS.md',
    owner: 'Legal / PMO',
    target: 'N/A',
  },
  {
    area: 'Privacy Policy',
    requirement: 'Public privacy notice, data categories, retention, processors',
    status: '✓',
    evidence: 'PRIVACY.md',
    owner: 'Legal / DPO',
    target: 'N/A',
  },
  {
    area: 'Support Policy',
    requirement: 'Support channels, response targets, escalation paths',
    status: '✓',
    evidence: 'SUPPORT.md',
    owner: 'Support Lead',
    target: 'N/A',
  },
  {
    area: 'SLA',
    requirement: 'Documented availability & response SLAs',
    status: '✓',
    evidence: 'SLA.md',
    owner: 'SRE / PMO',
    target: 'N/A',
  },
  {
    area: 'Security & Vulnerabilities',
    requirement: 'Coordinated disclosure, vuln handling, patch timelines',
    status: '✓',
    evidence: 'VULNERABILITY_POLICY.md',
    owner: 'Security Lead',
    target: 'N/A',
  },
  {
    area: 'SBOM',
    requirement: 'SBOM generated for released images',
    status: '✓',
    evidence: 'sbom-pmo-architect-*.json',
    owner: 'Security Lead',
    target: 'N/A',
  },
  {
    area: 'Vulnerability Scans',
    requirement: 'Container image scanning with High/Critical gates',
    status: '✓',
    evidence: 'vuln-report-pmo-architect-*.json',
    owner: 'Security Lead',
    target: 'N/A',
  },
  {
    area: 'Data Handling & Compliance',
    requirement: 'Internal PMO/security compliance narrative for customers',
    status: '⧖',
    evidence: 'compliance_report.md; compliance_actions_progress.md',
    owner: 'Compliance Lead',
    target: '2026-01-20',
  },
  {
    area: 'Accessibility',
    requirement: 'Accessibility statement and known limitations',
    status: '⧖',
    evidence: 'ACCESSIBILITY.md',
    owner: 'UX / Eng',
    target: '2026-01-31',
  },
  {
    area: 'Documentation Bundle',
    requirement: 'Customer-facing docs bundle (PID, support, SLAs, etc.)',
    status: '⧖',
    evidence: 'Root docs and docs/ bundle',
    owner: 'Product Owner',
    target: '2026-02-01',
  },
  {
    area: 'Operational Runbook',
    requirement: 'On-call, incident response, rollback, change procedures',
    status: '□',
    evidence: 'Internal SRE / PMO runbook (TBD)',
    owner: 'SRE / PMO',
    target: '2026-02-15',
  },
  {
    area: 'Logging & Monitoring',
    requirement: 'Description of logs, metrics, alerting for Cloud Run service',
    status: '□',
    evidence: 'Cloud Logging dashboards and alerts (TBD)',
    owner: 'SRE',
    target: '2026-02-15',
  },
  {
    area: 'Data Residency & Backups',
    requirement: 'Data location, backups, restore objectives',
    status: '□',
    evidence: 'To be added to PRIVACY/SLA supplements',
    owner: 'DPO / SRE',
    target: '2026-02-29',
  },
  {
    area: 'Marketplace Onboarding Forms',
    requirement: 'All Google Marketplace questionnaires and forms completed',
    status: '□',
    evidence: 'Marketplace onboarding console (TBD)',
    owner: 'Product Owner',
    target: '2026-03-15',
  },
];

function cell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });
}

async function main() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Google Cloud Marketplace – PMOMax Compliance Checklist',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            text: 'Status table showing completed and remaining work items for Google Cloud Marketplace readiness.',
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell('Area', true),
                  cell('Requirement / Control', true),
                  cell('Status', true),
                  cell('Evidence / Link', true),
                  cell('Owner', true),
                  cell('Target Date', true),
                ],
              }),
              ...rows.map((r) =>
                new TableRow({
                  children: [
                    cell(r.area),
                    cell(r.requirement),
                    cell(r.status),
                    cell(r.evidence),
                    cell(r.owner),
                    cell(r.target),
                  ],
                }),
              ),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '..', 'docs', 'google-marketplace-compliance.docx');
  writeFileSync(outPath, buffer);
  // eslint-disable-next-line no-console
  console.log('Wrote', outPath);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate google-marketplace-compliance.docx', err);
  process.exitCode = 1;
});
