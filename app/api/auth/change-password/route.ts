import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/auth/change-password
 * Change the current user's password
 */
export async function POST(request: NextRequest) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        console.log('body', body);

        const { currentPassword, newPassword, confirmPassword } = body;

        // Validate required fields exist and are strings
        if (!currentPassword || typeof currentPassword !== 'string') {
            return NextResponse.json(
                { error: 'currentPassword is required and must be a string' },
                { status: 400 }
            );
        }

        if (!newPassword || typeof newPassword !== 'string') {
            return NextResponse.json(
                { error: 'newPassword is required and must be a string' },
                { status: 400 }
            );
        }

        if (!confirmPassword || typeof confirmPassword !== 'string') {
            return NextResponse.json(
                { error: 'confirmPassword is required and must be a string' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        // Build the URL for change password endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.auth.changePassword}`;

        // Call backend API to change password
        // Backend expects: currentPassword, newPassword, newPasswordConfirmation
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

        console.log('response', response);

        const data = await response.json().catch(() => ({}));

        console.log('data', data);

        if (!response.ok) {
            console.error('Change password error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to change password' },
                { status: response.status }
            );
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

        return NextResponse.json({
            message: data.message || 'Password changed successfully',
        });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

