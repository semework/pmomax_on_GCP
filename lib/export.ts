
import { sanitizeUntrustedText, redactSecrets } from './security/promptDefense';

const sanitizePdfText = (value: any): string => {
  const raw = typeof value === 'string' ? value : value == null ? '' : String(value);
  const cleaned = sanitizeUntrustedText(raw).sanitized;
  const redacted = redactSecrets(cleaned);
  // Strip control chars that can break PDF text rendering
  return redacted.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');
};

const sanitizeNotesForExport = (notes: string): string => {
  const raw = sanitizePdfText(String(notes || '').trim());
  if (!raw) return '';
  // Keep exports readable: cap extremely long notes
  const MAX_CHARS = 1600;
  const MAX_LINES = 28;
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const limitedLines = lines.slice(0, MAX_LINES);
  let out = limitedLines.join('\n');
  if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS);
  const truncated = (lines.length > MAX_LINES) || (raw.length > MAX_CHARS);
  if (truncated) out = out.replace(/\s+$/,'') + '\n…';
  return out;
};

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  TableLayoutType,
  ImageRun,
} from 'docx';
import { PMOMaxPID } from '../types';
import {
  SECTION_ORDER,
  SECTION_TITLES,
  isPopulated,
  toGanttDataURL,
  TABLE_HEADERS,
} from './exportUtils';

/**
 * NOTE:
 * This file exports to PDF (jsPDF + autoTable), Word (docx), and JSON.
 * Key guarantees:
 * - Renders all populated PID sections in the same order as the app.
 * - Renders arrays of strings as bullet lists (scope, etc.).
 * - Renders array-of-object sections as tables.
 * - Embeds the Gantt image directly after Work Breakdown / Tasks.
 */

type PIDData = PMOMaxPID;

const isStringArray = (v: any): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

const formatInline = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return sanitizePdfText(v);
  if (typeof v === 'number' || typeof v === 'boolean') return sanitizePdfText(String(v));
  if (Array.isArray(v)) return sanitizePdfText(v.map(formatInline).filter(Boolean).join(', '));
  if (typeof v === 'object') {
    const totalCostUsd = (v as any).totalCostUsd ?? (v as any).total;
    const currency = (v as any).currency || 'USD';
    const notes = Array.isArray((v as any).notes)
      ? (v as any).notes
      : Array.isArray((v as any).assumptions)
      ? (v as any).assumptions
      : [];
    const subtotal = (v as any).subtotalByRoleUsd;
    if (totalCostUsd !== undefined && totalCostUsd !== null) {
      const totalVal =
        typeof totalCostUsd === 'number' && Number.isFinite(totalCostUsd)
          ? totalCostUsd.toLocaleString()
          : String(totalCostUsd);
      const totalLine = totalVal ? `Total: ${currency ? `${currency} ` : ''}${totalVal}`.trim() : '';
      const lines = [totalLine].filter(Boolean);
      if (subtotal && typeof subtotal === 'object') {
        const byRole = Object.entries(subtotal)
          .map(([role, val]) => `${role}: ${val}`)
          .join('; ');
        if (byRole) lines.push(`Subtotal by role: ${byRole}`);
      }
      if (notes.length) lines.push(`Notes: ${notes.map(formatInline).filter(Boolean).join('; ')}`);
      return sanitizePdfText(lines.filter(Boolean).join('\n'));
    }
    const name = (v as any).name || (v as any).fullName || (v as any).displayName;
    const role = (v as any).role || (v as any).title;
    const email = (v as any).email || (v as any).contact;
    if (name && role && email) return sanitizePdfText(`${name} — ${role} (${email})`);
    if (name && role) return sanitizePdfText(`${name} — ${role}`);
    if (name && email) return sanitizePdfText(`${name} (${email})`);
    if (name) return sanitizePdfText(String(name));
    try {
      return sanitizePdfText(JSON.stringify(v));
    } catch {
      return '[object]';
    }
  }
  try {
    return sanitizePdfText(String(v));
  } catch {
    return '[unstringifiable]';
  }
};


