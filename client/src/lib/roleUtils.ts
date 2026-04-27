import type { UserRole } from '../types';

/**
 * Maps internal UserRole enum values to user-facing display strings.
 * Use this anywhere you render a role label — UserCard, profile pages, etc.
 *
 * 'USER'        → 'Employee'
 * 'ADMIN'       → 'Admin'
 * 'SUPER_ADMIN' → 'Super Admin'
 */
export function getDisplayRole(role: UserRole): string {
  switch (role) {
    case 'USER':        return 'Employee';
    case 'ADMIN':       return 'Admin';
    case 'SUPER_ADMIN': return 'Super Admin';
    default:            return role;
  }
}
