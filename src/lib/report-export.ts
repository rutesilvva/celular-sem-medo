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
  const pageLines = chunk([sanitizeExportValue(title), ...lines], 36);
  const fontId = 3 + pageLines.length * 2;
  const pageIds = pageLines.map((_, index) => 3 + index * 2);
  const objects = new Map<number, string>();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  pageLines.forEach((page, pageIndex) => {
    const pageId = pageIds[pageIndex]!;
    const contentId = pageId + 1;
    const content = page.map((line, lineIndex) => `BT\n/F1 ${lineIndex === 0 && pageIndex === 0 ? 16 : 11} Tf\n54 ${752 - lineIndex * 19} Td\n(${escapePdfText(toPdfText(line))}) Tj\nET`).join('\n');
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);
    objects.set(contentId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.set(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export async function exportReportFiles(rows: ReportExportRow[], title: string, label = 'relatorio') {
  await purgeExpiredReportFiles();
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

export async function purgeExpiredReportFiles(maximumAgeMs = 24 * 60 * 60 * 1000) {
  const directory = FileSystem.cacheDirectory;
  if (!directory) return;
  const entries = await FileSystem.readDirectoryAsync(directory);
  const now = Date.now();
  await Promise.all(entries.filter((name) => /^(relatorio|report)-.*\.(csv|pdf)$/i.test(name)).map(async (name) => {
    const path = `${directory}${name}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && typeof info.modificationTime === 'number' && now - info.modificationTime * 1000 > maximumAgeMs) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }));
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

function toPdfText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');
}

function chunk<T>(values: T[], size: number): T[][] {
  return Array.from({ length: Math.max(1, Math.ceil(values.length / size)) }, (_, index) => values.slice(index * size, (index + 1) * size));
}
