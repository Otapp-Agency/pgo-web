import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * GET /api/transactions/[id]/processing-history
 * Get processing history for a transaction
 * 
 * Note: Backend returns data as array of strings, not structured objects
 */
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

        const { id: transactionId } = await params;

        if (!transactionId?.trim()) {
            return NextResponse.json(
                { error: 'Transaction ID is required' },
                { status: 400 }
            );
        }

        // CRITICAL: Backend /admin/v1/transactions/{id}/processing-history endpoint ONLY accepts numeric Long IDs (integer($int64))
        // Validate that the ID is numeric (all digits)
        const isNumericId = /^\d+$/.test(transactionId);

        if (!isNumericId) {
            return NextResponse.json(
                {
                    error: 'Invalid transaction ID format. The processing history endpoint requires a numeric ID (database ID), not a UID or merchant transaction ID.',
                    details: `Received: "${transactionId}". Expected: numeric ID (e.g., "12345")`
                },
                { status: 400 }
            );
        }

        // Build the URL for processing history endpoint
        const endpoint = buildEndpointUrl.transactionProcessingHistory(transactionId);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Transactions Processing History API] Fetching:', url);

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
                message: response.statusText || 'Failed to fetch processing history',
            }));

            console.error('[Transactions Processing History API] Error:', {
                status: response.status,
                errorData,
            });

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch processing history' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle both array and wrapped responses
        // Backend returns { status, statusCode, message, data: string[] }
        // Use optional chaining to safely handle null or non-object responses
        const historyData = Array.isArray(data) ? data : (data?.data || []);

        // Transform string array into structured objects for the UI
        // Each string entry becomes a history record with message and timestamp
        // Note: Schema expects numeric IDs (z.number().optional()), but we generate sequential numeric IDs
        // since the backend doesn't provide them. We use index-based IDs to match schema expectations.
        const transformedHistory = historyData.map((entry: unknown, index: number) => {
            // Use index-based numeric ID to match schema (z.number().optional())
            // Add timestamp to ensure uniqueness if needed, but keep as number
            const uniqueId = index + 1;

            if (typeof entry === 'string') {
                // Try to parse as JSON first (in case it's a JSON string)
                try {
                    const parsed = JSON.parse(entry);
                    if (typeof parsed === 'object' && parsed !== null) {
                        // Ensure ID is numeric if present
                        const parsedId = parsed.id;
                        const numericId = typeof parsedId === 'number' ? parsedId :
                            (typeof parsedId === 'string' && /^\d+$/.test(parsedId) ? parseInt(parsedId, 10) : uniqueId);
                        return {
                            id: numericId,
                            status: parsed.status || 'INFO',
                            message: parsed.message || entry,
                            timestamp: parsed.timestamp || new Date().toISOString(),
                            ...parsed,
                        };
                    }
                } catch {
                    // Not JSON, treat as plain text message
                }

                // Plain string - convert to object
                return {
                    id: uniqueId,
                    status: 'INFO',
                    message: entry,
                    timestamp: new Date().toISOString(),
                };
            }

            // Already an object - ensure it has required fields
            if (typeof entry === 'object' && entry !== null) {
                const obj = entry as Record<string, unknown>;
                // Ensure ID is numeric if present
                const objId = obj.id;
                const numericId = typeof objId === 'number' ? objId :
                    (typeof objId === 'string' && /^\d+$/.test(objId) ? parseInt(objId, 10) : uniqueId);
                return {
                    id: numericId,
                    status: 'INFO',
                    timestamp: new Date().toISOString(),
                    ...obj,
                };
            }

            // Fallback
            return {
                id: uniqueId,
                status: 'INFO',
                message: String(entry),
                timestamp: new Date().toISOString(),
            };
        });

        return NextResponse.json(transformedHistory);
    } catch (error) {
        console.error('[Transactions Processing History API] Error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

