import { resolveMissionPresentation } from './presentation';

describe('mission presentation', () => {
  it('selects specialized renderers by stable mission id', () => {
    expect(resolveMissionPresentation('10000000-0000-4000-8000-000000000001')).toBe('whatsapp-photo');
    expect(resolveMissionPresentation('10000000-0000-4000-8000-000000000002')).toBe('pix');
    expect(resolveMissionPresentation('10000000-0000-4000-8000-00000000000a')).toBe('gov-br');
  });

  it('keeps new catalog missions on the data-driven renderer', () => {
    expect(resolveMissionPresentation('new-mission')).toBe('generic');
  });

  it('accepts an explicit renderer for a controlled generated session', () => {
    expect(resolveMissionPresentation('random-id', 'gov-br')).toBe('gov-br');
  });
});