// --- PMOMax export normalization: ensure Risk + Compliance export under Governance when populated ---
// Some builds omit risks/compliance from SECTION_ORDER, so we inline them into governanceApprovals to guarantee export.
const withGovernanceRiskCompliance = (pid: any) => {
  const next = { ...(pid || {}) };
  const govKey = 'governanceApprovals';
  const gov = { ...(next[govKey] || {}) };

  // Risks: support arrays of objects or strings
  const risks = (next as any).risks;
  const hasRisks = Array.isArray(risks) ? risks.length > 0 : !!risks;
  if (hasRisks && !gov.risks) {
    gov.risks = risks;
  }

  // Compliance/Security/Privacy: support either key name
  const comp = (next as any).complianceSecurityPrivacy ?? (next as any).complianceAndSecurity ?? (next as any).compliance;
  const hasComp =
    Array.isArray(comp) ? comp.length > 0 :
    typeof comp === 'object' ? Object.keys(comp || {}).length > 0 :
    !!comp;

  if (hasComp && !gov.complianceSecurityPrivacy && !gov.complianceAndSecurity) {
    // Preserve original key if present; otherwise store in complianceSecurityPrivacy
    if ((next as any).complianceAndSecurity) gov.complianceAndSecurity = (next as any).complianceAndSecurity;
    else gov.complianceSecurityPrivacy = (next as any).complianceSecurityPrivacy ?? comp;
  }

  next[govKey] = gov;
  return next;
};

