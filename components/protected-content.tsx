'use client'

import { ReactNode } from 'react'
import { usePermission, useAnyPermission, useAllPermissions } from '@/hooks/use-permission'

interface ProtectedContentProps {
  roles?: string[]
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Component that conditionally renders content based on user permissions
 * 
 * @example
 * // Single permission check
 * <ProtectedContent roles={user.roles} permission="users.create">
 *   <CreateUserButton />
 * </ProtectedContent>
 * 
 * @example
 * // Multiple permissions (any)
 * <ProtectedContent roles={user.roles} permissions={["users.create", "users.update"]}>
 *   <UserActions />
 * </ProtectedContent>
 * 
 * @example
 * // Multiple permissions (all required)
 * <ProtectedContent roles={user.roles} permissions={["users.view", "users.update"]} requireAll>
 *   <AdvancedUserEditor />
 * </ProtectedContent>
 */
export function ProtectedContent({
  roles,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: ProtectedContentProps) {
  // Call all hooks unconditionally to satisfy React Hook rules
  const singlePermissionAccess = usePermission(roles, permission || '')
  const anyPermissionAccess = useAnyPermission(roles, permissions || [])
  const allPermissionsAccess = useAllPermissions(roles, permissions || [])

  // Determine access based on props
  let hasAccess = false
  if (permission) {
    hasAccess = singlePermissionAccess
  } else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = allPermissionsAccess
    } else {
      hasAccess = anyPermissionAccess
    }
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

