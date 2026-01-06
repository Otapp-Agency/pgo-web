'use client'

import { useMemo } from 'react'
import { hasAnyPermission, getRolesPermissions } from '@/lib/auth/permissions'

interface UsePermissionOptions {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
}

/**
 * Unified hook to check user permissions
 * @param roles - Array of user roles
 * @param options - Permission options (permission, permissions, requireAll)
 * @param userType - Optional user type to validate roles against
 * @returns boolean indicating if user has the required permission(s)
 */
export function usePermission(
  roles: string[] | undefined,
  options: UsePermissionOptions | string,
  userType?: string | null
): boolean {
  return useMemo(() => {
    if (!roles || roles.length === 0) {
      return false
    }

    // Backward compatibility: if options is a string, treat it as permission
    const opts: UsePermissionOptions = typeof options === 'string' 
      ? { permission: options }
      : options

    // Single permission check
    if (opts.permission) {
      return hasAnyPermission(roles, opts.permission, userType)
    }

    // Multiple permissions check
    if (opts.permissions && opts.permissions.length > 0) {
      if (opts.requireAll) {
        return opts.permissions.every(permission => 
          hasAnyPermission(roles, permission, userType)
        )
      } else {
        return opts.permissions.some(permission => 
          hasAnyPermission(roles, permission, userType)
        )
      }
    }

    return false
  }, [roles, options, userType])
}

/**
 * Hook to get all permissions for user's roles
 * @param roles - Array of user roles
 * @param userType - Optional user type to validate roles against
 * @returns Array of permission strings
 */
export function usePermissions(roles: string[] | undefined, userType?: string | null): string[] {
  return useMemo(() => {
    if (!roles || roles.length === 0) {
      return []
    }
    return getRolesPermissions(roles, userType)
  }, [roles, userType])
}

// Backward compatibility exports
export function useAnyPermission(roles: string[] | undefined, permissions: string[], userType?: string | null): boolean {
  return usePermission(roles, { permissions }, userType)
}

export function useAllPermissions(roles: string[] | undefined, permissions: string[], userType?: string | null): boolean {
  return usePermission(roles, { permissions, requireAll: true }, userType)
}

