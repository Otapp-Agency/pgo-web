import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * DELETE /api/merchants/[uid]/bank-accounts/[bankAccountUid] - Deactivate a bank account
 * Marks a settlement bank account as inactive for the merchant
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string; bankAccountUid: string }> }
) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { uid, bankAccountUid } = await params;

        // Build the URL using the deactivateBankAccount endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.deactivateBankAccount
            .replace('{uid}', uid)
            .replace('{bankAccountUid}', bankAccountUid)}`;

        // Deactivate bank account via backend API
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend deactivate bank account error:', {
                status: response.status,
                data,
                uid,
                bankAccountUid,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to deactivate bank account' },
                { status: response.status }
            );
        }

        return NextResponse.json(
            {
                message: data.message || 'Bank account deactivated successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deactivating bank account:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

