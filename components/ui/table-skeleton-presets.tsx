import { TableColumnSkeleton } from './table-skeleton';

/**
 * Predefined column configurations for common table structures
 * These can be imported and used directly or customized
 */

export const TRANSACTIONS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // Transaction ID
    { width: '', type: 'text-multi', lines: 2 }, // Customer
    { width: '', type: 'amount', align: 'right' }, // Amount
    { width: '', type: 'badge' }, // Status
    { width: '', type: 'text-multi', lines: 2 }, // Merchant
    { width: '', type: 'text' }, // PGO
    { width: '', type: 'text' }, // Created
    { width: 'w-8', type: 'button' }, // Actions
];

export const DISBURSEMENTS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // Transaction ID
    { width: '', type: 'text-multi', lines: 2 }, // Customer
    { width: '', type: 'amount', align: 'right' }, // Amount
    { width: '', type: 'badge' }, // Status
    { width: '', type: 'text-multi', lines: 2 }, // Merchant
    { width: '', type: 'text' }, // PGO
    { width: '', type: 'text' }, // Created
    { width: 'w-8', type: 'button' }, // Actions
];

export const MERCHANTS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // Code
    { width: '', type: 'text' }, // Name
    { width: '', type: 'text' }, // Type
    { width: '', type: 'badge' }, // Status
    { width: '', type: 'badge' }, // KYC Status
    { width: '', type: 'text' }, // Created
    { width: 'w-8', type: 'button' }, // Actions
];

export const USERS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // Username
    { width: '', type: 'text' }, // Email
    { width: '', type: 'text' }, // Role
    { width: '', type: 'badge' }, // Status
    { width: '', type: 'text' }, // Merchant
    { width: '', type: 'text' }, // Last Login
    { width: 'w-8', type: 'button' }, // Actions
];

export const LOGS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: 'w-[180px]', type: 'text' }, // Audit Log ID
    { width: 'w-[200px]', type: 'badge' }, // Action
    { width: 'w-[200px]', type: 'text' }, // Username
    { width: 'w-[400px]', type: 'text' }, // Description
    { width: 'w-[150px]', type: 'text' }, // IP Address
    { width: 'w-[160px]', type: 'text' }, // Timestamp
    { width: 'w-8', type: 'button' }, // Actions
];

export const PAYMENT_GATEWAYS_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // Code
    { width: '', type: 'text' }, // Name
    { width: '', type: 'badge' }, // Supported Methods
    { width: '', type: 'badge' }, // Status
    { width: '', type: 'text' }, // Created
    { width: 'w-8', type: 'button' }, // Actions
];

export const ROLES_TABLE_COLUMNS: TableColumnSkeleton[] = [
    { width: 'w-8', type: 'checkbox', align: 'center' },
    { width: '', type: 'text' }, // ID
    { width: '', type: 'badge' }, // Name
    { width: '', type: 'text' }, // Display Name
    { width: '', type: 'text' }, // Description
    { width: 'w-8', type: 'button' }, // Actions
];



