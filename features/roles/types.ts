import { z } from 'zod';

/**
 * Role Schema
 * Matches the API response structure from /admin/v1/roles
 */
export const RoleSchema = z.object({
    id: z.number(),
    name: z.string(),
    displayName: z.string(),
    description: z.string(),
});

export type Role = z.infer<typeof RoleSchema>;

/**
 * Paginated Role Response
 * Matches the API response structure with pagination metadata
 */
export interface PaginatedRoleResponse {
    data: Role[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
}

/**
 * Role List Query Parameters
 * Used for filtering and pagination
 */
export interface RoleListParams {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string[];
}

