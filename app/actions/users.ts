'use server'

import { checkPermission, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { FormState } from '@/lib/definitions'

/**
 * Example Server Action with permission check
 * Create a new user (requires users.create permission)
 */
export async function createUser(prevState: FormState, formData: FormData) {
  // Check permission - throws/redirects if not authorized
  await requirePermission(PERMISSIONS.USERS.CREATE)

  // Your user creation logic here
  const username = formData.get('username')
  const email = formData.get('email')
  
  // ... rest of the logic
  
  return {
    message: 'User created successfully',
  }
}

/**
 * Example Server Action with conditional permission check
 * Update user (requires users.update permission)
 */
export async function updateUser(prevState: FormState, formData: FormData) {
  // Check permission - returns boolean
  const hasAccess = await checkPermission(PERMISSIONS.USERS.UPDATE)
  
  if (!hasAccess) {
    return {
      message: 'You do not have permission to update users.',
    }
  }

  // Your user update logic here
  const userId = formData.get('userId')
  const username = formData.get('username')
  
  // ... rest of the logic
  
  return {
    message: 'User updated successfully',
  }
}

/**
 * Example Server Action with multiple permission check
 * Delete user (requires users.delete permission)
 */
export async function deleteUser(userId: string) {
  await requirePermission(PERMISSIONS.USERS.DELETE)

  // Your user deletion logic here
  // ... rest of the logic
  
  return {
    success: true,
    message: 'User deleted successfully',
  }
}

