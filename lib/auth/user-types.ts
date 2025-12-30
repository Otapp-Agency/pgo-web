/**
 * User Type Constants and Configuration
 * Defines user types, their allowed routes, and default redirects
 * User Type is the BASE layer of authorization (checked before roles)
 */

/**
 * User Type Constants
 * These match the userType values returned from the API
 */
export const USER_TYPES = {
    ROOT_USER: 'ROOT_USER',
    SYSTEM_USER: 'SYSTEM_USER',
    MERCHANT_USER: 'MERCHANT_USER',
} as const

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES]

/**
 * User Type Configuration
 * Defines routing and display settings for each user type
 */
export interface UserTypeConfig {
    /** Route prefix that this user type can access */
    allowedRoutePrefix: string
    /** Where to redirect after login */
    defaultRedirect: string
    /** Human-readable name for UI display */
    displayName: string
    /** Description of the user type */
    description: string
}

export const USER_TYPE_CONFIG: Record<UserType, UserTypeConfig> = {
    [USER_TYPES.ROOT_USER]: {
        allowedRoutePrefix: '/admin',
        defaultRedirect: '/admin/dashboard',
        displayName: 'Root Administrator',
        description: 'Full system access and control',
    },
    [USER_TYPES.SYSTEM_USER]: {
        allowedRoutePrefix: '/admin',
        defaultRedirect: '/admin/dashboard',
        displayName: 'System User',
        description: 'Internal system staff',
    },
    [USER_TYPES.MERCHANT_USER]: {
        allowedRoutePrefix: '/merchant',
        defaultRedirect: '/merchant/dashboard',
        displayName: 'Merchant',
        description: 'External merchant portal',
    },
}

/**
 * Get config for a user type
 * @param userType - The user type string
 * @returns UserTypeConfig or null if invalid user type
 */
export function getUserTypeConfig(userType: string | undefined): UserTypeConfig | null {
    if (!userType || !(userType in USER_TYPE_CONFIG)) {
        return null
    }
    return USER_TYPE_CONFIG[userType as UserType]
}

/**
 * Get the default redirect URL for a user type
 * @param userType - The user type string
 * @returns Default redirect URL or '/login' if invalid
 */
export function getDefaultRedirect(userType: string | undefined): string {
    const config = getUserTypeConfig(userType)
    return config?.defaultRedirect || '/login'
}

/**
 * Check if a user type can access a given route
 * @param userType - The user type string
 * @param route - The route path to check
 * @returns true if user type can access the route
 */
export function canAccessRoute(userType: string | undefined, route: string): boolean {
    const config = getUserTypeConfig(userType)
    if (!config) {
        return false
    }

    // Check if route starts with allowed prefix
    return route.startsWith(config.allowedRoutePrefix)
}

/**
 * Get all user types that can access a given route prefix
 * @param routePrefix - The route prefix (e.g., '/admin', '/merchant')
 * @returns Array of user types that can access this prefix
 */
export function getUserTypesForRoute(routePrefix: string): UserType[] {
    return Object.entries(USER_TYPE_CONFIG)
        .filter(([, config]) => routePrefix.startsWith(config.allowedRoutePrefix))
        .map(([userType]) => userType as UserType)
}

/**
 * Check if user type is valid
 * @param userType - The user type string to check
 * @returns true if valid user type
 */
export function isValidUserType(userType: string | undefined): userType is UserType {
    return !!userType && userType in USER_TYPE_CONFIG
}

/**
 * Admin user types (can access /admin/*)
 */
export const ADMIN_USER_TYPES: UserType[] = [
    USER_TYPES.ROOT_USER,
    USER_TYPES.SYSTEM_USER,
]

/**
 * Merchant user types (can access /merchant/*)
 */
export const MERCHANT_USER_TYPES: UserType[] = [
    USER_TYPES.MERCHANT_USER,
]

/**
 * Check if user type is an admin type
 */
export function isAdminUserType(userType: string | undefined): boolean {
    return ADMIN_USER_TYPES.includes(userType as UserType)
}

/**
 * Check if user type is a merchant type
 */
export function isMerchantUserType(userType: string | undefined): boolean {
    return MERCHANT_USER_TYPES.includes(userType as UserType)
}

