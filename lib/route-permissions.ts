/**
 * Route Permission Mapping
 * Maps routes to required permissions for authorization checks
 */

import { menuConfig } from './menu-config'
import { PERMISSIONS } from './auth/permissions'

/**
 * Route Permission Configuration
 * Defines permission requirements for routes
 */
export interface RoutePermissionConfig {
    permission?: string        // Single permission check
    permissions?: string[]     // Multiple permissions (OR logic)
    requireAll?: boolean       // If true, requires ALL permissions (AND logic)
    requiresAuthOnly?: boolean // If true, only requires authentication (no specific permission)
}

/**
 * Route to permission mapping
 * Routes not listed here default to requiring authentication only
 */
const routePermissions: Record<string, RoutePermissionConfig> = {}

// Extract route permissions from menu config
menuConfig.navMain.forEach(item => {
    if (item.url && item.url !== '#') {
        routePermissions[item.url] = {
            permission: item.permission,
            permissions: item.permissions,
            requireAll: item.requireAll,
        }
    }
})

// Add additional routes not in menu config
routePermissions['/payment-gateways'] = {
    permission: PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
}

routePermissions['/change-password'] = {
    requiresAuthOnly: true, // Requires authentication but no specific permission
}

routePermissions['/unauthorized'] = {
    requiresAuthOnly: true, // Always accessible to authenticated users
}

/**
 * Normalize route path by removing dynamic segments
 * Example: /merchants/abc123 -> /merchants
 * Example: /transactions/123 -> /transactions
 */
function normalizeRoute(path: string): string {
    // Remove trailing slashes
    let normalized = path.replace(/\/$/, '')

    // Split by '/' and filter out dynamic segments (UUIDs, IDs, etc.)
    const segments = normalized.split('/').filter(Boolean)

    // If path has more than one segment, check if last segment looks like an ID/UUID
    if (segments.length > 1) {
        const lastSegment = segments[segments.length - 1]

        // Check if last segment is likely a dynamic parameter (UUID, numeric ID, etc.)
        // UUID format: 8-4-4-4-12 hex characters
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        // Numeric ID pattern
        const numericIdPattern = /^\d+$/
        // Alphanumeric ID pattern (common for UIDs)
        const alphanumericIdPattern = /^[a-z0-9]+$/i

        if (
            uuidPattern.test(lastSegment) ||
            numericIdPattern.test(lastSegment) ||
            (alphanumericIdPattern.test(lastSegment) && lastSegment.length > 10)
        ) {
            // Remove the last segment (dynamic parameter)
            segments.pop()
            normalized = '/' + segments.join('/')
        }
    }

    return normalized || '/'
}

/**
 * Get permission configuration for a route
 * @param path - The route path (e.g., '/merchants/abc123' or '/dashboard')
 * @returns RoutePermissionConfig or null if route doesn't require specific permissions
 */
export function getRoutePermission(path: string): RoutePermissionConfig | null {
    // Normalize the path to handle dynamic routes
    const normalizedPath = normalizeRoute(path)

    // Check exact match first
    if (routePermissions[normalizedPath]) {
        return routePermissions[normalizedPath]
    }

    // Check original path (for routes that might not need normalization)
    if (routePermissions[path]) {
        return routePermissions[path]
    }

    // Return null - route doesn't have specific permission requirements
    // (will default to requiring authentication only)
    return null
}

/**
 * Check if a route requires only authentication (no specific permission)
 * @param path - The route path
 * @returns true if route only requires authentication
 */
export function requiresAuthOnly(path: string): boolean {
    const config = getRoutePermission(path)
    return config?.requiresAuthOnly === true
}

/**
 * Check if a route has no permission requirements (public or auth-only)
 * @param path - The route path
 * @returns true if route has no specific permission requirements
 */
export function hasNoPermissionRequirement(path: string): boolean {
    const config = getRoutePermission(path)
    return !config || config.requiresAuthOnly === true
}

