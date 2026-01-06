/**
 * Permission Constants
 * Define all available permissions in the system
 */

import { filterValidRoles, isRoleValidForUserType } from './user-types'

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

    // Payment Gateway Management
    PAYMENT_GATEWAYS: {
        VIEW: 'payment_gateways.view',
        CREATE: 'payment_gateways.create',
        UPDATE: 'payment_gateways.update',
        DELETE: 'payment_gateways.delete',
        TOGGLE_STATUS: 'payment_gateways.toggle_status',
        ALL: 'payment_gateways.*',
    },

    // audit and logs
    AUDIT_AND_LOGS: {
        VIEW: 'audit_and_logs.view',
        ALL: 'audit_and_logs.*',
    },

    // System/Admin
    SYSTEM: {
        ADMIN: 'system.admin',
        ALL: '*', // Super admin - all permissions
    },
} as const

/**
 * Role Display Name to Role Code Mapping
 * Maps display names (as returned by API) to role codes (used in permissions)
 */
export const ROLE_DISPLAY_NAME_TO_CODE: Record<string, string> = {
    'Super Administrator': 'SUPER_ADMIN',
    'System Administrator': 'SYSTEM_ADMIN',
    'Security Administrator': 'SECURITY_ADMIN',
    'Business Administrator': 'BUSINESS_ADMIN',
    'Finance Administrator': 'FINANCE_ADMIN',
    'Compliance Administrator': 'COMPLIANCE_ADMIN',
    'Merchant Administrator': 'MERCHANT_ADMIN',
    'Merchant User': 'MERCHANT_USER',
    'Merchant Finance': 'MERCHANT_FINANCE',
    'Merchant Support': 'MERCHANT_SUPPORT',
    'Payment Operator': 'PAYMENT_OPERATOR',
}

/**
 * Role to Permission Mapping
 * Defines what permissions each role has
 * Uses role codes (e.g., SUPER_ADMIN, SYSTEM_ADMIN)
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    // Super Administrator - Full system access and control
    'SUPER_ADMIN': [
        PERMISSIONS.SYSTEM.ALL, // All permissions
    ],

    // System Administrator - System configuration and monitoring
    'SYSTEM_ADMIN': [
        PERMISSIONS.USERS.ALL,
        PERMISSIONS.ROLES.ALL,
        PERMISSIONS.PAYMENT_GATEWAYS.ALL,
        PERMISSIONS.AUDIT_AND_LOGS.VIEW,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.MERCHANTS.VIEW,
    ],

    // Security Administrator - Security policies and audit management
    'SECURITY_ADMIN': [
        PERMISSIONS.USERS.VIEW,
        PERMISSIONS.USERS.UPDATE,
        PERMISSIONS.USERS.LOCK,
        PERMISSIONS.USERS.UNLOCK,
        PERMISSIONS.ROLES.VIEW,
        PERMISSIONS.AUDIT_AND_LOGS.ALL,
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
    ],

    // Business Administrator - Business operations and rules
    'BUSINESS_ADMIN': [
        PERMISSIONS.MERCHANTS.ALL,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.TRANSACTIONS.UPDATE,
        PERMISSIONS.TRANSACTIONS.UPDATE_STATUS,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.DISBURSEMENTS.UPDATE,
        PERMISSIONS.DISBURSEMENTS.UPDATE_STATUS,
        PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
        // PERMISSIONS.AUDIT_AND_LOGS.VIEW,
    ],

    // Finance Administrator - Financial operations and settlements
    'FINANCE_ADMIN': [
        PERMISSIONS.TRANSACTIONS.ALL,
        PERMISSIONS.DISBURSEMENTS.ALL,
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
        PERMISSIONS.AUDIT_AND_LOGS.VIEW,
    ],

    // Compliance Administrator - Regulatory compliance and KYC/AML
    'COMPLIANCE_ADMIN': [
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.MERCHANTS.VERIFY_KYC,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.AUDIT_AND_LOGS.VIEW,
    ],

    // Merchant Administrator - Merchant onboarding and management
    'MERCHANT_ADMIN': [
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.MERCHANTS.UPDATE,
        PERMISSIONS.MERCHANTS.MANAGE_API_KEYS,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
    ],

    // Merchant User - Regular merchant operations
    'MERCHANT_USER': [
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
    ],

    // Merchant Finance - Merchant financial operations
    'MERCHANT_FINANCE': [
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.TRANSACTIONS.EXPORT,
        PERMISSIONS.DISBURSEMENTS.EXPORT,
    ],

    // Merchant Support - Merchant customer support
    'MERCHANT_SUPPORT': [
        PERMISSIONS.MERCHANTS.VIEW,
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.DISBURSEMENTS.VIEW,
    ],

    // Payment Operator - Payment processing and monitoring
    'PAYMENT_OPERATOR': [
        PERMISSIONS.TRANSACTIONS.VIEW,
        PERMISSIONS.TRANSACTIONS.UPDATE_STATUS,
        PERMISSIONS.TRANSACTIONS.RETRY,
        PERMISSIONS.TRANSACTIONS.COMPLETE,
        PERMISSIONS.TRANSACTIONS.CANCEL,
        PERMISSIONS.DISBURSEMENTS.VIEW,
        PERMISSIONS.DISBURSEMENTS.UPDATE_STATUS,
        PERMISSIONS.DISBURSEMENTS.RETRY,
        PERMISSIONS.DISBURSEMENTS.COMPLETE,
        PERMISSIONS.DISBURSEMENTS.CANCEL,
        PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
        // PERMISSIONS.AUDIT_AND_LOGS.VIEW,
    ],
}

/**
 * Convert role display names to role codes
 * @param roles - Array of role display names or codes
 * @returns Array of role codes
 */
