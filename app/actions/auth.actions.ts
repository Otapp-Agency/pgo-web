/**
 * Authentication Server Actions
 * Thin wrapper around auth service for form handling
 * Handles FormData parsing and validation errors
 */

'use server'

import { FormState, LoginFormSchema } from '@/lib/definitions'
import { redirect } from 'next/navigation'
import { login as authLogin, logout as authLogout, clearExpiredSession as authClearExpiredSession } from '@/lib/auth/services/auth.service'
import { LoginCredentials } from '@/lib/auth/types'

/**
 * Login server action
 * Handles form submission and validation
 */
export async function login(prevState: FormState, formData: FormData): Promise<FormState | void> {
    // Validate form data
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
        // Call auth service
        await authLogin({ username, password })
    } catch (error) {
        console.error('Login error:', error)

        // Handle specific error types
        if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('timed out')) {
                return {
                    message: 'Request timed out. Please check your connection and try again.',
                }
            }

            // Check for network errors
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

            // Return error message from API or service
            return {
                message: error.message || 'Invalid credentials.',
            }
        }

        return {
            message: 'Something went wrong. Please try again.',
        }
    }

    // Redirect on success
    redirect('/dashboard')
}

/**
 * Logout server action
 * Clears session and redirects to login
 */
export async function logout(): Promise<void> {
    await authLogout()
    redirect('/login')
}

/**
 * Clear expired session server action
 * Use when handling expired/invalid sessions
 */
export async function clearExpiredSession(): Promise<void> {
    await authClearExpiredSession()
}

