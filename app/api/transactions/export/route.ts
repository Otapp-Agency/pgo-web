import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

// Valid export formats (only csv and excel use POST)
const VALID_FORMATS = ['csv', 'excel'] as const;
type ExportFormat = typeof VALID_FORMATS[number];

// Map format to backend endpoint
const FORMAT_ENDPOINT_MAP: Record<ExportFormat, string> = {
    csv: API_ENDPOINTS.transactions.exportCsv,
    excel: API_ENDPOINTS.transactions.exportExcel,
};

// Map format to Content-Type
const FORMAT_CONTENT_TYPE_MAP: Record<ExportFormat, string> = {
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Map format to file extension
const FORMAT_EXTENSION_MAP: Record<ExportFormat, string> = {
    csv: 'csv',
    excel: 'xlsx',
};

/**
 * Search criteria interface matching the backend expected format
 */
interface TransactionSearchCriteria {
    internalTransactionId?: string;
    externalTransactionId?: string;
    merchantTransactionId?: string;
    merchantId?: string;
    merchantName?: string;
    status?: string;
    statuses?: string[];
    errorCode?: string;
    responseCode?: string;
    paymentGatewayCode?: string;
    paymentGatewayName?: string;
    paymentChannelType?: string;
    provider?: string;
    paymentMethod?: string;
    payCode?: string;
    minAmount?: string;
    maxAmount?: string;
    currency?: string;
    currencies?: string[];
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    createdFrom?: string;
    createdTo?: string;
    statusUpdatedFrom?: string;
    statusUpdatedTo?: string;
    accountNumber?: string;
    ipAddress?: string;
    deviceId?: string;
    includeProduction?: string;
    includeTest?: string;
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
    includeDisbursements?: string;
    includeAuditTrail?: string;
}

/**
 * POST /api/transactions/export
 * Export transactions using POST with search criteria body
 * Query param: format=csv|excel
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

        // Extract and validate format parameter from query string
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format')?.toLowerCase();

        if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
            return NextResponse.json(
                { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
                { status: 400 }
            );
        }

        const exportFormat = format as ExportFormat;

        // Parse search criteria from request body
        const body = await request.json().catch(() => ({}));

        // Build search criteria for backend
        const searchCriteria: TransactionSearchCriteria = {};

        // Map frontend filter names to backend search criteria
        if (body.searchTerm) {
            searchCriteria.searchTerm = body.searchTerm;
        }
        if (body.search) {
            // Alternative field name from frontend
            searchCriteria.searchTerm = body.search;
        }
        if (body.status) {
            searchCriteria.status = body.status;
        }
        if (body.statuses && Array.isArray(body.statuses)) {
            searchCriteria.statuses = body.statuses;
        }

        // Date range - convert to LocalDateTime format if needed
        if (body.start_date || body.createdFrom) {
            const startDate = body.createdFrom || body.start_date;
            // If it's just a date (YYYY-MM-DD), add time component
            searchCriteria.createdFrom = startDate.includes('T') 
                ? startDate 
                : `${startDate}T00:00:00`;
        }
        if (body.end_date || body.createdTo) {
            const endDate = body.createdTo || body.end_date;
            // If it's just a date (YYYY-MM-DD), add time component
            searchCriteria.createdTo = endDate.includes('T') 
                ? endDate 
                : `${endDate}T23:59:59`;
        }

        // Amount range
        if (body.amount_min || body.minAmount) {
            searchCriteria.minAmount = body.minAmount || body.amount_min;
        }
        if (body.amount_max || body.maxAmount) {
            searchCriteria.maxAmount = body.maxAmount || body.amount_max;
        }

        // Sorting
        if (body.sortBy) {
            searchCriteria.sortBy = body.sortBy;
        }
        if (body.sortDirection) {
            searchCriteria.sortDirection = body.sortDirection;
        }
        // Handle sort array format from frontend (e.g., ["field,asc"])
        if (body.sort && Array.isArray(body.sort) && body.sort.length > 0) {
            const [sortBy, sortDirection] = body.sort[0].split(',');
            if (sortBy) searchCriteria.sortBy = sortBy;
            if (sortDirection) searchCriteria.sortDirection = sortDirection.toUpperCase();
        }

        // Pass through any other valid search criteria fields
        const passthroughFields: (keyof TransactionSearchCriteria)[] = [
            'internalTransactionId',
            'externalTransactionId',
            'merchantTransactionId',
            'merchantId',
            'merchantName',
            'errorCode',
            'responseCode',
            'paymentGatewayCode',
            'paymentGatewayName',
            'paymentChannelType',
            'provider',
            'paymentMethod',
            'payCode',
            'currency',
            'currencies',
            'customerName',
            'customerEmail',
            'customerPhone',
            'statusUpdatedFrom',
            'statusUpdatedTo',
            'accountNumber',
            'ipAddress',
            'deviceId',
            'includeProduction',
            'includeTest',
            'includeDisbursements',
            'includeAuditTrail',
        ];

        passthroughFields.forEach((field) => {
            if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
                (searchCriteria as Record<string, unknown>)[field] = body[field];
            }
        });

        // Build the backend URL
        const backendEndpoint = FORMAT_ENDPOINT_MAP[exportFormat];
        const url = `${API_CONFIG.baseURL}${backendEndpoint}`;

        console.log('[Transactions Export API] Exporting:', url);
        console.log('[Transactions Export API] Criteria:', JSON.stringify(searchCriteria, null, 2).substring(0, 500));

        // Fetch from backend API using POST
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(searchCriteria),
            cache: 'no-store',
        });

        if (!response.ok) {
            // Try to parse error response as JSON, fallback to text
            const errorData = await response.json().catch(async () => {
                const text = await response.text().catch(() => '');
                return { message: text || response.statusText || 'Failed to export transactions' };
            });

            console.error('[Transactions Export API] Error:', response.status, errorData);
            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to export transactions' },
                { status: response.status }
            );
        }

        // Get the file content as blob
        const blob = await response.blob();

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `transactions-${timestamp}.${FORMAT_EXTENSION_MAP[exportFormat]}`;

        console.log('[Transactions Export API] Export successful, filename:', filename);

        // Return file download with appropriate headers
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': FORMAT_CONTENT_TYPE_MAP[exportFormat],
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[Transactions Export API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