export async function exportToPdf(pid: PIDData, generalNotes: string) {
  const pidDataNorm = withGovernanceRiskCompliance(pid as any);

  // SSR / environment guard
  if (
    typeof window === 'undefined' ||
    !(window as any).jspdf ||
    !((window as any).jspdf as any).jsPDF
  ) {
    throw new Error(
      'PDF library (jsPDF) is not loaded or not available in this environment.'
    );
  }

  const { jsPDF } = (window as any).jspdf as any;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 56;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const title = sanitizePdfText(pid.titleBlock?.projectTitle || 'Project Initiation Document');
  const subtitle =
    sanitizePdfText(pid.titleBlock?.subtitle || 'Project Initiation Document');
  const generatedOn = sanitizePdfText(pid.titleBlock?.generatedOn || '');

  // --- Title Page (professional + concise) ---
  doc.setTextColor(20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(title, PAGE_WIDTH / 2, 140, {
    align: 'center',
    maxWidth: CONTENT_WIDTH,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(subtitle, PAGE_WIDTH / 2, 170, { align: 'center' });

  if (generatedOn) {
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Generated on: ${generatedOn}`, PAGE_WIDTH / 2, 196, {
      align: 'center',
    });
  }

  // Start content on a new page
  doc.addPage();
  let currentY = MARGIN;

  // Improved: Always leave at least 32pt at bottom, and add extra spacing between sections
  const checkAndAddPage = (requiredHeight: number) => {
    if (currentY + requiredHeight > PAGE_HEIGHT - MARGIN - 32) {
      doc.addPage();
      currentY = MARGIN;
    }
  };

  const addSectionHeader = (text: string) => {
    // Ensure the heading plus at least two lines of content fit on the page
    checkAndAddPage(48);
    if (currentY > MARGIN + 10) currentY += 10; // compact spacing between sections

    const headerHeight = 18;
    const barWidth = 6;
    const barTop = currentY - 4;
    const barHeight = headerHeight + 8;

    // Slim PMOMax gold bar to the left of the heading text (no full-width fill)
    doc.setFillColor(251, 191, 36); // amber-400 / gold
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(MARGIN - 2, barTop, barWidth, barHeight, 2, 2, 'F');

    // Heading text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(sanitizePdfText(text), MARGIN + barWidth + 6, currentY + headerHeight / 2);

    currentY = barTop + barHeight + 6;
  };

  const addSubHeader = (text: string) => {
    // Keep sub-headers visually tied to following content
    checkAndAddPage(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(80, 60, 20);
    doc.text(sanitizePdfText(text), MARGIN, currentY);
    currentY += 18;
  };

  const addBodyText = (text: string) => {
    if (!text) return;
    const trimmed = sanitizePdfText(text).trim();
    if (!trimmed) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40);

    const splitText = doc.splitTextToSize(trimmed, CONTENT_WIDTH);
    const textHeight = splitText.length * 14 + 8; // more vertical space per line
    checkAndAddPage(textHeight + 8);
    doc.text(splitText, MARGIN, currentY, { maxWidth: CONTENT_WIDTH });
    currentY += textHeight;
  };

  const addBullets = (items: string[]) => {
    const clean = items.map((s) => String(s || '').trim()).filter(Boolean);
    if (!clean.length) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40);

    for (const item of clean) {
      const bulletLine = `• ${item}`;
      const wrapped = doc.splitTextToSize(bulletLine, CONTENT_WIDTH);
      const h = wrapped.length * 14 + 2; // more vertical space per line
      checkAndAddPage(h + 2);
      doc.text(wrapped, MARGIN, currentY, { maxWidth: CONTENT_WIDTH });
      currentY += h;
    }
    currentY += 10;
  };

  const addTable = (head: any[], body: any[]) => {
    checkAndAddPage(40);

    (doc as any).autoTable({
      startY: currentY,
      head,
      body,
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: {
        // Compact, professional header row (dark slate with white text)
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      theme: 'grid',
      didDrawPage: (data: any) => {
        currentY = data.cursor.y;
      },
    });

    const lastAutoTable = (doc as any).lastAutoTable;
    if (lastAutoTable && lastAutoTable.finalY) {
      currentY = lastAutoTable.finalY + 18;
    } else {
      currentY += 18;
    }
  };

  const embedGanttIfAvailable = async () => {
    try {
      addSubHeader('Gantt Chart');
      const ganttDataUrl = await toGanttDataURL('png', 2.5);
      if (!ganttDataUrl) return;

      const imgProps = doc.getImageProperties(ganttDataUrl);
      const imgHeight = (imgProps.height * CONTENT_WIDTH) / imgProps.width;
      checkAndAddPage(imgHeight + 10);

      doc.addImage(
        ganttDataUrl,
        'PNG',
        MARGIN,
        currentY,
        CONTENT_WIDTH,
        imgHeight,
        undefined,
        'FAST'
      );
      currentY += imgHeight + 12;
    } catch (e) {
      console.error('Gantt add failed', e);
    }
  };

  for (const key of (Array.isArray(SECTION_ORDER) ? SECTION_ORDER : [])) {
    if (key === 'titleBlock') continue;
    const value = pid[key as keyof PIDData];
    const forceInclude = key === 'budgetCostBreakdown' || key === 'budgetSummary';
    if (!isPopulated(value) && !forceInclude) continue;

    const titleText = SECTION_TITLES[key as keyof PIDData] ?? key;
    addSectionHeader(titleText);

    // Strings -> body text
    if (typeof value === 'string') {
      addBodyText(value);
    }
    // Arrays of strings -> bullet list
    else if (isStringArray(value)) {
      // assumptions/constraints look better as a single-column table
      if (key === 'assumptions' || key === 'constraints') {
        const head = [[key === 'assumptions' ? 'Assumption' : 'Constraint']];
        const body = value.map((s) => [String(s)]);
        addTable(head, body);
      } else {
        addBullets(value);
      }
    }
    // Array-of-object -> table (if header mapping available)
    else if (Array.isArray(value) && value.length > 0 && TABLE_HEADERS[key]) {
      const headerMap = TABLE_HEADERS[key];
      const headerKeys = Object.keys(headerMap);
      const head = [headerKeys.map((k) => headerMap[k])];
      const body = value.map((item: any) =>
        headerKeys.map((k) => formatInline(item?.[k]))
      );
      addTable(head, body);
    }
    // Object -> best-effort inline rendering (avoid [object Object])
    else if (typeof value === 'object') {
      addBodyText(formatInline(value));
    }

    // Embed gantt immediately after work breakdown tasks
    if (key === 'workBreakdownTasks') {
      await embedGanttIfAvailable();
    }
  }

  // General Notes at end (kept concise)
  if (generalNotes && generalNotes.trim()) {
    addSectionHeader('General Notes');
    addBodyText(sanitizeNotesForExport(generalNotes));
  }

  doc.save(`${title}.pdf`);
}

const createDocxTable = (
  head: string[],
  rows: string[][],
  colWidths?: number[]
): Table => {
  const headerRow = new TableRow({
    children: head.map((h, idx) => {
      const w = colWidths?.[idx];
      return new TableCell({
        width: w ? { size: w, type: WidthType.DXA } : undefined,
        // Compact, professional header shading (dark slate)
        shading: { type: ShadingType.SOLID, color: '111827' },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 }),
            ],
          }),
        ],
      });
    }),
  });

  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((cell, idx) => {
          const w = colWidths?.[idx];
          return new TableCell({
            width: w ? { size: w, type: WidthType.DXA } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell || '', size: 20 })],
              }),
            ],
          });
        }),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9500, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
  });
};

const docxBullets = (items: string[]) =>
  items
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .map(
      (t) =>
        new Paragraph({
          text: t,
          bullet: { level: 0 },
        })
    );

const dataUrlToUint8 = async (dataUrl: string): Promise<Uint8Array> => {
  // data:*;base64,...
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
};

export async function exportToWord(
  pid: PMOMaxPID,
  generalNotes: string
): Promise<Blob> {
  const title =
    pid.titleBlock?.projectTitle || 'Project Initiation Document';
  const subtitle =
    pid.titleBlock?.subtitle || 'Project Initiation Document';
  const generatedOn = pid.titleBlock?.generatedOn || '';

  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(
    new Paragraph({
      text: title,
      style: 'Title',
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 200 },
    })
  );
  children.push(
    new Paragraph({
      text: subtitle,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );
  if (generatedOn) {
    children.push(
      new Paragraph({
        text: `Generated on: ${generatedOn}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    );
  } else {
    children.push(new Paragraph({ text: '', spacing: { after: 480 } }));
  }

  // Main sections (including Gantt)
  for (const key of (Array.isArray(SECTION_ORDER) ? SECTION_ORDER : [])) {
    if (key === 'titleBlock') continue;
    const value = pid[key as keyof PIDData];
    const forceInclude = key === 'budgetCostBreakdown' || key === 'budgetSummary';
    if (!isPopulated(value) && !forceInclude) continue;

    const titleText = SECTION_TITLES[key as keyof PIDData] ?? key;
    children.push(
      new Paragraph({
        text: titleText,
        heading: HeadingLevel.HEADING_1,
      })
    );

    if (typeof value === 'string') {
      value
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .forEach((line) => children.push(new Paragraph(line)));
    } else if (isStringArray(value)) {
      if (key === 'assumptions' || key === 'constraints') {
        const head = [key === 'assumptions' ? 'Assumption' : 'Constraint'];
        const rows = value.map((s) => [String(s)]);
        children.push(createDocxTable(head, rows, [9500]));
      } else {
        children.push(...docxBullets(value));
      }
    } else if (Array.isArray(value) && value.length > 0 && TABLE_HEADERS[key]) {
      const headerMap = TABLE_HEADERS[key];
      const headerKeys = Object.keys(headerMap);
      const head = headerKeys.map((k) => headerMap[k]);
      const rows = value.map((item: any) =>
        headerKeys.map((k) => formatInline(item?.[k]))
      );
      children.push(createDocxTable(head, rows));
    } else if (typeof value === 'object') {
      // Only output formatted text, not raw JSON blocks
      const text = formatInline(value);
      if (text && !text.trim().startsWith('{')) {
        children.push(new Paragraph(text));
      }
    }

    // (No Gantt embedding in Word export)

    children.push(new Paragraph(''));
  }

  // General Notes at end
  if (generalNotes && generalNotes.trim()) {
    children.push(
      new Paragraph({
        text: 'General Notes',
        heading: HeadingLevel.HEADING_1,
      })
    );
    generalNotes
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .forEach((line) => children.push(new Paragraph(line)));
  }

  const doc = new Document({
    sections: [{ children }],
    creator: 'PMOMax',
    title,
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 30, bold: true, color: '000000' },
          paragraph: {
            spacing: { before: 260, after: 80 },
            keepNext: true,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 24, bold: true, color: '4B3B15' },
          paragraph: {
            spacing: { before: 200, after: 60 },
            keepNext: true,
          },
        },
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: { size: 52, bold: true, color: 'FBBF24' },
        },
      ],
    },
  });

  const blob = await Packer.toBlob(doc);

  // Trigger download in browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  return blob;
}


/**
 * Export PID + general notes as a downloadable JSON file.
 * Matches the App.tsx call: exportToJson(pidData, generalNotes)
 */
export async function exportToJson(
  pid: PIDData,
  generalNotes: string
): Promise<void> {
  try {
    // SSR / environment guard
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('JSON export is only available in a browser environment.');
    }

    const payload = {
      pidData: pid,
      generalNotes,
      exportedAt: new Date().toISOString(),
      formatVersion: '1.0',
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${pid.titleBlock?.projectTitle || 'PMOMax_PID'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  } catch (err: any) {
    console.error('exportToJson failed:', err);
    if (typeof window !== 'undefined') {
      alert(
        'JSON export failed. Please try again or check the console for details.'
      );
    } else {
      throw err;
    }
  }
}
