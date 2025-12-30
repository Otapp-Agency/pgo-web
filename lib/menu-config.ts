import { PERMISSIONS } from './auth/permissions';
import { USER_TYPES, type UserType } from './auth/user-types';

/**
 * Portal type for route grouping
 */
export type PortalType = 'admin' | 'merchant'

/**
 * Sub-menu item interface
 */
export interface SubMenuItem {
    title: string
    url: string
    icon: string
}

/**
 * Menu Item Interface
 * Defines the structure for menu items with permission requirements
 */
export interface MenuItem {
    title: string
    url: string
    icon: string
    permission?: string        // Single permission check
    permissions?: string[]     // Multiple permissions (OR logic)
    requireAll?: boolean       // If true, requires ALL permissions (AND logic)
    allowedUserTypes?: UserType[]  // Filter by user type (if not set, available to all user types for that portal)
    subItems?: SubMenuItem[]   // Sub-menu items
}

/**
 * Menu Configuration Interface
 */
export interface MenuConfig {
    navMain: MenuItem[]
}

/**
 * Admin Portal Menu Configuration
 * Available to ROOT_USER and SYSTEM_USER
 */
export const adminMenuConfig: MenuConfig = {
    navMain: [
        {
            title: "Dashboard",
            url: "/admin/dashboard",
            icon: "IconDashboard",
            // Dashboard is available to all authenticated admin users (no permission required)
        },
        {
            title: "Transactions",
            url: "/admin/transactions",
            icon: "IconListDetails",
            permission: PERMISSIONS.TRANSACTIONS.VIEW,
        },
        {
            title: "Disbursements",
            url: "/admin/disbursements",
            icon: "IconFolder",
            permission: PERMISSIONS.DISBURSEMENTS.VIEW,
        },
        {
            title: "Merchants",
            url: "/admin/merchants",
            icon: "IconBuildingStore",
            permission: PERMISSIONS.MERCHANTS.VIEW,
        },
        {
            title: "Gateways",
            url: "/admin/gateways",
            icon: "IconCreditCard",
            permission: PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
        },
        {
            title: "Users & Roles",
            url: "/admin/users",
            icon: "IconUserScan",
            permission: PERMISSIONS.USERS.VIEW,
            subItems: [
                {
                    title: "Users",
                    url: "/admin/users",
                    icon: "IconUsers",
                },
                {
                    title: "Roles",
                    url: "/admin/roles",
                    icon: "IconFingerprint",
                },
            ],
        },
        {
            title: "Logs",
            url: "/admin/logs",
            icon: "IconChartBar",
            permission: PERMISSIONS.AUDIT_AND_LOGS.VIEW,
        },
    ],
}

/**
 * Merchant Portal Menu Configuration
 * Available to MERCHANT_USER
 */
export const merchantMenuConfig: MenuConfig = {
    navMain: [
        {
            title: "Dashboard",
            url: "/merchant/dashboard",
            icon: "IconDashboard",
            // Dashboard is available to all authenticated merchant users (no permission required)
        },
        {
            title: "Transactions",
            url: "/merchant/transactions",
            icon: "IconListDetails",
            permission: PERMISSIONS.TRANSACTIONS.VIEW,
        },
        {
            title: "Disbursements",
            url: "/merchant/disbursements",
            icon: "IconFolder",
            permission: PERMISSIONS.DISBURSEMENTS.VIEW,
        },
        {
            title: "Settings",
            url: "/merchant/settings",
            icon: "IconSettings",
            permission: PERMISSIONS.MERCHANTS.VIEW,
        },
    ],
}

/**
 * Get menu config for a specific portal type
 */
export function getMenuConfig(portal: PortalType): MenuConfig {
    switch (portal) {
        case 'admin':
            return adminMenuConfig
        case 'merchant':
            return merchantMenuConfig
        default:
            return adminMenuConfig
    }
}

/**
 * Get menu config for a specific user type
 */
export function getMenuConfigForUserType(userType: string | undefined): MenuConfig {
    switch (userType) {
        case USER_TYPES.ROOT_USER:
        case USER_TYPES.SYSTEM_USER:
            return adminMenuConfig
        case USER_TYPES.MERCHANT_USER:
            return merchantMenuConfig
        default:
            return adminMenuConfig
    }
}

/**
 * Get portal type for a user type
 */
export function getPortalForUserType(userType: string | undefined): PortalType {
    switch (userType) {
        case USER_TYPES.ROOT_USER:
        case USER_TYPES.SYSTEM_USER:
            return 'admin'
        case USER_TYPES.MERCHANT_USER:
            return 'merchant'
        default:
            return 'admin'
    }
}

/**
 * Legacy menu config for backward compatibility
 * @deprecated Use adminMenuConfig or merchantMenuConfig instead
 */
export const menuConfig = adminMenuConfig
