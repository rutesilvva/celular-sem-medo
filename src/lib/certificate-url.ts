export function buildCertificateVerificationUrl(code: string, publicBaseUrl = process.env.EXPO_PUBLIC_CERTIFICATE_VERIFY_URL) {
  const safeCode = encodeURIComponent(code);
  if (publicBaseUrl && /^https:\/\//i.test(publicBaseUrl)) return `${publicBaseUrl.replace(/\/$/, '')}/certificate?code=${safeCode}`;
  return `celularsemmedo://certificate?code=${safeCode}`;
}
