import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

/**
 * PATCH /api/payment-gateways/[id]/status - Enable/Disable payment gateway
 * FR-PGO-003: Enable/Disable Payment Gateway
 */
export async function PATCH(
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

        // Parse request body
        const body = await request.json();

        // Validate is_active field
        if (typeof body.is_active !== 'boolean') {
            return NextResponse.json(
                { error: 'is_active must be a boolean' },
                { status: 400 }
            );
        }

        // Transform request body to backend format
        const backendBody = {
            isActive: body.is_active,
        };

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.status.replace('{id}', id)}`;

        // Update payment gateway status via backend API
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(backendBody),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend update payment gateway status error:', {
                status: response.status,
                data,
                sentBody: backendBody,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to update payment gateway status' },
                { status: response.status }
            );
        }

        // Transform response to frontend format (exclude credentials)
        const gateway = data.payment_gateway || data.data || data;
        const transformedGateway = gateway ? {
            id: gateway.id,
            name: gateway.name,
            code: gateway.code,
            api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
            api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
            supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
            is_active: gateway.isActive ?? gateway.is_active ?? true,
            created_at: gateway.createdAt ?? gateway.created_at ?? null,
            updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
        } : null;

        return NextResponse.json(
            {
                message: data.message || 'Payment Gateway status updated successfully',
                payment_gateway: transformedGateway,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error updating payment gateway status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}















