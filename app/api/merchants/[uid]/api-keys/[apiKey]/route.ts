import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * DELETE /api/merchants/[uid]/api-keys/[apiKey] - Revoke an API key
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string; apiKey: string }> }
) {
    try {
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid, apiKey } = await params;

        // Build the URL - need to URL encode the apiKey as it might contain special characters
        const encodedApiKey = encodeURIComponent(apiKey);
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.revokeApiKey.replace('{uid}', uid).replace('{apiKey}', encodedApiKey)}`;

        // Revoke API key via backend API
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { error: responseData.message || responseData.error || 'Failed to revoke API key' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: responseData.message || 'API key revoked successfully',
            success: responseData.data ?? true,
        });
    } catch (error) {
        console.error('Error revoking API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

