import { NextRequest, NextResponse } from 'next/server'
import { decryptSession } from '@/lib/auth/dal/session.dal'
import { hasAnyPermission } from '@/lib/auth/permissions'
import { adminMenuConfig, merchantMenuConfig, type PortalType } from '@/lib/menu-config'
import { PERMISSIONS } from '@/lib/auth/permissions'
import {
  canAccessRoute,
  getDefaultRedirect,
  isValidUserType,
} from '@/lib/auth/user-types'

const publicRoutes = ['/login']
// Routes that only require authentication (no user type or permission check)
const authOnlyRoutes = ['/change-password', '/unauthorized']

/**
 * Determine portal type from route path
 */
function getPortalFromPath(path: string): PortalType | null {
  if (path.startsWith('/admin')) {
    return 'admin'
  }
  if (path.startsWith('/merchant')) {
    return 'merchant'
  }
  return null
}

/**
 * Build route-to-permission mapping from menu config
 */
function buildRoutePermissions(): Record<string, { permission?: string; permissions?: string[]; requireAll?: boolean }> {
  const routePermissions: Record<string, { permission?: string; permissions?: string[]; requireAll?: boolean }> = {}

  // Add admin routes
  adminMenuConfig.navMain.forEach(item => {
    if (item.url && item.url !== '#') {
      routePermissions[item.url] = {
        permission: item.permission,
        permissions: item.permissions,
        requireAll: item.requireAll,
      }
    }
  })

  // Add merchant routes
  merchantMenuConfig.navMain.forEach(item => {
    if (item.url && item.url !== '#') {
      routePermissions[item.url] = {
        permission: item.permission,
        permissions: item.permissions,
        requireAll: item.requireAll,
      }
    }
  })

  // Add additional routes
  routePermissions['/admin/payment-gateways'] = {
    permission: PERMISSIONS.PAYMENT_GATEWAYS.VIEW,
  }

  return routePermissions
}

const routePermissions = buildRoutePermissions()

/**
 * Normalize route path by removing dynamic segments
 * Example: /admin/merchants/abc123 -> /admin/merchants
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
  const isAuthOnlyRoute = authOnlyRoutes.includes(path)

  console.log('[PROXY] Request:', {
    path,
    isPublicRoute,
    isAuthOnlyRoute,
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
    userType: session?.userType,
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

  // Redirect authenticated users away from login page to their appropriate portal
  if (isPublicRoute && isValidSession && path === '/login' && session) {
    const redirectTo = getDefaultRedirect(session.userType)
    console.log('[PROXY] ✓ Redirecting authenticated user from /login to:', redirectTo)
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl))
  }

  // Handle root path redirect for authenticated users
  if (path === '/' && isValidSession && session) {
    const redirectTo = getDefaultRedirect(session.userType)
    console.log('[PROXY] ✓ Redirecting from root to:', redirectTo)
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl))
  }

  // Authorization check (only for authenticated users on protected routes)
  if (isProtected && isValidSession && session) {
    const userRoles = session.roles || []
    const userType = session.userType

    console.log('[PROXY] Authorization Check:', {
      path,
      userType,
      userRoles,
      userRolesCount: userRoles.length,
    })

    // Auth-only routes just require authentication, no user type or permission check
    if (isAuthOnlyRoute) {
      console.log('[PROXY] ✓ Auth-only route, allowing access:', path)
      return NextResponse.next()
    }

    // ========================================
    // LAYER 1: User Type Check (Base Layer)
    // ========================================
    const portal = getPortalFromPath(path)

    if (portal) {
      // Route belongs to a specific portal, check user type access
      if (!isValidUserType(userType)) {
        console.log('[PROXY] ❌ Invalid user type, redirecting to /unauthorized')
        return NextResponse.redirect(new URL('/unauthorized', req.nextUrl))
      }

      if (!canAccessRoute(userType, path)) {
        // User is trying to access wrong portal - redirect to their correct portal
        const correctRedirect = getDefaultRedirect(userType)
        console.log('[PROXY] ❌ User type mismatch, redirecting to correct portal:', {
          userType,
          attemptedPath: path,
          correctRedirect,
        })
        return NextResponse.redirect(new URL(correctRedirect, req.nextUrl))
      }

      console.log('[PROXY] ✓ User type check passed:', { userType, portal })
    }

    // ========================================
    // LAYER 2: Role/Permission Check
    // ========================================

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
  }

  console.log('[PROXY] ✓ Request allowed')
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
