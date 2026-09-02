import { pickPrimaryClassContext } from './useClassData';

describe('pickPrimaryClassContext', () => {
  it('prefers the most recently joined active class when multiple classes exist', () => {
    const contexts = [
      { class_id: 'old', class_name: 'Turma Antiga', joined_at: '2025-01-01T00:00:00Z', access_role: 'participant' },
      { class_id: 'new', class_name: 'Turma Atual', joined_at: '2026-01-15T00:00:00Z', access_role: 'participant' },
    ] as any[];

    expect(pickPrimaryClassContext(contexts)?.class_id).toBe('new');
  });

  it('keeps a deterministic fallback when joined_at is missing', () => {
    const contexts = [
      { class_id: 'b', class_name: 'Turma B', joined_at: null, access_role: 'participant' },
      { class_id: 'a', class_name: 'Turma A', joined_at: null, access_role: 'participant' },
    ] as any[];

    expect(pickPrimaryClassContext(contexts)?.class_id).toBe('a');
  });
});
