import { PERMISSIONS } from './auth/permissions';
import { USER_TYPES } from './auth/user-types';

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
    allowedUserTypes?: string[] // Restrict menu item to specific user types (e.g., ['SYSTEM_USER', 'ROOT_USER'])
    subItems?: MenuItem[]      // Sub-menu items
}

/**
 * Menu Configuration
 * Centralized menu structure with permission mappings
 */
export const menuConfig = {
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: "IconDashboard",
            // Dashboard is available to all authenticated users (no permission required)
        },
        {
            title: "Transactions",
            url: "/transactions",
            icon: "IconListDetails",
            permission: PERMISSIONS.TRANSACTIONS.VIEW,
        },
        {
            title: "Gateways",
            url: "/gateways",
            icon: "IconCreditCard",
            permission: PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
            allowedUserTypes: [USER_TYPES.SYSTEM_USER, USER_TYPES.ROOT_USER], // Only system users can see gateways
        },
        {
            title: "Merchants",
            url: "/merchants",
            icon: "IconUsers",
            permission: PERMISSIONS.MERCHANTS.VIEW,
        },
        {
            title: "Users & Roles",
            url: "/users",
            icon: "IconUserScan",
            permission: PERMISSIONS.USERS.VIEW,
            allowedUserTypes: [USER_TYPES.SYSTEM_USER, USER_TYPES.ROOT_USER], // Only system users can manage users
            subItems: [
                {
                    title: "Users",
                    url: "/users",
                    icon: "IconUsers",
                },
                {
                    title: "Roles",
                    url: "/roles",
                    icon: "IconFingerprint",
                },
            ],
        },
        {
            title: "Disbursements",
            url: "/disbursements",
            icon: "IconFolder",
            permission: PERMISSIONS.DISBURSEMENTS.VIEW,
        },
        {
            title: "Logs",
            url: "/logs",
            icon: "IconChartBar",
            permission: PERMISSIONS.AUDIT_AND_LOGS.VIEW,
            allowedUserTypes: [USER_TYPES.SYSTEM_USER, USER_TYPES.ROOT_USER], // Only system users can see logs
        },
    ] as MenuItem[],
}