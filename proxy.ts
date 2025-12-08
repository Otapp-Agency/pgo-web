import { NextRequest, NextResponse } from 'next/server'
import { decryptSession } from '@/lib/auth/dal/session.dal'
import { hasAnyPermission } from '@/lib/auth/permissions'
import { menuConfig } from '@/lib/menu-config'
import { PERMISSIONS } from '@/lib/auth/permissions'

const publicRoutes = ['/login']
const authOnlyRoutes = ['/change-password', '/unauthorized', '/dashboard']

// Build route-to-permission mapping from menu config
const routePermissions: Record<string, { permission?: string; permissions?: string[]; requireAll?: boolean }> = {}

menuConfig.navMain.forEach(item => {
  if (item.url && item.url !== '#') {
    routePermissions[item.url] = {
      permission: item.permission,
      permissions: item.permissions,
      requireAll: item.requireAll,
    }
  }
})

// Add additional routes
routePermissions['/payment-gateways'] = {
  permission: PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
}

/**
 * Normalize route path by removing dynamic segments
 * Example: /merchants/abc123 -> /merchants
 */
function normalizeRoute(path: string): string {
  let normalized = path.replace(/\/$/, '')
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1]
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const numericIdPattern = /^\d+$/
    const alphanumericIdPattern = /^[a-z0-9]+$/i

    if (
      uuidPattern.test(lastSegment) ||
      numericIdPattern.test(lastSegment) ||
      (alphanumericIdPattern.test(lastSegment) && lastSegment.length > 10)
    ) {
      segments.pop()
      normalized = '/' + segments.join('/')
    }
  }

  return normalized || '/'
}

/**
 * Get required permission for a route
 */
function getRoutePermission(path: string): { permission?: string; permissions?: string[]; requireAll?: boolean } | null {
  const normalizedPath = normalizeRoute(path)
  return routePermissions[normalizedPath] || routePermissions[path] || null
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  console.log('[PROXY] Request:', {
    path,
    isPublicRoute,
    method: req.method,
  })

  // Everything is protected except publicRoutes and static assets (handled by matcher)
  const isProtected = !isPublicRoute

  const cookie = req.cookies.get('session')?.value
  const session = await decryptSession(cookie)

  console.log('[PROXY] Session Check:', {
    hasCookie: !!cookie,
    hasSession: !!session,
    userId: session?.userId,
    username: session?.username,
    roles: session?.roles,
    rolesType: typeof session?.roles,
    isArray: Array.isArray(session?.roles),
    expiresAt: session?.expiresAt,
    now: Date.now(),
    isExpired: session?.expiresAt ? session.expiresAt < Date.now() : null,
  })

  // Check if session exists and is not expired
  const isValidSession = session?.userId && (!session.expiresAt || session.expiresAt > Date.now())

  console.log('[PROXY] Auth Status:', {
    isValidSession,
    isProtected,
  })

  // Authentication check
  if (isProtected && !isValidSession) {
    console.log('[PROXY] ❌ Redirecting to /login (not authenticated)')
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect authenticated users away from login page
  if (isPublicRoute && isValidSession && path === '/login') {
    console.log('[PROXY] ✓ Redirecting authenticated user from /login to /dashboard')
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  // Authorization check (only for authenticated users on protected routes)
  if (isProtected && isValidSession && session) {
    const userRoles = session.roles || []

    console.log('[PROXY] Authorization Check:', {
      path,
      userRoles,
      userRolesCount: userRoles.length,
    })

    // Special routes that only require authentication
    if (authOnlyRoutes.includes(path)) {
      console.log('[PROXY] ✓ Auth-only route, allowing access:', path)
      return NextResponse.next()
    }

    // Get route permission requirement
    const routePermission = getRoutePermission(path)
    const normalizedPath = normalizeRoute(path)

    console.log('[PROXY] Route Permission Lookup:', {
      originalPath: path,
      normalizedPath,
      routePermission,
      hasPermission: !!routePermission?.permission,
      hasPermissions: !!routePermission?.permissions?.length,
      requireAll: routePermission?.requireAll,
    })

    // If route has permission requirements, check them
    // Check that either: (1) permission exists OR (2) permissions array exists AND has items
    const hasPermissionRequirement = routePermission?.permission ||
      (routePermission?.permissions && routePermission.permissions.length > 0)

    if (hasPermissionRequirement) {
      let hasAccess = false
      const requiredPermission = routePermission.permission
      const requiredPermissions = routePermission.permissions

      console.log('[PROXY] Permission Check Required:', {
        requiredPermission,
        requiredPermissions,
        userRoles,
      })

      // Single permission check
      if (routePermission.permission) {
        hasAccess = hasAnyPermission(userRoles, routePermission.permission)
        console.log('[PROXY] Single Permission Check:', {
          permission: routePermission.permission,
          userRoles,
          hasAccess,
        })
      }
      // Multiple permissions check
      else if (routePermission.permissions && routePermission.permissions.length > 0) {
        if (routePermission.requireAll) {
          // User needs ALL permissions (AND logic)
          hasAccess = routePermission.permissions.every(permission =>
            hasAnyPermission(userRoles, permission)
          )
          console.log('[PROXY] Multiple Permissions Check (ALL required):', {
            permissions: routePermission.permissions,
            userRoles,
            hasAccess,
          })
        } else {
          // User needs ANY permission (OR logic)
          hasAccess = routePermission.permissions.some(permission =>
            hasAnyPermission(userRoles, permission)
          )
          console.log('[PROXY] Multiple Permissions Check (ANY required):', {
            permissions: routePermission.permissions,
            userRoles,
            hasAccess,
          })
        }
      }

      // If user doesn't have required permission, redirect to unauthorized
      if (!hasAccess) {
        console.log('[PROXY] ❌ Access denied, redirecting to /unauthorized')
        console.log('[PROXY] Details:', {
          path,
          requiredPermission,
          requiredPermissions,
          userRoles,
        })
        return NextResponse.redirect(new URL('/unauthorized', req.nextUrl))
      }

      console.log('[PROXY] ✓ Permission check passed')
    } else {
      console.log('[PROXY] ✓ No permission requirement, allowing authenticated access')
    }
    // If route has no permission requirement, allow authenticated access
  }

  console.log('[PROXY] ✓ Request allowed')
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}