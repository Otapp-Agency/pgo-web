// Export Disbursements
// POST /api/disbursements/export
// Exports filtered disbursement data using search criteria.
// Query Parameters: format (csv, excel)

import { DisbursementListParams } from './disbursements';

export type ExportFormat = 'csv' | 'excel';

export interface ExportDisbursementsParams extends DisbursementListParams {
    format: ExportFormat;
}

/**
 * Search criteria interface for export (matches backend expected format)
 */
interface DisbursementSearchCriteria {
    searchTerm?: string;
    status?: string;
    statuses?: string[];
    createdFrom?: string;
    createdTo?: string;
    minAmount?: string;
    maxAmount?: string;
    sortBy?: string;
    sortDirection?: string;
    merchantId?: string;
    merchantName?: string;
    internalTransactionId?: string;
    externalTransactionId?: string;
    merchantDisbursementId?: string;
    paymentGatewayCode?: string;
    paymentGatewayName?: string;
    pgoCode?: string;
}

/**
 * Export disbursements to a file
 * Uses POST request with search criteria body
 * @param params - Disbursement filter parameters plus format
 * @returns Promise that resolves when download is triggered
 */
export async function exportDisbursements(params: ExportDisbursementsParams): Promise<void> {
    const { format, ...filterParams } = params;

    // Validate format
    const validFormats: ExportFormat[] = ['csv', 'excel'];
    if (!validFormats.includes(format)) {
        throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Build search criteria from filter parameters
    const searchCriteria: DisbursementSearchCriteria = {};

    // Map frontend filter names to backend search criteria
    if (filterParams.search) {
        searchCriteria.searchTerm = filterParams.search;
    }
    if (filterParams.status) {
        searchCriteria.status = filterParams.status;
    }

    // Date range - convert to LocalDateTime format
    if (filterParams.start_date) {
        searchCriteria.createdFrom = filterParams.start_date.includes('T')
            ? filterParams.start_date
            : `${filterParams.start_date}T00:00:00`;
    }
    if (filterParams.end_date) {
        searchCriteria.createdTo = filterParams.end_date.includes('T')
            ? filterParams.end_date
            : `${filterParams.end_date}T23:59:59`;
    }

    // Amount range
    if (filterParams.amount_min) {
        searchCriteria.minAmount = filterParams.amount_min;
    }
    if (filterParams.amount_max) {
        searchCriteria.maxAmount = filterParams.amount_max;
    }

    // Sorting - parse sort array format
    if (filterParams.sort && Array.isArray(filterParams.sort) && filterParams.sort.length > 0) {
        const [sortBy, sortDirection] = filterParams.sort[0].split(',');
        if (sortBy) searchCriteria.sortBy = sortBy;
        if (sortDirection) searchCriteria.sortDirection = sortDirection.toUpperCase();
    }

    // Build the URL with format as query parameter
    const url = `/api/disbursements/export?format=${format}`;

    // Use absolute URL for client-side
    let fullUrl: string;
    if (typeof window !== 'undefined') {
        fullUrl = `${window.location.origin}${url}`;
    } else {
        throw new Error('exportDisbursements should only be called client-side');
    }

    // Fetch the file using POST with search criteria body
    const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchCriteria),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error || errorData.message || 'Failed to export disbursements'
        );
    }

    // Get the blob and trigger download
    const blob = await response.blob();

    // Extract filename from Content-Disposition header or generate one
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `disbursements-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format}`;

    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
            filename = filenameMatch[1];
        }
    }

    // Create download link and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
}

