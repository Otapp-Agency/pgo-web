import { PERMISSIONS } from './auth/permissions'

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
            permission: PERMISSIONS.TRANSACTIONS.VIEW,
        },
        {
            title: "Merchants",
            url: "/merchants",
            icon: "IconUsers",
            permission: PERMISSIONS.MERCHANTS.VIEW,
        },
        {
            title: "Users",
            url: "/users",
            icon: "IconUsers",
            permission: PERMISSIONS.USERS.VIEW,
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
        },
    ] as MenuItem[],
}

