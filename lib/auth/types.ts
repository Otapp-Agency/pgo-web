/**
 * Auth Service Types
 * Shared types for authentication system
 */

import { SessionPayload } from '@/lib/definitions'

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string
  password: string
}

/**
 * API authentication response
 */
export interface AuthApiResponse {
  status: boolean
  statusCode?: number
  message?: string
  data: {
    token?: string
    refreshToken?: string
    id?: string
    uid?: string
    username?: string
    name?: string
    email?: string
    roles?: string[]
    userType?: string
    requirePasswordChange?: boolean
  }
}

/**
 * Session data without expiresAt (used when creating session)
 */
export type SessionData = Omit<SessionPayload, 'expiresAt'>

