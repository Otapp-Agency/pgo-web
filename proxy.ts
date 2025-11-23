import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth/session'

const publicRoutes = ['/login']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  // Everything is protected except publicRoutes and static assets (handled by matcher)
  const isProtected = !isPublicRoute

  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Check if session exists and is not expired
  const isValidSession = session?.userId && (!session.expiresAt || session.expiresAt > Date.now())

  if (isProtected && !isValidSession) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && isValidSession && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
