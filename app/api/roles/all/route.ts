import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';
import { RoleSchema } from '@/features/roles/types';
import { z } from 'zod';

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

        // Build the URL for the all roles endpoint
        const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.roles.all}`;

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
                message: response.statusText || 'Failed to fetch roles',
            }));

            return NextResponse.json(
                { error: errorData.message || errorData.error || 'Failed to fetch roles' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Backend API returns: { status, statusCode, message, data: Role[] }
        // We need to return: Role[] (array of Role objects)
        if (data.data && Array.isArray(data.data)) {
            // Validate and parse roles data
            const parsedData = z.array(RoleSchema).parse(data.data);

            return NextResponse.json(parsedData);
        } else if (Array.isArray(data)) {
            // Handle legacy format: just an array
            const parsedData = z.array(RoleSchema).parse(data);

            return NextResponse.json(parsedData);
        } else {
            // Fallback: empty array
            return NextResponse.json([]);
        }
    } catch (error) {
        console.error('Error fetching all roles:', error);
        
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data format', details: error.errors },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

