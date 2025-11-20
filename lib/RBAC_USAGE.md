# RBAC Permission System - Usage Guide

This guide explains how to use the Role-Based Access Control (RBAC) permission system in your Next.js application.

## Overview

The RBAC system provides:
- **Permission constants** - Centralized permission definitions
- **Role-to-permission mapping** - Define what each role can do
- **Server-side authorization** - Protect Server Components and Server Actions
- **Client-side hooks** - Check permissions in Client Components
- **UI components** - Conditionally render content based on permissions

## Table of Contents

1. [Permission Constants](#permission-constants)
2. [Server-Side Usage](#server-side-usage)
3. [Client-Side Usage](#client-side-usage)
4. [UI Components](#ui-components)
5. [Examples](#examples)

---

## Permission Constants

All permissions are defined in `lib/permissions.ts`:

```typescript
import { PERMISSIONS } from '@/lib/permissions'

// Use permissions like this:
PERMISSIONS.USERS.CREATE      // 'users.create'
PERMISSIONS.USERS.ALL         // 'users.*' (wildcard)
PERMISSIONS.SYSTEM.ALL        // '*' (all permissions)
```

### Available Permission Groups

- **USERS**: `view`, `create`, `update`, `delete`, `activate`, `deactivate`, `lock`, `unlock`, `reset_password`, `assign_roles`, `*`
- **TRANSACTIONS**: `view`, `create`, `update`, `delete`, `update_status`, `retry`, `refund`, `complete`, `cancel`, `export`, `*`
- **DISBURSEMENTS**: `view`, `create`, `update`, `delete`, `update_status`, `retry`, `complete`, `cancel`, `export`, `*`
- **MERCHANTS**: `view`, `create`, `update`, `delete`, `activate`, `deactivate`, `verify_kyc`, `manage_api_keys`, `export`, `*`
- **ROLES**: `view`, `create`, `update`, `delete`, `*`
- **SYSTEM**: `admin`, `*` (all permissions)

---

## Server-Side Usage

### In Server Components

```typescript
// app/users/page.tsx
import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

export default async function UsersPage() {
  // Throws/redirects if user doesn't have permission
  await requirePermission(PERMISSIONS.USERS.VIEW)
  
  return <div>Users List</div>
}
```

### In Server Actions

```typescript
// app/actions/users.ts
'use server'

import { requirePermission, checkPermission } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

// Method 1: Throw/redirect if no permission
export async function createUser(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS.CREATE)
  // ... create user logic
}

// Method 2: Return error if no permission
export async function updateUser(formData: FormData) {
  const hasAccess = await checkPermission(PERMISSIONS.USERS.UPDATE)
  
  if (!hasAccess) {
    return { error: 'Permission denied' }
  }
  // ... update user logic
}
```

### Multiple Permissions

```typescript
import { requireAnyPermission, requireAllPermissions } from '@/lib/auth'

// User needs ANY of these permissions
await requireAnyPermission([
  PERMISSIONS.USERS.CREATE,
  PERMISSIONS.USERS.UPDATE
])

// User needs ALL of these permissions
await requireAllPermissions([
  PERMISSIONS.USERS.VIEW,
  PERMISSIONS.USERS.UPDATE
])
```

### Get User Permissions

```typescript
import { getCurrentUserPermissions } from '@/lib/auth'

const permissions = await getCurrentUserPermissions()
// Returns: ['users.*', 'transactions.view', ...]
```

---

## Client-Side Usage

### Using Hooks

```typescript
'use client'

import { usePermission, usePermissions } from '@/hooks/use-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { getUserFromSession } from '@/lib/dal'

export function UserActions() {
  const user = await getUserFromSession()
  const canCreate = usePermission(user?.roles, PERMISSIONS.USERS.CREATE)
  const canDelete = usePermission(user?.roles, PERMISSIONS.USERS.DELETE)
  
  return (
    <div>
      {canCreate && <button>Create User</button>}
      {canDelete && <button>Delete User</button>}
    </div>
  )
}
```

### Get All Permissions

```typescript
'use client'

import { usePermissions } from '@/hooks/use-permission'

const permissions = usePermissions(user?.roles)
// Returns: ['users.*', 'transactions.view', ...]
```

---

## UI Components

### ProtectedContent Component

Conditionally renders content based on permissions:

```typescript
'use client'

import { ProtectedContent } from '@/components/protected-content'
import { PERMISSIONS } from '@/lib/permissions'

export function UserManagement() {
  const user = await getUserFromSession()
  
  return (
    <div>
      <ProtectedContent 
        roles={user?.roles} 
        permission={PERMISSIONS.USERS.CREATE}
      >
        <CreateUserButton />
      </ProtectedContent>
      
      <ProtectedContent 
        roles={user?.roles} 
        permissions={[PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.UPDATE]}
        fallback={<p>No access</p>}
      >
        <UserList />
      </ProtectedContent>
    </div>
  )
}
```

### RequirePermission Component

Shows error message if permission denied:

```typescript
'use client'

import { RequirePermission } from '@/components/require-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function AdminPanel() {
  const user = await getUserFromSession()
  
  return (
    <RequirePermission 
      roles={user?.roles}
      permission={PERMISSIONS.SYSTEM.ADMIN}
      showError
      errorMessage="Admin access required"
    >
      <AdminContent />
    </RequirePermission>
  )
}
```

---

## Examples

### Example 1: Protected Page

```typescript
// app/admin/users/page.tsx
import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.USERS.VIEW)
  
  return <div>Admin Users Page</div>
}
```

### Example 2: Protected Server Action

```typescript
// app/actions/transactions.ts
'use server'

import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

export async function refundTransaction(transactionId: string) {
  await requirePermission(PERMISSIONS.TRANSACTIONS.REFUND)
  
  // ... refund logic
  return { success: true }
}
```

### Example 3: Conditional UI Rendering

```typescript
'use client'

import { ProtectedContent } from '@/components/protected-content'
import { PERMISSIONS } from '@/lib/permissions'
import { getUserFromSession } from '@/lib/dal'

export async function TransactionActions({ transactionId }: { transactionId: string }) {
  const user = await getUserFromSession()
  
  return (
    <div className="flex gap-2">
      <ProtectedContent 
        roles={user?.roles}
        permission={PERMISSIONS.TRANSACTIONS.UPDATE_STATUS}
      >
        <button>Update Status</button>
      </ProtectedContent>
      
      <ProtectedContent 
        roles={user?.roles}
        permission={PERMISSIONS.TRANSACTIONS.REFUND}
      >
        <button>Refund</button>
      </ProtectedContent>
      
      <ProtectedContent 
        roles={user?.roles}
        permission={PERMISSIONS.TRANSACTIONS.DELETE}
      >
        <button>Delete</button>
      </ProtectedContent>
    </div>
  )
}
```

### Example 4: Complex Permission Check

```typescript
// User needs to view AND update transactions
import { requireAllPermissions } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

export default async function TransactionEditor() {
  await requireAllPermissions([
    PERMISSIONS.TRANSACTIONS.VIEW,
    PERMISSIONS.TRANSACTIONS.UPDATE
  ])
  
  return <TransactionEditorForm />
}
```

---

## Adding New Permissions

1. Add permission constant to `lib/permissions.ts`:
```typescript
export const PERMISSIONS = {
  // ... existing permissions
  REPORTS: {
    VIEW: 'reports.view',
    EXPORT: 'reports.export',
    ALL: 'reports.*',
  },
}
```

2. Add to role mapping:
```typescript
export const ROLE_PERMISSIONS = {
  'Manager': [
    // ... existing permissions
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
  ],
}
```

---

## Best Practices

1. **Always use permission constants** - Don't hardcode permission strings
2. **Use wildcards for role definitions** - `users.*` instead of listing all user permissions
3. **Check permissions early** - In Server Components and Server Actions, check at the start
4. **Provide fallback UI** - Use `fallback` prop in ProtectedContent for better UX
5. **Cache permission lookups** - Use `getUserPermissions()` which is cached
6. **Combine with route protection** - Use proxy.ts for route-level protection, permissions for feature-level

---

## Troubleshooting

### Permission not working?
- Check if user has the correct role in session
- Verify role is mapped in `ROLE_PERMISSIONS`
- Ensure permission constant matches the check

### Redirecting unexpectedly?
- `requirePermission()` redirects to `/unauthorized` if permission denied
- Make sure `/unauthorized` route exists or update redirect in `lib/auth.ts`

### Client component not updating?
- Ensure roles are passed correctly to hooks
- Check if roles array is reactive/updates when user changes

