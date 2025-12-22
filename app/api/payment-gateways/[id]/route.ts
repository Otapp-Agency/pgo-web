// import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth/services/auth.service';
// import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
// import type { PaymentGatewayUpdateRequest, PaymentGatewayDetailResponse } from '@/lib/types/payment-gateway';

// /**
//  * GET /api/payment-gateways/[id] - Get payment gateway details
//  * FR-PGO-002: Get Payment Gateway Details
//  * Returns gateway WITH decrypted credentials for editing
//  */
// export async function GET(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         // Get session for authentication
//         const session = await getSession();

//         if (!session?.token) {
//             return NextResponse.json(
//                 { error: 'Unauthorized' },
//                 { status: 401 }
//             );
//         }

//         const { id: gatewayUid } = await params;

//         // Build the URL with gateway UID
//         const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.getByUid.replace('{uid}', gatewayUid)}`;

//         // Fetch from backend API
//         const response = await fetch(url, {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${session.token}`,
//             },
//             cache: 'no-store',
//         });

//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({
//                 message: response.statusText || 'Failed to fetch payment gateway',
//             }));

//             return NextResponse.json(
//                 { error: errorData.message || errorData.error || 'Failed to fetch payment gateway' },
//                 { status: response.status }
//             );
//         }

//         const data = await response.json();

//         // Transform backend response to frontend format (include decrypted credentials)
//         const gateway = data.payment_gateway || data.data || data;
//         const transformedGateway: PaymentGatewayDetailResponse = {
//             id: gateway.id,
//             name: gateway.name,
//             code: gateway.code,
//             api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
//             api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
//             credentials: gateway.credentials ?? {},
//             supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
//             is_active: gateway.isActive ?? gateway.is_active ?? true,
//             created_at: gateway.createdAt ?? gateway.created_at ?? null,
//             updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
//         };

//         return NextResponse.json(transformedGateway);
//     } catch (error) {
//         console.error('Error fetching payment gateway:', error);
//         return NextResponse.json(
//             { error: 'Internal server error' },
//             { status: 500 }
//         );
//     }
// }

// /**
//  * PUT /api/payment-gateways/[id] - Update payment gateway configuration
//  * FR-PGO-002: Update Payment Gateway Configuration
//  * Supports partial updates
//  */
// export async function PUT(
//     request: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         // Get session for authentication
//         const session = await getSession();

//         if (!session?.token) {
//             return NextResponse.json(
//                 { error: 'Unauthorized' },
//                 { status: 401 }
//             );
//         }

//         const { id: gatewayUid } = await params;

//         // Parse request body
//         const body = await request.json();

//         // Validate that at least one field is provided for update
//         const hasUpdateFields =
//             body.name !== undefined ||
//             body.api_base_url_production !== undefined ||
//             body.api_base_url_sandbox !== undefined ||
//             body.credentials !== undefined ||
//             body.supported_methods !== undefined ||
//             body.is_active !== undefined;

//         if (!hasUpdateFields) {
//             return NextResponse.json(
//                 { error: 'At least one field must be provided for update' },
//                 { status: 400 }
//             );
//         }

//         // Transform request body to backend format (camelCase)
//         const backendBody: Record<string, unknown> = {};

//         if (body.name !== undefined) {
//             backendBody.name = typeof body.name === 'string' ? body.name.trim() : body.name;
//         }
//         if (body.api_base_url_production !== undefined) {
//             backendBody.apiBaseUrlProduction = body.api_base_url_production;
//         }
//         if (body.api_base_url_sandbox !== undefined) {
//             backendBody.apiBaseUrlSandbox = body.api_base_url_sandbox;
//         }
//         if (body.credentials !== undefined) {
//             backendBody.credentials = body.credentials;
//         }
//         if (body.supported_methods !== undefined) {
//             backendBody.supportedMethods = body.supported_methods;
//         }
//         if (body.is_active !== undefined) {
//             backendBody.isActive = body.is_active;
//         }

//         // Build the URL
//         const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.paymentGateways.update.replace('{uid}', gatewayUid)}`;

//         // Update payment gateway via backend API
//         const response = await fetch(url, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${session.token}`,
//             },
//             body: JSON.stringify(backendBody),
//         });

//         const data = await response.json().catch(() => ({}));

//         if (!response.ok) {
//             console.error('Backend update payment gateway error:', {
//                 status: response.status,
//                 data,
//                 sentBody: backendBody,
//             });
//             return NextResponse.json(
//                 { error: data.message || data.error || 'Failed to update payment gateway' },
//                 { status: response.status }
//             );
//         }

//         // Transform response to frontend format (exclude credentials)
//         const gateway = data.payment_gateway || data.data || data;
//         const transformedGateway = gateway ? {
//             id: gateway.id,
//             name: gateway.name,
//             code: gateway.code,
//             api_base_url_production: gateway.apiBaseUrlProduction ?? gateway.api_base_url_production ?? null,
//             api_base_url_sandbox: gateway.apiBaseUrlSandbox ?? gateway.api_base_url_sandbox ?? null,
//             supported_methods: gateway.supportedMethods ?? gateway.supported_methods ?? [],
//             is_active: gateway.isActive ?? gateway.is_active ?? true,
//             created_at: gateway.createdAt ?? gateway.created_at ?? null,
//             updated_at: gateway.updatedAt ?? gateway.updated_at ?? null,
//         } : null;

//         return NextResponse.json(
//             {
//                 message: data.message || 'Payment Gateway updated successfully',
//                 payment_gateway: transformedGateway,
//             },
//             { status: 200 }
//         );
//     } catch (error) {
//         console.error('Error updating payment gateway:', error);
//         return NextResponse.json(
//             { error: 'Internal server error' },
//             { status: 500 }
//         );
//     }
// }






