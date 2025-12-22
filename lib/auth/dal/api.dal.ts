/**
 * API Data Access Layer
 * External API calls for authentication and user data
 */

// import 'server-only'
import { API_CONFIG } from '@/lib/config/api'
import { API_ENDPOINTS } from '@/lib/config/api'
import { buildEndpointUrl } from '@/lib/config/endpoints'
import { User, ApiResponse } from '@/lib/types'
import { AuthApiResponse, LoginCredentials } from '../types'

/**
 * Authenticate user with external API
 * Returns authentication response with token and user data
 */
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthApiResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

  try {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.auth.login}`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify(credentials),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Authentication failed')
    }

    const result = await response.json()

    console.log('[API DAL] Login API Response:')
    console.log('  - Status:', response.status)
    console.log('  - Response keys:', Object.keys(result))
    console.log('  - Full response:', JSON.stringify(result, null, 2))
    
    if (result.data) {
      console.log('  - Response data keys:', Object.keys(result.data))
      console.log('  - Roles in response.data:', result.data.roles)
      console.log('  - Roles type:', typeof result.data.roles)
      console.log('  - Is array:', Array.isArray(result.data.roles))
      if (result.data.roles) {
        console.log('  - Roles values:', result.data.roles)
        console.log('  - Roles length:', result.data.roles.length)
      }
    }

    // Validate response structure
    if (typeof result !== 'object' || result === null || !('status' in result) || !('data' in result)) {
      throw new Error('Invalid response format from server')
    }

    return result as AuthApiResponse
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  }
}

/**
 * Fetch user data from external API
 * Requires valid session token
 */
export async function fetchUserData(userId: string, token: string): Promise<User | null> {
  try {
    const url = `${API_CONFIG.baseURL}${buildEndpointUrl.userById(userId)}`
    const response = await fetch(url, {
      headers: {
        ...API_CONFIG.headers,
        Authorization: `Bearer ${token}`,
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
}

/**
 * Refresh authentication token
 * TODO: Implement when refresh token endpoint is ready
 */
export async function refreshToken(refreshToken: string): Promise<AuthApiResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

  try {
    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.auth.refresh}`, {
      method: 'POST',
      headers: {
        ...API_CONFIG.headers,
        'X-REFRESH-TOKEN': refreshToken,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Token refresh failed')
    }

    const result = await response.json()

    if (typeof result !== 'object' || result === null || !('status' in result) || !('data' in result)) {
      throw new Error('Invalid response format from server')
    }

    return result as AuthApiResponse
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  }
}

