import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { CreateMerchantRequestSchema } from '@/lib/definitions';

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
        const allowedParams = [
            'page',
            'per_page',
            'search',
            'status',
            'merchantType',
            'kyc_verified',
            'sort',
        ];

        allowedParams.forEach((param) => {
            const value = searchParams.get(param);
            if (value) {
                // Backend API uses 'size' instead of 'per_page'
                if (param === 'per_page') {
                    queryParams.set('size', value);
                } else if (param === 'page') {
                    // Backend uses 0-based pagination, frontend also sends 0-based
                    // Pass through as-is
                    queryParams.set('page', value);
                } else if (param === 'sort') {
                    // Sort parameter is passed as comma-separated string (e.g., "name,asc,code,desc")
                    // Backend expects it in the same format
                    queryParams.set('sort', value);
                } else {
                    queryParams.set(param, value);
                }
            }
        });

        // Build the URL with query parameters
        const queryString = queryParams.toString();
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.list}${queryString ? `?${queryString}` : ''}`;

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
                message: response.statusText || 'Failed to fetch merchants',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch merchants' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Backend API returns: { status, statusCode, message, data: Merchant[], pageNumber, pageSize, totalElements, totalPages, last }
        // We need: { data: Merchant[], pageNumber, pageSize, totalElements, totalPages, last, first }
        if (data.data && Array.isArray(data.data)) {
            // Transform field names from backend format to frontend format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedData = data.data.map((merchant: any) => {
                // Normalize status to uppercase (ACTIVE, SUSPENDED, INACTIVE)
                let normalizedStatus = merchant.status || merchant.activeStatus || '';
                if (!normalizedStatus && merchant.active !== undefined) {
                    normalizedStatus = merchant.active ? 'ACTIVE' : 'INACTIVE';
                }
                // Ensure uppercase
                normalizedStatus = normalizedStatus.toUpperCase();
                
                return {
                    id: merchant.id,
                    uid: merchant.uid,
                    code: merchant.code,
                    name: merchant.name,
                    business_name: merchant.businessName ?? null,
                    business_registration_number: merchant.businessRegistrationNumber ?? null,
                    business_address: merchant.businessAddress ?? null,
                    business_city: merchant.businessCity ?? null,
                    business_state: merchant.businessState ?? null,
                    business_postal_code: merchant.businessPostalCode ?? null,
                    business_country: merchant.businessCountry ?? null,
                    contact_email: merchant.contactEmail ?? null,
                    contact_phone: merchant.contactPhone ?? null,
                    website_url: merchant.websiteUrl ?? null,
                    merchant_type: merchant.merchantType ?? null,
                    status: normalizedStatus || 'ACTIVE',
                    status_reason: merchant.statusReason ?? null,
                    merchant_role: merchant.merchantRole ?? null,
                    kyc_verified: merchant.kycVerified ?? false,
                    kyc_status: merchant.kycStatus ?? null,
                    kyc_notes: merchant.kycNotes ?? null,
                    kyc_verified_at: merchant.kycVerifiedAt ?? null,
                    kyc_verified_by: merchant.kycVerifiedBy ?? null,
                    single_transaction_limit: merchant.singleTransactionLimit ?? null,
                    daily_transaction_limit: merchant.dailyTransactionLimit ?? null,
                    monthly_transaction_limit: merchant.monthlyTransactionLimit ?? null,
                    parent_merchant_uid: merchant.parentMerchantUid ?? null,
                    parent_merchant_name: merchant.parentMerchantName ?? null,
                    created_at: merchant.createdAt ?? null,
                    updated_at: merchant.updatedAt ?? null,
                };
            });

            // Backend uses 0-based pagination, frontend also uses 0-based
            const backendPageNumber = data.pageNumber ?? parseInt(searchParams.get('page') || '0');

            const paginatedResponse = {
                data: transformedData,
                pageNumber: backendPageNumber, // Keep 0-based
                pageSize: data.pageSize ?? parseInt(searchParams.get('per_page') || '15'),
                totalElements: data.totalElements ?? transformedData.length,
                totalPages: data.totalPages ?? Math.ceil((data.totalElements ?? transformedData.length) / (data.pageSize ?? parseInt(searchParams.get('per_page') || '15'))),
                last: data.last ?? false,
                first: backendPageNumber === 0,
            };

            return NextResponse.json(paginatedResponse);
        } else if (Array.isArray(data)) {
            // Backend returned just an array (legacy format)
            // Use 0-based pagination to match the paginated format branch
            const page = parseInt(searchParams.get('page') || '0');
            const perPage = parseInt(searchParams.get('per_page') || '15');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformedData = data.map((merchant: any) => {
                // Normalize status to uppercase (ACTIVE, SUSPENDED, INACTIVE)
                let normalizedStatus = merchant.status || merchant.activeStatus || '';
                if (!normalizedStatus && merchant.active !== undefined) {
                    normalizedStatus = merchant.active ? 'ACTIVE' : 'INACTIVE';
                }
                // Ensure uppercase
                normalizedStatus = normalizedStatus.toUpperCase();
                
                return {
                    id: merchant.id,
                    uid: merchant.uid,
                    code: merchant.code,
                    name: merchant.name,
                    business_name: merchant.businessName ?? null,
                    business_registration_number: merchant.businessRegistrationNumber ?? null,
                    business_address: merchant.businessAddress ?? null,
                    business_city: merchant.businessCity ?? null,
                    business_state: merchant.businessState ?? null,
                    business_postal_code: merchant.businessPostalCode ?? null,
                    business_country: merchant.businessCountry ?? null,
                    contact_email: merchant.contactEmail ?? null,
                    contact_phone: merchant.contactPhone ?? null,
                    website_url: merchant.websiteUrl ?? null,
                    merchant_type: merchant.merchantType ?? null,
                    status: normalizedStatus || 'ACTIVE',
                    status_reason: merchant.statusReason ?? null,
                    merchant_role: merchant.merchantRole ?? null,
                    kyc_verified: merchant.kycVerified ?? false,
                    kyc_status: merchant.kycStatus ?? null,
                    kyc_notes: merchant.kycNotes ?? null,
                    kyc_verified_at: merchant.kycVerifiedAt ?? null,
                    kyc_verified_by: merchant.kycVerifiedBy ?? null,
                    single_transaction_limit: merchant.singleTransactionLimit ?? null,
                    daily_transaction_limit: merchant.dailyTransactionLimit ?? null,
                    monthly_transaction_limit: merchant.monthlyTransactionLimit ?? null,
                    parent_merchant_uid: merchant.parentMerchantUid ?? null,
                    parent_merchant_name: merchant.parentMerchantName ?? null,
                    created_at: merchant.createdAt ?? null,
                    updated_at: merchant.updatedAt ?? null,
                };
            });
            const paginatedResponse = {
                data: transformedData,
                pageNumber: page,
                pageSize: perPage,
                totalElements: transformedData.length,
                totalPages: 1,
                last: true,
                first: page === 0,
            };
            return NextResponse.json(paginatedResponse);
        } else {
            // Fallback: return error
            console.error('Unexpected response format:', data);
            return NextResponse.json(
                { error: 'Unexpected response format from backend' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error fetching merchants:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchants - Create a new merchant
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

        // Parse and validate request body
        const body = await request.json();
        const validationResult = CreateMerchantRequestSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { 
                    error: 'Validation failed',
                    details: validationResult.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const merchantData = validationResult.data;

        // Build the URL
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.create}`;

        // Send to backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(merchantData),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend create merchant error:', {
                status: response.status,
                data,
            });
            return NextResponse.json(
                { error: data.message || data.error || 'Failed to create merchant' },
                { status: response.status }
            );
        }

        // Transform response to frontend format
        const merchant = data.data || data;
        const transformedMerchant = merchant && merchant.id ? {
            id: merchant.id,
            uid: merchant.uid,
            code: merchant.code || merchant.merchantCode,
            name: merchant.name || merchant.merchantName,
            type: merchant.type || merchant.merchantType || null,
            status: merchant.status ?? 'ACTIVE',
            kyc_verified: merchant.kycVerified ?? merchant.kyc_verified ?? false,
            email: merchant.email || merchant.contactEmail || null,
            contact_info: merchant.contactInfo ?? merchant.contact_info ?? merchant.contactPhone ?? null,
            description: merchant.description ?? null,
            created_at: merchant.createdAt ?? merchant.created_at ?? null,
            updated_at: merchant.updatedAt ?? merchant.updated_at ?? null,
        } : null;

        return NextResponse.json(
            {
                message: data.message || 'Merchant created successfully',
                merchant: transformedMerchant,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating merchant:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

