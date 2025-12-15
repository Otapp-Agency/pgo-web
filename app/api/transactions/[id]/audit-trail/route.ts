import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * GET /api/transactions/[id]/audit-trail
 * Get audit trail for a transaction
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

        const { id: transactionUid } = await params;

        if (!transactionUid?.trim()) {
            return NextResponse.json(
                { error: 'Transaction UID is required' },
                { status: 400 }
            );
        }

        // Build the URL for audit trail endpoint
        const endpoint = buildEndpointUrl.transactionAuditTrail(transactionUid);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Transactions Audit Trail API] Fetching:', url);

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
                message: response.statusText || 'Failed to fetch audit trail',
            }));

            console.error('[Transactions Audit Trail API] Error:', {
                status: response.status,
                errorData,
            });

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch audit trail' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Handle both array and wrapped responses
        // Backend returns { status, statusCode, message, data: string[] }
        // Use optional chaining to safely handle null or non-object responses
        const auditTrailData = Array.isArray(data) ? data : (data?.data || []);

        // First pass: Find the first valid timestamp to use as base for synthetic timestamps
        // This ensures deterministic synthetic timestamps that preserve sequence
        let foundBaseTimestamp: number | null = null;
        for (const entry of auditTrailData) {
            if (typeof entry === 'string') {
                try {
                    const parsed = JSON.parse(entry);
                    if (typeof parsed === 'object' && parsed !== null && parsed.timestamp) {
                        const ts = new Date(parsed.timestamp).getTime();
                        if (!isNaN(ts)) {
                            foundBaseTimestamp = ts;
                            break;
                        }
                    }
                } catch {
                    // Not JSON or invalid, continue
                }
            } else if (typeof entry === 'object' && entry !== null) {
                const obj = entry as Record<string, unknown>;
                if (obj.timestamp) {
                    const ts = new Date(obj.timestamp as string).getTime();
                    if (!isNaN(ts)) {
                        foundBaseTimestamp = ts;
                        break;
                    }
                }
            }
        }
        // If no valid timestamp found, use current time as base
        // This ensures baseTimestamp is always a number (not null)
        const baseTimestamp = foundBaseTimestamp ?? Date.now();

        // Transform string array into structured objects for the UI
        // Each string entry becomes an audit record with action and timestamp
        // Note: Schema expects numeric IDs (z.number().optional()), but we generate sequential numeric IDs
        // since the backend doesn't provide them. We use index-based IDs to match schema expectations.
        const transformedAuditTrail = auditTrailData.map((entry: unknown, index: number) => {
            // Use index-based numeric ID to match schema (z.number().optional())
            // Add timestamp to ensure uniqueness if needed, but keep as number
            const uniqueId = index + 1;
            // Generate deterministic synthetic timestamp: base + (index * 1000ms) to preserve sequence
            const syntheticTimestamp = new Date(baseTimestamp + (index * 1000)).toISOString();

            if (typeof entry === 'string') {
                // Try to parse as JSON first (in case it's a JSON string)
                try {
                    const parsed = JSON.parse(entry);
                    if (typeof parsed === 'object' && parsed !== null) {
                        // Ensure ID is numeric if present
                        const parsedId = parsed.id;
                        const numericId = typeof parsedId === 'number' ? parsedId :
                            (typeof parsedId === 'string' && /^\d+$/.test(parsedId) ? parseInt(parsedId, 10) : uniqueId);
                        // Use parsed timestamp if valid, otherwise use synthetic timestamp
                        const timestamp = parsed.timestamp && !isNaN(new Date(parsed.timestamp).getTime())
                            ? parsed.timestamp
                            : syntheticTimestamp;
                        return {
                            id: numericId,
                            action: parsed.action || 'CHANGE',
                            timestamp,
                            ...parsed,
                        };
                    }
                } catch {
                    // Not JSON, treat as plain text message
                }

                // Plain string - convert to object
                // Try to extract action from string format "ACTION: details"
                const colonIndex = entry.indexOf(':');
                // Only extract action if colon is in first 50 chars (prevents treating descriptions with colons as actions)
                if (colonIndex > 0 && colonIndex < 50) {
                    const action = entry.substring(0, colonIndex).trim().toUpperCase();
                    const details = entry.substring(colonIndex + 1).trim();
                    return {
                        id: uniqueId,
                        action: action || 'CHANGE',
                        reason: details,
                        timestamp: syntheticTimestamp,
                    };
                }

                return {
                    id: uniqueId,
                    action: 'CHANGE',
                    reason: entry,
                    timestamp: syntheticTimestamp,
                };
            }

            // Already an object - ensure it has required fields
            if (typeof entry === 'object' && entry !== null) {
                const obj = entry as Record<string, unknown>;
                // Ensure ID is numeric if present
                const objId = obj.id;
                const numericId = typeof objId === 'number' ? objId :
                    (typeof objId === 'string' && /^\d+$/.test(objId) ? parseInt(objId, 10) : uniqueId);
                // Use existing timestamp if valid, otherwise use synthetic timestamp
                const timestamp = obj.timestamp && typeof obj.timestamp === 'string' && !isNaN(new Date(obj.timestamp).getTime())
                    ? obj.timestamp
                    : syntheticTimestamp;
                return {
                    id: numericId,
                    action: 'CHANGE',
                    timestamp,
                    ...obj,
                };
            }

            // Fallback
            return {
                id: uniqueId,
                action: 'CHANGE',
                reason: String(entry),
                timestamp: syntheticTimestamp,
            };
        });

        return NextResponse.json(transformedAuditTrail);
    } catch (error) {
        console.error('[Transactions Audit Trail API] Error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

