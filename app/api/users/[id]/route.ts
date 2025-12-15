import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/services/auth.service';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/config/api';

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

    const { id: userUid } = await params;

    // Build the URL with user UID
    const url = `${API_CONFIG.baseURL}${API_ENDPOINTS.users.getByUid.replace('{uid}', userUid)}`;

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
        message: response.statusText || 'Failed to fetch user',
      }));

      return NextResponse.json(
        { error: errorData.message || errorData.error || 'Failed to fetch user' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the user data
    // Backend API should return a single user object matching the UserSchema
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

