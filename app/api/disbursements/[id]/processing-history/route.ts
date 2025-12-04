import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * GET /api/disbursements/[id]/processing-history
 * Get processing history for a disbursement
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

        const { id: disbursementId } = await params;

        if (!disbursementId?.trim()) {
            return NextResponse.json(
                { error: 'Disbursement ID is required' },
                { status: 400 }
            );
        }

        // Build the URL for processing history endpoint
        const endpoint = buildEndpointUrl.disbursementProcessingHistory(disbursementId);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Disbursements Processing History API] Fetching:', url);

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

            console.error('[Disbursements Processing History API] Error:', {
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
        const historyData = Array.isArray(data) ? data : (data.data || []);

        // Transform string array into structured objects for the UI
        // Each string entry becomes a history record with message and timestamp
        // Use crypto.randomUUID() for unique IDs to avoid key collisions after sorting
        const transformedHistory = historyData.map((entry: unknown, index: number) => {
            const uniqueId = `ph-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            if (typeof entry === 'string') {
                // Try to parse as JSON first (in case it's a JSON string)
                try {
                    const parsed = JSON.parse(entry);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return {
                            id: parsed.id || uniqueId,
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
                return {
                    id: obj.id || uniqueId,
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
        console.error('[Disbursements Processing History API] Error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

