import { canAccessRole, canSelectRole } from './authorization';

describe('authorization guards', () => {
  test.each(['bootstrapping', 'anonymous', 'refreshing'] as const)('nega rotas protegidas durante %s', (status) => {
    expect(canAccessRole(status, 'admin', 'admin')).toBe(false);
  });

  it('permite somente a rota do papel ativo', () => {
    expect(canAccessRole('authenticated', 'participant', 'participant')).toBe(true);
    expect(canAccessRole('authenticated', 'participant', 'admin')).toBe(false);
    expect(canAccessRole('authenticated', 'participant', 'admin')).toBe(false);
  });

  it('não aceita papel forjado pelo cliente', () => {
    expect(canSelectRole('authenticated', ['participant'], 'admin')).toBe(false);
    expect(canSelectRole('authenticated', ['participant', 'admin'], 'admin')).toBe(true);
    expect(canSelectRole('anonymous', ['admin'], 'admin')).toBe(false);
  });
});
