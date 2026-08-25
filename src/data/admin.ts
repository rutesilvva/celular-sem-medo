export type ManagedUserRole = 'participant' | 'monitor' | 'admin';

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  scope: string;
  currentUser?: boolean;
};

export const initialManagedUsers: ManagedUser[] = [
  { id: 'admin-patricia', name: 'Patrícia Souza', email: 'patricia@exemplo.com', role: 'admin', scope: 'Acesso global', currentUser: true },
  { id: 'admin-rafael', name: 'Rafael Lima', email: 'rafael@exemplo.com', role: 'admin', scope: 'Acesso global' },
  { id: 'monitor-helena', name: 'Helena Martins', email: 'helena@exemplo.com', role: 'monitor', scope: 'Turma Conectados' },
  { id: 'participant-example', name: 'Participante de exemplo', email: 'participante@exemplo.com', role: 'participant', scope: 'Turma Conectados' },
  { id: 'participant-joao', name: 'João Pereira', email: 'joao@exemplo.com', role: 'participant', scope: 'Turma Conectados' },
];

export const managedClasses = [
  { id: 'conectados', name: 'Turma Conectados', monitor: 'Helena Martins', participants: 3, status: 'Ativa' },
  { id: 'primeiros-passos', name: 'Primeiros Passos', monitor: 'Sem monitor', participants: 0, status: 'Preparação' },
];
