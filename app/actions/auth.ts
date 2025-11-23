'use server'

import { FormState, LoginFormSchema } from '@/lib/definitions'
import { createSession, deleteSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { API_CONFIG } from '@/lib/config/api'
import { API_ENDPOINTS } from '@/lib/config/endpoints'

export async function login(prevState: FormState, formData: FormData) {
  const validatedFields = LoginFormSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { username, password } = validatedFields.data

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

    const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.auth.login}`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Try to parse error message
      const errorData = await response.json().catch(() => ({}))
      return {
        message: errorData.message || 'Invalid credentials.',
      }
    }

    const result = await response.json()

    // API response structure: { status: true, data: { token, refreshToken, id, uid, username, name, email, roles, userType, requirePasswordChange } }
    // User data is directly in data, not nested as data.user
    if (typeof result !== 'object' || result === null || !('status' in result) || !('data' in result)) {
      return {
        message: 'Invalid response format from server.',
      }
    }

    const apiResult = result as {
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

    if (!apiResult.status || !apiResult.data) {
      return {
        message: apiResult.message || 'Login failed.',
      }
    }

    const { data } = apiResult

    // Validate required fields
    if (!data.token) {
      return {
        message: 'No token received from server.',
      }
    }

    if (!data.uid && !data.id) {
      return {
        message: 'No user ID received from server.',
      }
    }

    if (!data.username) {
      return {
        message: 'No username received from server.',
      }
    }

    // Extract and prepare session data
    const sessionData = {
      userId: data.id || data.uid || '',
      uid: data.uid || data.id || '',
      token: data.token,
      refreshToken: data.refreshToken,
      username: data.username,
      name: data.name || data.username,
      email: data.email || '',
      roles: Array.isArray(data.roles) ? data.roles : [],
      userType: data.userType,
      requirePasswordChange: data.requirePasswordChange || false,
    }

    await createSession(sessionData)
  } catch (error) {
    console.error('Login error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          message: 'Request timed out. Please check your connection and try again.',
        }
      }

      // Check both error.message and error.cause for network errors
      const errorMessage = error.message || ''
      const causeMessage = error.cause instanceof Error ? error.cause.message : String(error.cause || '')
      const combinedMessage = `${errorMessage} ${causeMessage}`.toLowerCase()

      if (combinedMessage.includes('enotfound') || combinedMessage.includes('getaddrinfo')) {
        return {
          message: 'Cannot reach the server. Please check your internet connection or contact support.',
        }
      }
      if (combinedMessage.includes('fetch failed') || combinedMessage.includes('network')) {
        return {
          message: 'Network error. Please check your connection and try again.',
        }
      }
    }

    return {
      message: 'Something went wrong. Please try again.',
    }
  }

  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

