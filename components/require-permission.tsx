'use client'

import { ReactNode } from 'react'
import { usePermission, useAnyPermission, useAllPermissions } from '@/hooks/use-permission'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RequirePermissionProps {
  roles?: string[]
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
  showError?: boolean
  errorMessage?: string
  children: ReactNode
}

/**
 * Component that renders children only if user has required permissions
 * Shows error message if permission is denied (when showError is true)
 * 
 * @example
 * // Single permission with error message
 * <RequirePermission roles={user.roles} permission="users.create" showError>
 *   <CreateUserForm />
 * </RequirePermission>
 * 
 * @example
 * // Multiple permissions with custom error
 * <RequirePermission 
 *   roles={user.roles} 
 *   permissions={["users.view", "users.update"]} 
 *   requireAll
 *   showError
 *   errorMessage="You need both view and update permissions"
 * >
 *   <UserEditor />
 * </RequirePermission>
 */
export function RequirePermission({
  roles,
  permission,
  permissions,
  requireAll = false,
  showError = false,
  errorMessage = 'You do not have permission to access this content.',
  fallback,
  children,
}: RequirePermissionProps) {

  // Call all hooks unconditionally to satisfy React Hook rules
  const singlePermissionAccess = usePermission(roles, permission || '')
  const anyPermissionAccess = useAnyPermission(roles, permissions || [])
  const allPermissionsAccess = useAllPermissions(roles, permissions || [])

  if (!singlePermissionAccess && !anyPermissionAccess && !allPermissionsAccess) {
    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )
    }
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

