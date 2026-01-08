/**
 * Authentication Service
 * Business logic layer for authentication operations
 * Uses DAL for data access and external API calls
 */

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { SessionPayload } from '@/lib/definitions'
import { SessionData, LoginCredentials } from '../types'
import * as sessionDal from '../dal/session.dal'
import * as apiDal from '../dal/api.dal'
import { getRolesPermissions, normalizeRoles } from '../permissions'
import { normalizeUserType } from '../user-types'
import { User } from '@/lib/types'

/**
 * Login result with password change requirement flag
 */
export interface LoginResult {
    requirePasswordChange: boolean;
}

/**
 * Login user with credentials
 * Authenticates with external API and creates session
 * Returns whether password change is required
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
    const apiResult = await apiDal.authenticateUser(credentials)

    if (!apiResult.status || !apiResult.data) {
        throw new Error(apiResult.message || 'Login failed')
    }

    const { data } = apiResult

    // Validate required fields
    if (!data.token) {
        throw new Error('No token received from server')
    }

    if (!data.uid && !data.id) {
        throw new Error('No user ID received from server')
    }

    if (!data.username) {
        throw new Error('No username received from server')
    }

    const requirePasswordChange = data.requirePasswordChange || false;

    // Normalize roles (convert display names to codes if needed)
    const rawRoles = Array.isArray(data.roles) ? data.roles : []
    const normalizedRoles = normalizeRoles(rawRoles)

    // Normalize userType (handle different API formats)
    const normalizedUserType = normalizeUserType(data.userType)

    // Prepare session data
    const sessionData: SessionData = {
        userId: data.id || data.uid || '',
        uid: data.uid || data.id || '',
        token: data.token,
        refreshToken: data.refreshToken,
        username: data.username,
        name: data.name || data.username,
        email: data.email || '',
        roles: normalizedRoles, // Store normalized role codes
        userType: normalizedUserType, // Store normalized userType
        requirePasswordChange,
    }

    await createSession(sessionData)

    return { requirePasswordChange };
}

/**
 * Logout current user
 * Deletes session cookie
 */
export async function logout(): Promise<void> {
    await sessionDal.deleteSessionCookie()
}

/**
 * Create session from session data
 * Encrypts and stores session in cookie
 */
export async function createSession(sessionData: SessionData): Promise<void> {
    const { SESSION } = await import('@/lib/config/constants');
    const expiresAt = Date.now() + SESSION.EXPIRY_MS;
    const sessionPayload: SessionPayload = {
        ...sessionData,
        expiresAt,
    }
    const sessionToken = await sessionDal.encryptSession(sessionPayload)
    await sessionDal.writeSessionCookie(sessionToken, expiresAt)
}

/**
 * Get current session from cookie
 * Returns null if session doesn't exist or is invalid
 */
export async function getSession(): Promise<SessionPayload | null> {
    const sessionCookie = await sessionDal.readSessionCookie()
    if (!sessionCookie) {
        return null
    }
    return await sessionDal.decryptSession(sessionCookie)
}

/**
 * Verify session exists and is valid
 * Redirects to login if session is missing or expired
 * Use this when you need to ensure user is authenticated
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
    const session = await getSession()

    if (!session?.userId) {
        redirect('/login')
    }

    // Check if session is expired
    if (session.expiresAt && session.expiresAt < Date.now()) {
        redirect('/login')
    }

    return session
})

/**
 * Get user data from session (no API call)
 * Use when you need user data quickly and don't need latest from server
 */
export const getUserFromSession = cache(async (): Promise<User | null> => {
    const session = await verifySession()
    if (!session) return null

    // Extract first and last name from full name
    const nameParts = session.name?.split(' ') || []
    const firstName = nameParts[0] || session.username || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    return {
        id: session.userId,
        uid: session.uid,
        username: session.username,
        email: session.email,
        firstName,
        lastName,
        role: session.roles?.[0] || '',
        status: 'ACTIVE', // Default status, can be updated from API if needed
    } as User
})

/**
 * Get user data from API (fresh data from server)
 * Use when you need the latest user data from the server
 */
export const getUser = cache(async (): Promise<User | null> => {
    const session = await verifySession()
    if (!session) return null

    return await apiDal.fetchUserData(session.userId, session.token)
})

/**
 * Get user's permissions based on their roles from session
 * Returns cached permissions for performance
 */
export const getUserPermissions = cache(async (): Promise<string[]> => {
    const session = await verifySession()
    if (!session?.roles || session.roles.length === 0) {
        return []
    }
    return getRolesPermissions(session.roles)
})

/**
 * Clear expired session and redirect to login
 * Use when handling expired/invalid sessions
 */
export async function clearExpiredSession(): Promise<void> {
    await logout()
    redirect('/login')
}

