import 'server-only'

import { hasAnyPermission } from './auth/permissions'
import { MenuItem } from './menu-config'

/**
 * Filter menu items based on user roles, permissions, and user type
 * 
 * @param items - Array of menu items to filter
 * @param roles - Array of user roles
 * @param userType - Optional user type to validate roles against
 * @returns Filtered array of menu items that the user has access to
 */
export function filterMenuItems<T extends MenuItem>(
  items: T[],
  roles: string[],
  userType?: string | null
): T[] {
  if (!roles || roles.length === 0) {
    // If no roles, only return items without permission requirements
    return items.filter(item => !item.permission && !item.permissions)
  }

  return items.filter(item => {
    // Check user type restriction first
    if (item.allowedUserTypes && item.allowedUserTypes.length > 0) {
      if (!userType || !item.allowedUserTypes.includes(userType)) {
        return false
      }
    }

    // If no permission requirement, item is always visible (if user type check passed)
    if (!item.permission && !item.permissions) {
      return true
    }

    // Single permission check
    if (item.permission) {
      return hasAnyPermission(roles, item.permission, userType)
    }

    // Multiple permissions check
    if (item.permissions && item.permissions.length > 0) {
      if (item.requireAll) {
        return item.permissions.every(permission =>
          hasAnyPermission(roles, permission, userType)
        )
      } else {
        return item.permissions.some(permission =>
          hasAnyPermission(roles, permission, userType)
        )
      }
    }

    return false
  })
}