import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import type { AvailablePaymentGatewaysResponse } from '@/lib/types/payment-gateway';

/**
 * GET /api/available-payment-gateways - Get available payment gateways
 * FR-PGO-004: Get Available Payment Gateways (for Merchants/API Integrators)
 * Returns only active gateways with minimal data
 */
export async function GET() {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build the URL - backend should filter to active gateways
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.available}`;

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
                message: response.statusText || 'Failed to fetch available payment gateways',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch available payment gateways' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Backend API returns: { data: AvailablePaymentGateway[] } or array
        // Transform to minimal format (id, name, code, supported_methods)
        if (data.data && Array.isArray(data.data)) {
            const transformedData = data.data.map((gateway: {
                id: string;
                name: string;
                code: string;
                supportedMethods?: string[];
                supported_methods?: string[];
            }) => ({
                id: gateway.id,
                name: gateway.name,
                code: gateway.code,
                supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
            }));

            const availableResponse: AvailablePaymentGatewaysResponse = {
                data: transformedData,
            };

            return NextResponse.json(availableResponse);
        } else if (Array.isArray(data)) {
            // Backend returned just an array (legacy format)
            const transformedData = data.map((gateway: {
                id: string;
                name: string;
                code: string;
                supportedMethods?: string[];
                supported_methods?: string[];
            }) => ({
                id: gateway.id,
                name: gateway.name,
                code: gateway.code,
                supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
            }));

            return NextResponse.json({ data: transformedData });
        } else {
            // Fallback: return error
            console.error('Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error fetching available payment gateways:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}















