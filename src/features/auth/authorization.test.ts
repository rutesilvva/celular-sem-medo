import { canAccessRole, canSelectRole } from './authorization';

describe('authorization guards', () => {
  test.each(['bootstrapping', 'anonymous', 'refreshing'] as const)('nega rotas protegidas durante %s', (status) => {
    expect(canAccessRole(status, 'monitor', 'monitor')).toBe(false);
  });

  it('permite somente a rota do papel ativo', () => {
    expect(canAccessRole('authenticated', 'participant', 'participant')).toBe(true);
    expect(canAccessRole('authenticated', 'participant', 'monitor')).toBe(false);
    expect(canAccessRole('authenticated', 'participant', 'admin')).toBe(false);
  });

  it('não aceita papel forjado pelo cliente', () => {
    expect(canSelectRole('authenticated', ['participant'], 'monitor')).toBe(false);
    expect(canSelectRole('authenticated', ['participant', 'monitor'], 'monitor')).toBe(true);
    expect(canSelectRole('anonymous', ['monitor'], 'monitor')).toBe(false);
  });
});
