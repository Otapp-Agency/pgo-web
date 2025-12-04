import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { CreateBankAccountRequestSchema } from '@/lib/definitions';

/**
 * GET /api/merchants/[uid]/bank-accounts - Get merchant bank accounts
 * Returns settlement bank accounts configured for the merchant
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
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

        const { uid } = await params;

        // Build the URL using the bankAccounts endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.bankAccounts.replace('{uid}', uid)}`;

        // Fetch bank accounts via backend API
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
                message: response.statusText || 'Failed to fetch bank accounts',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch bank accounts' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response - handle both array and object with data property
        const bankAccountsRaw = Array.isArray(data) ? data : (data.data || []);

        const bankAccounts = bankAccountsRaw.map((account: {
            id?: string;
            uid?: string;
            bankName?: string;
            bank_name?: string;
            accountName?: string;
            account_name?: string;
            accountNumber?: string;
            account_number?: string;
            bankCode?: string | null;
            bank_code?: string | null;
            branchCode?: string | null;
            branch_code?: string | null;
            accountType?: string | null;
            account_type?: string | null;
            swiftCode?: string | null;
            swift_code?: string | null;
            iban?: string | null;
            bankAddress?: string | null;
            bank_address?: string | null;
            currency?: string;
            status?: string;
            isActive?: boolean;
            is_active?: boolean;
            active?: boolean;
            isPrimary?: boolean;
            is_primary?: boolean;
            primary?: boolean;
            notes?: string | null;
            createdAt?: string | null;
            created_at?: string | null;
            updatedAt?: string | null;
            updated_at?: string | null;
        }) => ({
            id: account.id ?? account.uid ?? '',
            uid: account.uid ?? account.id ?? '',
            bank_name: account.bankName ?? account.bank_name ?? '',
            account_name: account.accountName ?? account.account_name ?? '',
            account_number: account.accountNumber ?? account.account_number ?? '',
            bank_code: account.bankCode ?? account.bank_code ?? null,
            branch_code: account.branchCode ?? account.branch_code ?? null,
            account_type: account.accountType ?? account.account_type ?? null,
            swift_code: account.swiftCode ?? account.swift_code ?? null,
            iban: account.iban ?? null,
            bank_address: account.bankAddress ?? account.bank_address ?? null,
            currency: account.currency ?? 'USD',
            status: account.status ?? (account.isActive !== undefined ? (account.isActive ? 'ACTIVE' : 'INACTIVE') : null),
            is_active: (account.status === 'ACTIVE' || account.isActive) ?? account.is_active ?? account.active ?? true,
            primary: account.primary ?? account.isPrimary ?? account.is_primary ?? false,
            is_primary: account.primary ?? account.isPrimary ?? account.is_primary ?? false,
            notes: account.notes ?? null,
            created_at: account.createdAt ?? account.created_at ?? null,
            updated_at: account.updatedAt ?? account.updated_at ?? null,
        }));

        return NextResponse.json({
            data: bankAccounts,
            total: bankAccounts.length,
        });
    } catch (error) {
        console.error('Error fetching bank accounts:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchants/[uid]/bank-accounts - Create or update merchant bank account
 * Creates a new settlement bank account or updates an existing one
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
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

        const { uid } = await params;

        // Parse and validate request body
        const body = await request.json();
        const validatedData = CreateBankAccountRequestSchema.parse(body);

        // Build the URL using the bankAccounts endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.merchants.bankAccounts.replace('{uid}', uid)}`;

        // Call backend API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(validatedData),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: response.statusText || 'Failed to save bank account',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to save bank account' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform response from backend format to frontend format
        const bankAccountsRaw = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
        
        const transformedBankAccounts = bankAccountsRaw.map((account: any) => ({
            id: account.id || account.uid,
            uid: account.uid || account.id,
            bank_name: account.bankName || account.bank_name || '',
            account_name: account.accountName || account.account_name || '',
            account_number: account.accountNumber || account.account_number || '',
            bank_code: account.bankCode || account.bank_code || null,
            branch_code: account.branchCode || account.branch_code || null,
            account_type: account.accountType || account.account_type || null,
            swift_code: account.swiftCode || account.swift_code || null,
            iban: account.iban || null,
            bank_address: account.bankAddress || account.bank_address || null,
            status: account.status || (account.isActive !== undefined ? (account.isActive ? 'ACTIVE' : 'INACTIVE') : null),
            is_active: account.status === 'ACTIVE' || account.isActive || false,
            primary: account.primary || account.isPrimary || false,
            is_primary: account.primary || account.isPrimary || false,
            notes: account.notes || null,
            created_at: account.createdAt || account.created_at || null,
            updated_at: account.updatedAt || account.updated_at || null,
        }));

        return NextResponse.json({
            message: data.message || 'Bank account saved successfully',
            data: transformedBankAccounts.length > 0 ? transformedBankAccounts[0] : null,
        });
    } catch (error) {
        console.error('Error saving bank account:', error);
        
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

