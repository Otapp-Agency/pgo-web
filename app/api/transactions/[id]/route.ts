import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
        // Use id as uid for backend API call (the route parameter is the transaction UID)
        const uid = id;

        if (!uid?.trim()) {
            return NextResponse.json(
                { error: 'Transaction UID is required' },
                { status: 400 }
            );
        }

        console.log('uid', uid);

        // Build the URL with transaction UID
        const endpoint = API_ENDPOINTS.transactions.getByUid.replace("{uid}", uid);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        // Fetch from backend API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to fetch transaction',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch transaction' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Normalize the transaction data (handle wrapped responses)
        const transactionData = data.data || data;

        // Return the transaction data
        return NextResponse.json(transactionData);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

