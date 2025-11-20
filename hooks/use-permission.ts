'use client'

import { useMemo } from 'react'
import { hasPermission, hasAnyPermission, hasAllPermissions, getRolesPermissions } from '@/lib/permissions'

/**
 * Hook to check if user has a specific permission
 * @param roles - Array of user roles
 * @param permission - Permission to check
 * @returns boolean indicating if user has the permission
 */
export function usePermission(roles: string[] | undefined, permission: string): boolean {
    return useMemo(() => {
        if (!roles || roles.length === 0) {
            return false
        }
        return hasAnyPermission(roles, permission)
    }, [roles, permission])
}

/**
 * Hook to check if user has any of the provided permissions
 * @param roles - Array of user roles
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has at least one permission
 */
export function useAnyPermission(roles: string[] | undefined, permissions: string[]): boolean {
    return useMemo(() => {
        if (!roles || roles.length === 0 || permissions.length === 0) {
            return false
        }
        return permissions.some(permission => hasAnyPermission(roles, permission))
    }, [roles, permissions])
}

/**
 * Hook to check if user has all of the provided permissions
 * @param roles - Array of user roles
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has all permissions
 */
export function useAllPermissions(roles: string[] | undefined, permissions: string[]): boolean {
    return useMemo(() => {
        if (!roles || roles.length === 0 || permissions.length === 0) {
            return false
        }
        return permissions.every(permission => hasAnyPermission(roles, permission))
    }, [roles, permissions])
}

/**
 * Hook to get all permissions for user's roles
 * @param roles - Array of user roles
 * @returns Array of permission strings
 */
export function usePermissions(roles: string[] | undefined): string[] {
    return useMemo(() => {
        if (!roles || roles.length === 0) {
            return []
        }
        return getRolesPermissions(roles)
    }, [roles])
}

