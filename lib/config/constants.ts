/**
 * Centralized Application Constants
 * All time durations, pagination defaults, and cache settings
 */

// =============================================================================
// TIME CONSTANTS (in milliseconds unless otherwise noted)
// =============================================================================

/**
 * Session Configuration
 */
export const SESSION = {
    /** Session cookie expiry time (5 hours) */
    EXPIRY_MS: 5 * 60 * 60 * 1000,
    /** Session cookie expiry as string for JWT (5h) */
    EXPIRY_STRING: '5h',
} as const;

/**
 * JWT Configuration
 */
export const JWT = {
    /** JWT token expiry time (7 days) */
    EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
    /** JWT expiry as string for jose library */
    EXPIRY_STRING: '7d',
} as const;

/**
 * API Request Configuration
 */
export const API_TIMEOUT = {
    /** Default API request timeout (10 seconds) */
    DEFAULT_MS: 10 * 1000,
    /** Long-running API request timeout (30 seconds) */
    LONG_MS: 30 * 1000,
} as const;

// =============================================================================
// TANSTACK QUERY CACHE SETTINGS
// =============================================================================

/**
 * Query Cache Times
 * staleTime: How long data is considered fresh (won't refetch)
 * gcTime: How long inactive data stays in cache (garbage collection)
 */
export const QUERY_CACHE = {
    /** Default stale time for list queries (30 seconds) */
    STALE_TIME_LIST: 30 * 1000,
    /** Stale time for detail/single item queries (60 seconds) */
    STALE_TIME_DETAIL: 60 * 1000,
    /** Stale time for static data like roles (5 minutes) */
    STALE_TIME_STATIC: 5 * 60 * 1000,
    /** Default garbage collection time (5 minutes) */
    GC_TIME_DEFAULT: 5 * 60 * 1000,
} as const;

// =============================================================================
// PAGINATION CONSTANTS
// =============================================================================

/**
 * Pagination Configuration
 * All pagination in this app uses 1-based page numbers
 */
export const PAGINATION = {
    /** Default page number (1-based) */
    DEFAULT_PAGE: 1,
    /** Default number of items per page */
    DEFAULT_PAGE_SIZE: 15,
    /** Available page size options */
    PAGE_SIZE_OPTIONS: [10, 15, 20, 30, 50] as const,
    /** Number of pages to prefetch ahead */
    PREFETCH_PAGES_AHEAD: 2,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PageSizeOption = (typeof PAGINATION.PAGE_SIZE_OPTIONS)[number];


// =============================================================================
// STATUS COLOR CONSTANTS
// =============================================================================

/**
 * Disbursement Statuses display, name, color, and description mapping
 */
export const STATUS_DISPLAY = {
    PENDING: {
        name: 'Pending',
        color: '#ffc107',
        description: 'Awaiting processing'
    },
    PROCESSING: {
        name: 'Processing',
        color: '#007bff',
        description: 'Currently being processed'
    },
    SUCCESS: {
        name: 'Successful',
        color: '#28a745',
        description: 'Funds successfully transferred'
    },
    FAILED: {
        name: 'Failed',
        color: '#dc3545',
        description: 'Disbursement attempt failed'
    },
    CANCELLED: {
        name: 'Cancelled',
        color: '#6c757d',
        description: 'Cancelled before processing'
    },
    RETRY_ATTEMPTED: {
        name: 'Retry Attempted',
        color: '#fd7e14',
        description: 'A retry has been attempted'
    },
    CHAINED: {
        name: 'Chained',
        color: '#6f42c1',
        description: 'Part of a retry chain'
    },
    REJECTED: {
        name: 'Rejected',
        color: '#dc3545',
        description: 'Permanently rejected by PSP'
    },
    REVERSED: {
        name: 'Reversed',
        color: '#fd7e14',
        description: 'Funds returned after success'
    },
    REIMBURSED: {
        name: 'Reimbursed',
        color: '#17a2b8',
        description: 'Manually compensated'
    },
    EXPIRED: {
        name: 'Expired',
        color: '#6c757d',
        description: 'Expired and no longer valid'
    },
    REFUNDED: {
        name: 'Refunded',
        color: '#007bff',
        description: 'Funds returned after cancellation'
    },
    ON_HOLD: {
        name: 'On Hold',
        color: '#6c757d',
        description: 'On Hold and no longer valid'
    }
} as const;
