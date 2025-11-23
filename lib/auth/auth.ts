import 'server-only'

import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/dal'
import { hasPermission, hasAnyPermission, hasAllPermissions, getRolesPermissions } from '@/lib/auth/permissions'

/**
 * Check if the current user has a specific permission
 * Returns boolean without throwing
 * @param permission - The permission to check (e.g., 'users.create')
 * @returns true if user has permission, false otherwise
 */
export async function checkPermission(permission: string): Promise<boolean> {
  try {
    const session = await verifySession()
    if (!session?.roles || session.roles.length === 0) {
      return false
    }
    return hasAnyPermission(session.roles, permission)
  } catch {
    return false
  }
}

/**
 * Require a specific permission - throws/redirects if user doesn't have it
 * Use in Server Components and Server Actions
 * @param permission - The permission to check
 * @throws redirects to login if not authenticated
 * @throws redirects to unauthorized page if permission denied
 */
export async function requirePermission(permission: string): Promise<void> {
  const session = await verifySession()
  
  if (!session?.roles || session.roles.length === 0) {
    redirect('/unauthorized')
  }
  
  const hasAccess = hasAnyPermission(session.roles, permission)
  
  if (!hasAccess) {
    redirect('/unauthorized')
  }
}

/**
 * Require any of the provided permissions (OR logic)
 * User needs at least one of the permissions
 * @param permissions - Array of permissions to check
 */
export async function requireAnyPermission(permissions: string[]): Promise<void> {
  const session = await verifySession()
  
  if (!session?.roles || session.roles.length === 0) {
    redirect('/unauthorized')
  }
  
  const hasAccess = permissions.some(permission => 
    hasAnyPermission(session.roles, permission)
  )
  
  if (!hasAccess) {
    redirect('/unauthorized')
  }
}

/**
 * Require all of the provided permissions (AND logic)
 * User needs all permissions
 * @param permissions - Array of permissions to check
 */
export async function requireAllPermissions(permissions: string[]): Promise<void> {
  const session = await verifySession()
  
  if (!session?.roles || session.roles.length === 0) {
    redirect('/unauthorized')
  }
  
  const hasAccess = permissions.every(permission => 
    hasAnyPermission(session.roles, permission)
  )
  
  if (!hasAccess) {
    redirect('/unauthorized')
  }
}

/**
 * Get current user's permissions based on their roles
 * @returns Array of permission strings
 */
export async function getCurrentUserPermissions(): Promise<string[]> {
  try {
    const session = await verifySession()
    if (!session?.roles || session.roles.length === 0) {
      return []
    }
    return getRolesPermissions(session.roles)
  } catch {
    return []
  }
}

/**
 * Check if current user has any of the provided permissions
 * @param permissions - Array of permissions to check
 * @returns true if user has at least one permission
 */
export async function checkAnyPermission(permissions: string[]): Promise<boolean> {
  try {
    const session = await verifySession()
    if (!session?.roles || session.roles.length === 0) {
      return false
    }
    return permissions.some(permission => 
      hasAnyPermission(session.roles, permission)
    )
  } catch {
    return false
  }
}

/**
 * Check if current user has all of the provided permissions
 * @param permissions - Array of permissions to check
 * @returns true if user has all permissions
 */
export async function checkAllPermissions(permissions: string[]): Promise<boolean> {
  try {
    const session = await verifySession()
    if (!session?.roles || session.roles.length === 0) {
      return false
    }
    return permissions.every(permission => 
      hasAnyPermission(session.roles, permission)
    )
  } catch {
    return false
  }
}

