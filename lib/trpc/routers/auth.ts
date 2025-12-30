import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, createTRPCRouter } from '../init';
import { login as authLogin, logout as authLogout, clearExpiredSession as authClearExpiredSession, createSession, getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { getDefaultRedirect } from '@/lib/auth/user-types';

/**
 * Login input schema
 */
const loginInputSchema = z.object({
    username: z.string().min(1, { message: 'Username is required.' }).trim(),
    password: z.string().min(1, { message: 'Password field must not be empty.' }).trim(),
});

/**
 * Change password input schema
 */
const changePasswordInputSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

/**
 * Helper function to handle login errors
 */
function handleLoginError(error: unknown): { message: string } {
    if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timed out')) {
            return {
                message: 'Request timed out. Please check your connection and try again.',
            };
        }

        // Check for network errors
        const errorMessage = error.message || '';
        const causeMessage = error.cause instanceof Error ? error.cause.message : String(error.cause || '');
        const combinedMessage = `${errorMessage} ${causeMessage}`.toLowerCase();

        if (combinedMessage.includes('enotfound') || combinedMessage.includes('getaddrinfo')) {
            return {
                message: 'Cannot reach the server. Please check your internet connection or contact support.',
            };
        }
        if (combinedMessage.includes('fetch failed') || combinedMessage.includes('network')) {
            return {
                message: 'Network error. Please check your connection and try again.',
            };
        }

        // Return error message from API or service
        return {
            message: error.message || 'Invalid credentials.',
        };
    }

    return {
        message: 'Something went wrong. Please try again.',
    };
}

export const authRouter = createTRPCRouter({
    /**
     * Login procedure
     * Authenticates user and creates session
     * Returns redirect information for client-side navigation
     */
    login: publicProcedure
        .input(loginInputSchema)
        .mutation(async ({ input }) => {
            const { username, password } = input;

            try {
                // Call auth service (this creates the session)
                const result = await authLogin({ username, password });
                const requirePasswordChange = result.requirePasswordChange;

                // Get session to determine user type for redirect
                const session = await getSession();
                const userType = session?.userType;

                // Determine redirect path based on user type
                let redirectTo = getDefaultRedirect(userType);
                if (requirePasswordChange) {
                    redirectTo = '/change-password';
                }

                console.log('[AUTH] Login successful:', {
                    username,
                    userType,
                    requirePasswordChange,
                    redirectTo,
                });

                return {
                    success: true,
                    requirePasswordChange,
                    redirectTo,
                    userType,
                };
            } catch (error) {
                console.error('Login error:', error);

                // If it's already a TRPCError, re-throw it
                if (error instanceof TRPCError) {
                    throw error;
                }

                const errorInfo = handleLoginError(error);

                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: errorInfo.message,
                });
            }
        }),

    /**
     * Logout procedure
     * Clears session and returns redirect information
     */
    logout: protectedProcedure
        .mutation(async () => {
            try {
                await authLogout();
                return {
                    success: true,
                    redirectTo: '/login',
                };
            } catch (error) {
                console.error('Logout error:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to logout',
                });
            }
        }),

    /**
     * Change password procedure
     * Validates and changes user password
     */
    changePassword: protectedProcedure
        .input(changePasswordInputSchema)
        .mutation(async ({ input }) => {
            const { currentPassword, newPassword, confirmPassword } = input;

            // Get session for authentication
            const session = await getSession();

            if (!session?.token) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Unauthorized',
                });
            }

            try {
                // Build the URL for change password endpoint
                const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.auth.changePassword}`;

                // Call backend API to change password
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.token}`,
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        newPasswordConfirmation: confirmPassword,
                    }),
                });

                const data = await response.json().catch(() => ({}));

                console.log('Change password data:', data);

                if (!response.ok) {
                    console.error('Change password error:', {
                        status: response.status,
                        data,
                    });
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: data.message || data.error || 'Failed to change password',
                    });
                }

                // Update session to remove requirePasswordChange flag
                if (session.requirePasswordChange) {
                    await createSession({
                        userId: session.userId,
                        uid: session.uid,
                        token: session.token,
                        refreshToken: session.refreshToken,
                        username: session.username,
                        name: session.name,
                        email: session.email,
                        roles: session.roles,
                        userType: session.userType,
                        requirePasswordChange: false, // Clear the flag
                    });
                }

                return {
                    success: true,
                    message: data.message || 'Password changed successfully',
                };
            } catch (error) {
                console.error('Error changing password:', error);

                if (error instanceof TRPCError) {
                    throw error;
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Internal server error',
                });
            }
        }),

    /**
     * Clear expired session procedure
     * Use when handling expired/invalid sessions
     */
    clearExpiredSession: publicProcedure
        .mutation(async () => {
            try {
                await authClearExpiredSession();
                return {
                    success: true,
                };
            } catch (error) {
                console.error('Clear expired session error:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to clear expired session',
                });
            }
        }),
});

