import { buildCertificateVerificationUrl } from './certificate-url';
describe('certificate verification URL', () => {
  it('prefers HTTPS', () => expect(buildCertificateVerificationUrl('abc', 'https://app.example.org/')).toBe('https://app.example.org/certificate?code=abc'));
  it('rejects HTTP', () => expect(buildCertificateVerificationUrl('abc', 'http://app.example.org')).toBe('celularsemmedo://certificate?code=abc'));
});
