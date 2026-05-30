import { useAuth } from './useAuth'
import { usePermissionOverrides } from './usePermissionOverrides'
import { can, canEditRolePermissions, canSetLocked, CREATION_RULES } from '../lib/permissions'
import type { Role } from '../lib/permissions'

export function usePermissions() {
  const { user } = useAuth()
  const { overrides } = usePermissionOverrides()
  const role = (user?.role ?? '') as Role

  return {
    can: (resource: string, action: string) =>
      can(role, resource, action, overrides),
    canCreateEmployee: (targetRole: string) =>
      (CREATION_RULES[role] ?? []).includes(targetRole as Role),
    canEditRolePermissions: (targetRole: string) =>
      canEditRolePermissions(role, targetRole as Role),
    canSetLocked: canSetLocked(role),
    isTechnical: role === 'technical',
    role,
  }
}
