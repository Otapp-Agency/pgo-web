import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * POST /api/payment-gateways/[id]/activate - Activate a payment gateway
 * FR-PGO-003: Enable/Disable Payment Gateway
 * Note: Uses the gateway's uid (passed as id param) to call backend activate endpoint
 */
export async function POST(
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

        const { id: uid } = await params;

        // Build the URL using the activate endpoint (backend expects uid)
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.activate.replace('{uid}', uid)}`;

        // Activate payment gateway via backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend activate payment gateway error:', {
                status: response.status,
                data,
                uid,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to activate payment gateway' },
                { status: response.status }
            );
        }

        // Transform response to frontend format
        const gateway = data.payment_gateway || data.data || data;
        const transformedGateway = gateway ? {
            id: gateway.id,
            uid: gateway.uid,
            name: gateway.name,
            code: gateway.code,
            api_base_url_production: gateway.productionApiBaseUrl ?? gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
            api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
            supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
            is_active: gateway.isActive ?? gateway.is_active ?? gateway.active ?? true,
            created_at: gateway.createdAt ?? gateway.created_at ?? null,
            updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
        } : null;

        return NextResponse.json(
            {
                message: data.message || 'Payment Gateway activated successfully',
                payment_gateway: transformedGateway,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error activating payment gateway:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

