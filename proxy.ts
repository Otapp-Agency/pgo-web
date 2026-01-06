import { NextRequest, NextResponse } from 'next/server'
import { decryptSession } from '@/lib/auth/dal/session.dal'

const publicRoutes = ['/login']

/**
 * Get valid session from request
 * Returns null if session doesn't exist or is expired
 */
async function getValidSession(req: NextRequest) {
  const cookie = req.cookies.get('session')?.value
  if (!cookie) return null

  const session = await decryptSession(cookie)
  if (!session?.userId) return null

  // Check if session is expired
  if (session.expiresAt && session.expiresAt < Date.now()) {
    return null
  }

  return session
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Public routes - allow access
  if (publicRoutes.includes(path)) {
    // Redirect authenticated users away from login page
    if (path === '/login') {
      const session = await getValidSession(req)
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      }
    }
    return NextResponse.next()
  }

  // Protected routes - require valid session
  const session = await getValidSession(req)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}