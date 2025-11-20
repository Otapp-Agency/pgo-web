import 'server-only'

import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { API_CONFIG } from '@/lib/config/api'
import { buildEndpointUrl } from '@/lib/config/endpoints'
import { User, ApiResponse } from '@/lib/types'
import { SessionPayload } from '@/lib/definitions'
import { getRolesPermissions } from '@/lib/permissions'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  // Check if session is expired
  if (session.expiresAt && session.expiresAt < Date.now()) {
    redirect('/login')
  }

  return session as SessionPayload
})

/**
 * Get user data from session (no API call needed)
 * Use this when you need user data quickly and don't need the latest from server
 */
export const getUserFromSession = cache(async () => {
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
 * Use this when you need the latest user data from the server
 */
export const getUser = cache(async () => {
  const session = await verifySession()
  if (!session) return null

  try {
    const url = `${API_CONFIG.baseURL}${buildEndpointUrl.userById(session.userId)}`
    const response = await fetch(url, {
      headers: {
        ...API_CONFIG.headers,
        Authorization: `Bearer ${session.token}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch user: ${response.status} ${response.statusText}`)
      return null
    }

    const data: ApiResponse<User> = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to fetch user', error)
    return null
  }
})

/**
 * Get user's permissions based on their roles from session
 * Returns cached permissions for performance
 * @returns Array of permission strings
 */
export const getUserPermissions = cache(async (): Promise<string[]> => {
  const session = await verifySession()
  if (!session?.roles || session.roles.length === 0) {
    return []
  }
  return getRolesPermissions(session.roles)
})
