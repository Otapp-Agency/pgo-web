import 'server-only'

import { hasAnyPermission, hasAllPermissions } from './auth/permissions'
import { MenuItem } from './menu-config'

/**
 * Filter menu items based on user roles and permissions
 * 
 * @param items - Array of menu items to filter
 * @param roles - Array of user roles
 * @returns Filtered array of menu items that the user has access to
 */
export function filterMenuItems<T extends MenuItem>(
  items: T[],
  roles: string[]
): T[] {
  if (!roles || roles.length === 0) {
    // If no roles, only return items without permission requirements
    return items.filter(item => !item.permission && !item.permissions)
  }

  return items.filter(item => {
    // If no permission requirement, item is always visible
    if (!item.permission && !item.permissions) {
      return true
    }

    // Single permission check
    if (item.permission) {
      return hasAnyPermission(roles, item.permission)
    }

    // Multiple permissions check
    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        // User needs ALL permissions (AND logic)
        return item.permissions.every(permission =>
          hasAnyPermission(roles, permission)
        )
      } else {
        // User needs ANY permission (OR logic)
        return item.permissions.some(permission =>
          hasAnyPermission(roles, permission)
        )
      }
    }

    // Default: hide if no permission check passed
    return false
  })
}

// 0791392577  0619499718