export function normalizeRoles(roles: string[]): string[] {
    return roles.map(role => {
        // If already a code (exists in ROLE_PERMISSIONS), return as is
        if (role in ROLE_PERMISSIONS) {
            return role
        }
        // Convert display name to code
        return ROLE_DISPLAY_NAME_TO_CODE[role] || role
    })
}

/**
 * Check if a role has a specific permission
 * @param role - The role name to check
 * @param permission - The permission to check (e.g., 'users.create' or 'users.*')
 * @param userType - Optional user type to validate role against
 * @returns true if the role has the permission, false otherwise
 */
export function hasPermission(role: string, permission: string, userType?: string | null): boolean {
    // If user type is provided, validate that role is valid for user type
    if (userType) {
        if (!isRoleValidForUserType(role, userType)) {
            return false
        }
    }
    // Normalize role (convert display name to code if needed)
    const normalizedRole = ROLE_DISPLAY_NAME_TO_CODE[role] || role
    const permissions = ROLE_PERMISSIONS[normalizedRole] || []

    // Check for super admin (all permissions)
    if (permissions.includes(PERMISSIONS.SYSTEM.ALL)) {
        return true
    }

    // Check exact match
    if (permissions.includes(permission)) {
        return true
    }

    // Check wildcard match (e.g., 'users.*' matches 'users.create')
    return permissions.some(p => {
        if (p.endsWith('.*')) {
            const prefix = p.slice(0, -2) // Remove '.*'
            return permission.startsWith(prefix + '.') || permission === prefix
        }
        return false
    })
}

/**
 * Check if any of the provided roles has a permission
 * @param roles - Array of role names
 * @param permission - The permission to check
 * @param userType - Optional user type to validate roles against
 * @returns true if any role has the permission
 */
export function hasAnyPermission(roles: string[], permission: string, userType?: string | null): boolean {
    // Normalize roles before checking
    let normalizedRoles = normalizeRoles(roles)

    // If user type is provided, filter roles to only include valid ones
    if (userType) {
        normalizedRoles = filterValidRoles(normalizedRoles, userType)
    }

    return normalizedRoles.some(role => hasPermission(role, permission, userType))
}

/**
 * Check if all provided roles have a permission
 * @param roles - Array of role names
 * @param permission - The permission to check
 * @param userType - Optional user type to validate roles against
 * @returns true if all roles have the permission
 */
export function hasAllPermissions(roles: string[], permission: string, userType?: string | null): boolean {
    // Normalize roles before checking
    let normalizedRoles = normalizeRoles(roles)

    // If user type is provided, filter roles to only include valid ones
    if (userType) {
        normalizedRoles = filterValidRoles(normalizedRoles, userType)
    }

    return normalizedRoles.length > 0 && normalizedRoles.every(role => hasPermission(role, permission, userType))
}

/**
 * Get all permissions for a role
 * @param role - The role name
 * @returns Array of permission strings
 */
export function getRolePermissions(role: string): string[] {
    // Normalize role (convert display name to code if needed)
    const normalizedRole = ROLE_DISPLAY_NAME_TO_CODE[role] || role
    return ROLE_PERMISSIONS[normalizedRole] || []
}

/**
 * Get all permissions for multiple roles (union of all permissions)
 * @param roles - Array of role names
 * @param userType - Optional user type to validate roles against
 * @returns Array of unique permission strings
 */
export function getRolesPermissions(roles: string[], userType?: string | null): string[] {
    // Normalize roles before checking
    let normalizedRoles = normalizeRoles(roles)

    // If user type is provided, filter roles to only include valid ones
    if (userType) {
        normalizedRoles = filterValidRoles(normalizedRoles, userType)
    }

    const allPermissions = new Set<string>()

    normalizedRoles.forEach(role => {
        const rolePerms = getRolePermissions(role)
        rolePerms.forEach(perm => allPermissions.add(perm))
    })

    return Array.from(allPermissions)
}