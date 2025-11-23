/**
 * Session Data Access Layer
 * Low-level operations for session storage (cookies, JWT encryption/decryption)
 */

import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { SessionPayload } from '@/lib/definitions'

const secretKey = process.env.SESSION_SECRET || 'default-secret-key-change-me'
const encodedKey = new TextEncoder().encode(secretKey)

/**
 * Encrypt session payload into JWT token
 */
export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

/**
 * Decrypt JWT token into session payload
 * Returns null if token is invalid or expired
 */
export async function decryptSession(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Read session cookie from request
 */
export async function readSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('session')?.value
}

/**
 * Write session cookie to response
 */
export async function writeSessionCookie(sessionToken: string, expiresAt: number): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Delete session cookie from response
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

