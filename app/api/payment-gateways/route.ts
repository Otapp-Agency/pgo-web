import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import type { PaymentGatewayCreateRequest } from '@/lib/types/payment-gateway';
import type { PaginatedPaymentGatewayResponse } from '@/lib/definitions';

/**
 * GET /api/payment-gateways - List all payment gateways
 * FR-PGO-002: Get All Payment Gateways
 */
export async function GET(request: NextRequest) {
    try {
        // Get session for authentication
        const session = await getSession();

        if (!session?.token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Extract query parameters from the request
        const searchParams = request.nextUrl.searchParams;
        const queryParams = new URLSearchParams();

        // Add all query parameters if they exist
        const allowedParams = ['is_active', 'search'];

        allowedParams.forEach((param) => {
            const value = searchParams.get(param);
            if (value !== null && value !== '') {
                queryParams.set(param, value);
            }
        });

        // Build the URL with query parameters
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.list}${queryString ? `?${queryString}` : ''}`;

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
                message: response.statusText || 'Failed to fetch payment gateways',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch payment gateways' },
                { status: response.status }
            );
        }

        const data = await response.json();

        console.log('Payment gateways API route - backend response:', {
            hasData: !!data.data,
            dataLength: Array.isArray(data.data) ? data.data.length : 0,
            dataKeys: Object.keys(data),
            firstItem: Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null,
        });

        // Backend API returns: { data: PaymentGateway[], ... } or array
        // Transform to exclude credentials field
        if (data.data && Array.isArray(data.data)) {
            const transformedData = data.data.map((gateway: {
                id: string;
                uid?: string;
                name: string;
                code: string;
                productionApiBaseUrl?: string | null;
                sandboxApiBaseUrl?: string | null;
                supportedMethods?: string[];
                activeStatus?: string;
                isActive?: boolean;
                active?: boolean;
                createdAt?: string | null;
                updatedAt?: string | null;
            }) => {
                // Convert activeStatus string ('Active'/'Inactive') to boolean
                let isActive = true;
                if (gateway.activeStatus !== undefined) {
                    isActive = gateway.activeStatus === 'Active' || gateway.activeStatus === 'ACTIVE' || gateway.activeStatus === 'active';
                } else if (gateway.isActive !== undefined) {
                    isActive = gateway.isActive;
                } else if (gateway.active !== undefined) {
                    isActive = gateway.active;
                }

                // Ensure supportedMethods is an array
                let supportedMethods: string[] = [];
                if (Array.isArray(gateway.supportedMethods)) {
                    supportedMethods = gateway.supportedMethods;
                } else if (gateway.supportedMethods) {
                    supportedMethods = [String(gateway.supportedMethods)];
                }

                return {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.productionApiBaseUrl ?? null,
                    api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? null,
                    supported_methods: supportedMethods,
                    is_active: isActive,
                    created_at: gateway.createdAt ?? null,
                    updated_at: gateway.updatedAt ?? null,
                };
            });

            console.log('Transformed payment gateways:', transformedData);

            const listResponse: PaginatedPaymentGatewayResponse = {
                data: transformedData,
                pageNumber: data.pageNumber ?? 0,
                pageSize: data.pageSize ?? 15,
                totalElements: data.totalElements ?? transformedData.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedData.length) / (data.pageSize ?? 15)),
                last: data.last ?? true,
                first: data.first ?? (data.pageNumber === 0),
            };

            console.log('Transformed payment gateways response:', listResponse);

            return NextResponse.json(listResponse);
        } else if (Array.isArray(data)) {
            // Backend returned just an array (legacy format)
            const transformedData = data.map((gateway: {
                id: string;
                uid?: string;
                name: string;
                code: string;
                productionApiBaseUrl?: string | null;
                sandboxApiBaseUrl?: string | null;
                supportedMethods?: string[];
                activeStatus?: string;
                isActive?: boolean;
                active?: boolean;
                createdAt?: string | null;
                updatedAt?: string | null;
            }) => {
                // Convert activeStatus string ('Active'/'Inactive') to boolean
                let isActive = true;
                if (gateway.activeStatus !== undefined) {
                    isActive = gateway.activeStatus === 'Active' || gateway.activeStatus === 'ACTIVE';
                } else if (gateway.isActive !== undefined) {
                    isActive = gateway.isActive;
                } else if (gateway.active !== undefined) {
                    isActive = gateway.active;
                }

                return {
                    id: gateway.id,
                    uid: gateway.uid ?? gateway.id,
                    name: gateway.name,
                    code: gateway.code,
                    api_base_url_production: gateway.productionApiBaseUrl ?? null,
                    api_base_url_sandbox: gateway.sandboxApiBaseUrl ?? null,
                    supported_methods: Array.isArray(gateway.supportedMethods)
                        ? gateway.supportedMethods.filter((m): m is string => typeof m === 'string')
                        : [],
                    is_active: isActive,
                    created_at: gateway.createdAt ?? null,
                    updated_at: gateway.updatedAt ?? null,
                };
            });

            const listResponse: PaginatedPaymentGatewayResponse = {
                data: transformedData,
                pageNumber: 0,
                pageSize: transformedData.length,
                totalElements: transformedData.length,
                totalPages: 1,
                last: true,
                first: true,
            };

            return NextResponse.json(listResponse);
        } else {
            // Fallback: return error
            console.error('Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error fetching payment gateways:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/payment-gateways - Create a new payment gateway
 * FR-PGO-001: Create Payment Gateway Configuration
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
        const body = await request.json();

        // Validate required fields
        const errors: string[] = [];

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        const credentials = body.credentials;
        const supportedMethods = body.supported_methods;

        if (!name) {
            errors.push('name is required');
        }
        if (!code) {
            errors.push('code is required');
        }
        if (!credentials || typeof credentials !== 'object') {
            errors.push('credentials is required and must be an object');
        }
        if (!Array.isArray(supportedMethods) || supportedMethods.length === 0) {
            errors.push('supported_methods is required and must be a non-empty array');
        }

        // Return validation errors if any
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', errors },
                { status: 400 }
            );
        }

        // Transform request body to backend format (camelCase)
        // Backend expects: productionApiBaseUrl, sandboxApiBaseUrl, active (not isActive)
        const backendBody: Record<string, unknown> = {
            name,
            code,
            productionApiBaseUrl: body.api_base_url_production || '',
            sandboxApiBaseUrl: body.api_base_url_sandbox || '',
            supportedMethods,
            active: body.is_active ?? true,
        };

        // Add credentials if provided (backend may accept this even if not in swagger)
        if (credentials && Object.keys(credentials).length > 0) {
            backendBody.credentials = credentials;
        }

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.create}`;

        // Create payment gateway via backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(backendBody),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend create payment gateway error:', {
                status: response.status,
                data,
                sentBody: backendBody,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to create payment gateway' },
                { status: response.status }
            );
        }

        // Transform response to frontend format (exclude credentials)
        const gateway = data.payment_gateway || data.data || data;
        const transformedGateway = gateway ? {
            id: gateway.id,
            uid: gateway.uid ?? gateway.id,
            name: gateway.name,
            code: gateway.code,
            api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
            api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
            supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
            is_active: gateway.isActive ?? gateway.is_active ?? true,
            created_at: gateway.createdAt ?? gateway.created_at ?? null,
        } : null;

        return NextResponse.json(
            {
                message: data.message || 'Payment Gateway created successfully',
                payment_gateway: transformedGateway,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating payment gateway:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


