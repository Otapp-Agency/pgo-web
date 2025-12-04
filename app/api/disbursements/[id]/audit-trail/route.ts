import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG } from '@/lib/config/api';
import { buildEndpointUrl } from '@/lib/config/endpoints';

/**
 * GET /api/disbursements/[id]/audit-trail
 * Get audit trail for a disbursement
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

        // Build the URL for audit trail endpoint
        const endpoint = buildEndpointUrl.disbursementAuditTrail(disbursementId);
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        console.log('[Disbursements Audit Trail API] Fetching:', url);

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

            console.error('[Disbursements Audit Trail API] Error:', {
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
        const auditTrailData = Array.isArray(data) ? data : (data.data || []);
        
        // Transform string array into structured objects for the UI
        // Each string entry becomes an audit record with action and timestamp
        // Use unique IDs to avoid key collisions after sorting
        const transformedAuditTrail = auditTrailData.map((entry: unknown, index: number) => {
            const uniqueId = `at-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            if (typeof entry === 'string') {
                // Try to parse as JSON first (in case it's a JSON string)
                try {
                    const parsed = JSON.parse(entry);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return {
                            id: parsed.id || uniqueId,
                            action: parsed.action || 'CHANGE',
                            timestamp: parsed.timestamp || new Date().toISOString(),
                            ...parsed,
                        };
                    }
                } catch {
                    // Not JSON, treat as plain text message
                }
                
                // Plain string - convert to object
                // Try to extract action from string format "ACTION: details"
                const colonIndex = entry.indexOf(':');
                if (colonIndex > 0 && colonIndex < 30) {
                    const action = entry.substring(0, colonIndex).trim().toUpperCase();
                    const details = entry.substring(colonIndex + 1).trim();
                    return {
                        id: uniqueId,
                        action: action || 'CHANGE',
                        reason: details,
                        timestamp: new Date().toISOString(),
                    };
                }
                
                return {
                    id: uniqueId,
                    action: 'CHANGE',
                    reason: entry,
                    timestamp: new Date().toISOString(),
                };
            }
            
            // Already an object - ensure it has required fields
            if (typeof entry === 'object' && entry !== null) {
                const obj = entry as Record<string, unknown>;
                return {
                    id: obj.id || uniqueId,
                    action: 'CHANGE',
                    timestamp: new Date().toISOString(),
                    ...obj,
                };
            }
            
            // Fallback
            return {
                id: uniqueId,
                action: 'CHANGE',
                reason: String(entry),
                timestamp: new Date().toISOString(),
            };
        });

        return NextResponse.json(transformedAuditTrail);
    } catch (error) {
        console.error('[Disbursements Audit Trail API] Error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

