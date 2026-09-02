import { captureTechnicalError, configureObservability, sanitizeError } from './observability';

describe('privacy-safe observability', () => {
  afterEach(() => { configureObservability(null); delete process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED; });
  it('redacts personal data and credentials', () => {
    expect(sanitizeError(new Error('user pessoa@example.com failed'))).toBe('REDACTED_PERSONAL_DATA');
    expect(sanitizeError('Bearer abc token')).toBe('REDACTED_CREDENTIAL');
  });
  it('sends only the fixed technical contract when enabled', () => {
    process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED = 'true';
    const send = jest.fn(); configureObservability(send);
    const event = captureTechnicalError('backend.request_failed', 'timeout');
    expect(send).toHaveBeenCalledWith(event);
    expect(Object.keys(event).sort()).toEqual(['environment', 'errorCode', 'event', 'timestamp']);
  });
});
