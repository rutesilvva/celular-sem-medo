import * as FileSystem from 'expo-file-system/legacy';

export { createUsageEventSummary, sanitizeEventPayload } from './observability';

export type ReportExportRow = {
  label: string;
  value: string | number;
};

export function sanitizeExportValue(value: string | number): string {
  const raw = String(value ?? '').trim();
  const text = raw.replace(/\r?\n/g, ' ').replace(/,/g, ';');
  if (/bearer|token|secret|password|authorization/i.test(text)) return 'REDACTED_CREDENTIAL';
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)) return 'REDACTED_PERSONAL_DATA';
  return text || '—';
}

export function buildReportCsv(rows: ReportExportRow[]): string {
  const lines = rows.map(({ label, value }) => `${sanitizeExportValue(label)},${sanitizeExportValue(value)}`);
  return ['label,value', ...lines].join('\n');
}

export function buildSimplePdfDocument(title: string, rows: ReportExportRow[]): string {
  const lines = rows.map((row, index) => `${index + 1}. ${sanitizeExportValue(row.label)}: ${sanitizeExportValue(row.value)}`);
  const contentLines = [sanitizeExportValue(title), ...lines].map((line, index) => `BT\n/F1 12 Tf\n72 ${760 - index * 18} Td\n(${escapePdfText(line)}) Tj\nET`);
  const content = contentLines.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export async function exportReportFiles(rows: ReportExportRow[], title: string, label = 'relatorio') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${label}-${stamp}`;
  const storageDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!storageDir) throw new Error('REPORT_STORAGE_UNAVAILABLE');
  const csvPath = `${storageDir}${baseName}.csv`;
  const pdfPath = `${storageDir}${baseName}.pdf`;

  await FileSystem.writeAsStringAsync(csvPath, buildReportCsv(rows), { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(pdfPath, buildSimplePdfDocument(title, rows), { encoding: FileSystem.EncodingType.UTF8 });

  return { csvPath, pdfPath };
}

export async function deleteReportFiles(paths: (string | null | undefined)[]) {
  await Promise.all(paths.filter((path): path is string => Boolean(path)).map(async (path) => {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }));
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
