'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/hooks/use-permission'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PermissionProps {
  roles?: string[]
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  userType?: string | null
  fallback?: ReactNode
  showError?: boolean
  errorMessage?: string
  children: ReactNode
}

/**
 * Unified component that conditionally renders content based on user permissions
 * Combines functionality of RequirePermission and ProtectedContent
 * 
 * @example
 * // Single permission check
 * <Permission roles={user.roles} permission="users.create">
 *   <CreateUserButton />
 * </Permission>
 * 
 * @example
 * // Multiple permissions (any)
 * <Permission roles={user.roles} permissions={["users.create", "users.update"]}>
 *   <UserActions />
 * </Permission>
 * 
 * @example
 * // Multiple permissions (all required)
 * <Permission roles={user.roles} permissions={["users.view", "users.update"]} requireAll>
 *   <AdvancedUserEditor />
 * </Permission>
 * 
 * @example
 * // With error message
 * <Permission roles={user.roles} permission="users.create" showError>
 *   <CreateUserForm />
 * </Permission>
 */
export function Permission({
  roles,
  permission,
  permissions,
  requireAll = false,
  userType,
  showError = false,
  errorMessage = 'You do not have permission to access this content.',
  fallback,
  children,
}: PermissionProps) {
  // Determine which permission check to use
  const options = permission 
    ? { permission }
    : permissions && permissions.length > 0
    ? { permissions, requireAll }
    : { permission: '' } // Default to empty string to satisfy hook call

  // Hook must be called unconditionally
  const hasAccess = usePermission(roles, options, userType)

  if (!hasAccess) {
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

