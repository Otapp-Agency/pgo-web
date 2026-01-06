/**
 * User Type Definitions and Role Validation
 * Defines user types and their valid roles to prevent role escalation attacks
 */

/**
 * User Type Constants
 */
export const USER_TYPES = {
    ROOT_USER: 'ROOT_USER',
    SYSTEM_USER: 'SYSTEM_USER',
    MERCHANT_USER: 'MERCHANT_USER',
} as const

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES]

/**
 * User Type to Valid Roles Mapping
 * Defines which roles are valid for each user type
 * This prevents role escalation (e.g., MERCHANT_USER cannot have SYSTEM_ADMIN role)
 */
export const USER_TYPE_ROLES: Record<string, string[]> = {
    [USER_TYPES.ROOT_USER]: [
        'SUPER_ADMIN',
    ],
    [USER_TYPES.SYSTEM_USER]: [
        'SYSTEM_ADMIN',
        'SECURITY_ADMIN',
        'BUSINESS_ADMIN',
        'FINANCE_ADMIN',
        'COMPLIANCE_ADMIN',
        'PAYMENT_OPERATOR',
        'PAYMENT_ANALYST',
        'SETTLEMENT_OPERATOR',
        'RECONCILIATION_USER',
        'SUPPORT_AGENT',
        'SUPPORT_SUPERVISOR',
        'ESCALATION_MANAGER',
        'TECHNICAL_ADMIN',
        'DEVELOPER',
        'SYSTEM_MONITOR',
        'AUDITOR',
        'COMPLIANCE_OFFICER',
        'RISK_ANALYST',
    ],
    [USER_TYPES.MERCHANT_USER]: [
        'MERCHANT_ADMIN',
        'MERCHANT_USER',
        'MERCHANT_FINANCE',
        'MERCHANT_SUPPORT',
    ],
}

/**
 * Get all valid roles for a given user type
 * @param userType - The user type (e.g., 'ROOT_USER', 'SYSTEM_USER', 'MERCHANT_USER')
 * @returns Array of valid role codes for the user type, or empty array if user type is invalid
 */
export function getValidRolesForUserType(userType: string | undefined | null): string[] {
    if (!userType) {
        return []
    }
    return USER_TYPE_ROLES[userType] || []
}

/**
 * Check if a role is valid for a given user type
 * @param role - The role code to check (e.g., 'SUPER_ADMIN', 'MERCHANT_ADMIN')
 * @param userType - The user type (e.g., 'ROOT_USER', 'SYSTEM_USER', 'MERCHANT_USER')
 * @returns true if the role is valid for the user type, false otherwise
 */
export function isRoleValidForUserType(role: string, userType: string | undefined | null): boolean {
    if (!userType || !role) {
        return false
    }
    const validRoles = getValidRolesForUserType(userType)
    return validRoles.includes(role)
}

/**
 * Filter roles to only include those valid for the given user type
 * Invalid roles are filtered out and can be logged for security monitoring
 * @param roles - Array of role codes to filter
 * @param userType - The user type to validate against
 * @returns Array of roles that are valid for the user type
 */
export function filterValidRoles(roles: string[], userType: string | undefined | null): string[] {
    if (!userType || !roles || roles.length === 0) {
        return []
    }

    const validRoles = getValidRolesForUserType(userType)
    return roles.filter(role => validRoles.includes(role))
}

/**
 * Validate that all roles are valid for the given user type
 * @param roles - Array of role codes to validate
 * @param userType - The user type to validate against
 * @returns Object with isValid flag and array of invalid roles
 */
export function validateRolesForUserType(
    roles: string[],
    userType: string | undefined | null
): { isValid: boolean; invalidRoles: string[] } {
    if (!userType || !roles || roles.length === 0) {
        return { isValid: true, invalidRoles: [] }
    }

    const validRoles = getValidRolesForUserType(userType)
    const invalidRoles = roles.filter(role => !validRoles.includes(role))

    return {
        isValid: invalidRoles.length === 0,
        invalidRoles,
    }
}




