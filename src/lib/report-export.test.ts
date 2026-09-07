import { buildCertificatePdfDocument, buildReportCsv, buildSimplePdfDocument, createUsageEventSummary, type ReportExportRow } from './report-export';
import { captureUsageEvent, sanitizeEventPayload } from './observability';

describe('report export helpers', () => {
  it('serializes a report into a csv-safe string', () => {
    const rows: ReportExportRow[] = [
      { label: 'Turma', value: '3A' },
      { label: 'Aluno com e-mail', value: 'maria@example.com' },
      { label: 'Conclusão', value: '85%' },
    ];

    const csv = buildReportCsv(rows);

    expect(csv).toContain('Turma,3A');
    expect(csv).toContain('Aluno com e-mail,REDACTED_PERSONAL_DATA');
    expect(csv).toContain('Conclusão,85%');
  });

  it('summarizes usage events without personal payloads', () => {
    const payload = { event: 'report_exported', className: '3A', completed: true, email: 'maria@example.com' };

    const summary = createUsageEventSummary(payload);
    const sanitized = sanitizeEventPayload(payload);

    expect(summary).toContain('report_exported');
    expect(sanitized.email).toBe('REDACTED_PERSONAL_DATA');
    expect(sanitized.className).toBe('REDACTED_PERSONAL_DATA');
    expect(captureUsageEvent('report_exported', payload)).toEqual(expect.not.objectContaining({ className: '3A' }));
  });

  it('places the title and first row on different PDF lines', () => {
    const pdf = buildSimplePdfDocument('Resumo', [{ label: 'Turma', value: '3A' }]);
    expect(pdf).toContain('54 752 Td');
    expect(pdf).toContain('54 733 Td');
  });

  it('paginates large reports', () => {
    const pdf = buildSimplePdfDocument('Resumo', Array.from({ length: 80 }, (_, index) => ({ label: `Linha ${index}`, value: index })));
    expect(pdf).toContain('/Count 3');
  });

  it('draws a scannable QR matrix inside a certificate PDF', () => {
    const pdf = buildCertificatePdfDocument('Certificado', [{ label: 'Código', value: 'safe-code' }], 'celularsemmedo://certificate?code=safe-code');
    expect(pdf).toMatch(/re f/);
    expect((pdf.match(/ re f/g) ?? []).length).toBeGreaterThan(100);
    expect(pdf).toContain('Codigo: safe-code');
  });
});
