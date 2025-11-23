/**
 * Permission Constants
 * Define all available permissions in the system
 */

export const PERMISSIONS = {
    // User Management
    USERS: {
        VIEW: 'users.view',
        CREATE: 'users.create',
        UPDATE: 'users.update',
        DELETE: 'users.delete',
        ACTIVATE: 'users.activate',
        DEACTIVATE: 'users.deactivate',
        LOCK: 'users.lock',
        UNLOCK: 'users.unlock',
        RESET_PASSWORD: 'users.reset_password',
        ASSIGN_ROLES: 'users.assign_roles',
        ALL: 'users.*',
    },

    // Transaction Management
    TRANSACTIONS: {
        VIEW: 'transactions.view',
        CREATE: 'transactions.create',
        UPDATE: 'transactions.update',
        DELETE: 'transactions.delete',
        UPDATE_STATUS: 'transactions.update_status',
        RETRY: 'transactions.retry',
        REFUND: 'transactions.refund',
        COMPLETE: 'transactions.complete',
        CANCEL: 'transactions.cancel',
        EXPORT: 'transactions.export',
        ALL: 'transactions.*',
    },

    // Disbursement Management
    DISBURSEMENTS: {
        VIEW: 'disbursements.view',
        CREATE: 'disbursements.create',
        UPDATE: 'disbursements.update',
        DELETE: 'disbursements.delete',
        UPDATE_STATUS: 'disbursements.update_status',
        RETRY: 'disbursements.retry',
        COMPLETE: 'disbursements.complete',
        CANCEL: 'disbursements.cancel',
        EXPORT: 'disbursements.export',
        ALL: 'disbursements.*',
    },

    // Merchant Management
    MERCHANTS: {
        VIEW: 'merchants.view',
        CREATE: 'merchants.create',
        UPDATE: 'merchants.update',
        DELETE: 'merchants.delete',
        ACTIVATE: 'merchants.activate',
        DEACTIVATE: 'merchants.deactivate',
        VERIFY_KYC: 'merchants.verify_kyc',
        MANAGE_API_KEYS: 'merchants.manage_api_keys',
        EXPORT: 'merchants.export',
        ALL: 'merchants.*',
    },

    // Role Management
    ROLES: {
        VIEW: 'roles.view',
        CREATE: 'roles.create',
        UPDATE: 'roles.update',
        DELETE: 'roles.delete',
        ALL: 'roles.*',
    },

    // System/Admin
    SYSTEM: {
        ADMIN: 'system.admin',
        ALL: '*', // Super admin - all permissions
    },
} as const

/**
 * Role to Permission Mapping
 * Defines what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    'Super Administrator': [
        PERMISSIONS.SYSTEM.ALL, // All permissions
    ],

    'Administrator': [
        PERMISSIONS.USERS.ALL,
        PERMISSIONS.TRANSACTIONS.ALL,
        PERMISSIONS.DISBURSEMENTS.ALL,
        PERMISSIONS.MERCHANTS.ALL,
        PERMISSIONS.ROLES.VIEW,
    ],

    'Manager': [
        PERMISSIONS.USERS.VIEW,
        PERMISSIONS.TRANSACTIONS.ALL,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.MERCHANTS.UPDATE,
    ],

    'Operator': [
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.TRANSACTIONS.UPDATE_STATUS,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.MERCHANTS.VIEW,
    ],

    'Viewer': [
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.MERCHANTS.VIEW,
    ],
}

/**
 * Check if a role has a specific permission
 * @param role - The role name to check
 * @param permission - The permission to check (e.g., 'users.create' or 'users.*')
 * @returns true if the role has the permission, false otherwise
 */
export function hasPermission(role: string, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || []

    // Check for super admin (all permissions)
    if (permissions.includes(PERMISSIONS.SYSTEM.ALL)) {
        return true
    }

    // Check exact match
    if (permissions.includes(permission)) {
        return true
    }

    // Check wildcard match (e.g., 'users.*' matches 'users.create')
    const wildcardMatch = permissions.some(p => {
        if (p.endsWith('.*')) {
            const prefix = p.slice(0, -2) // Remove '.*'
            return permission.startsWith(prefix + '.') || permission === prefix
        }
        return false
    })

    return wildcardMatch
}

/**
 * Check if any of the provided roles has a permission
 * @param roles - Array of role names
 * @param permission - The permission to check
 * @returns true if any role has the permission
 */
export function hasAnyPermission(roles: string[], permission: string): boolean {
    return roles.some(role => hasPermission(role, permission))
}

/**
 * Check if all provided roles have a permission
 * @param roles - Array of role names
 * @param permission - The permission to check
 * @returns true if all roles have the permission
 */
export function hasAllPermissions(roles: string[], permission: string): boolean {
    return roles.length > 0 && roles.every(role => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 * @param role - The role name
 * @returns Array of permission strings
 */
export function getRolePermissions(role: string): string[] {
    return ROLE_PERMISSIONS[role] || []
}

/**
 * Get all permissions for multiple roles (union of all permissions)
 * @param roles - Array of role names
 * @returns Array of unique permission strings
 */
export function getRolesPermissions(roles: string[]): string[] {
    const allPermissions = new Set<string>()

    roles.forEach(role => {
        const rolePerms = getRolePermissions(role)
        rolePerms.forEach(perm => allPermissions.add(perm))
    })

    return Array.from(allPermissions)
}

