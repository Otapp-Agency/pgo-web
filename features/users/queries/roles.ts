import { z } from 'zod';
import { RoleSchema } from '@/features/roles/types';

/**
 * Query keys factory for roles
 * Safe to import in both client and server components
 */
export const rolesKeys = {
    all: ['roles'] as const,
    list: () => [...rolesKeys.all, 'list'] as const,
};

/**
 * Client-side query options for roles list
 * Returns all available roles as a sorted array of strings (role names)
 */
export function rolesListQueryOptions() {
    const url = `/api/roles/all`;

    return {
        queryKey: rolesKeys.list(),
        queryFn: async (): Promise<string[]> => {
            // Use absolute URL - construct it based on environment
            let fullUrl: string;
            if (typeof window !== 'undefined') {
                // Client-side: use window.location.origin
                fullUrl = `${window.location.origin}${url}`;
            } else {
                // Server-side: this shouldn't happen if prefetch worked
                // But if it does, return empty array
                console.warn('QueryFn executed on server - prefetch may have failed');
                return [];
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || errorData.message || 'Failed to fetch roles'
                );
            }

            const responseData = await response.json();

            // Validate that response is an array of Role objects
            const roles = z.array(RoleSchema).parse(responseData);

            // Extract role names and return as sorted array of strings
            const roleNames = roles.map(role => role.name).sort();

            return roleNames;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - roles don't change frequently
    };
}









