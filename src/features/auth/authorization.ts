import type { Role } from '@/context/AppContext';
import type { AuthStatus } from '@/context/AuthContext';

export function canAccessRole(status: AuthStatus, sessionRole: Role | null, requiredRole: Role) {
  return status === 'authenticated' && sessionRole === requiredRole;
}

export function canSelectRole(status: AuthStatus, availableRoles: readonly Role[], requestedRole: Role) {
  return status === 'authenticated' && availableRoles.includes(requestedRole);
}
