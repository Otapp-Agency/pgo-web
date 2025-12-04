/**
 * API Configuration for PGO Engine Web
 * Based on live API documentation: https://pgo-api.otapp.live/api/swagger-ui/index.html?urls.primaryName=all
 */

export const API_CONFIG = {
  // Live API base URL from Swagger documentation
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://pgo.otapp.live/api",

  // Request configuration
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000"),
  retries: parseInt(process.env.NEXT_PUBLIC_API_RETRIES || "3"),

  // Default headers
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },

  // Authentication headers (will be set dynamically)
  authHeaders: {
    Authorization: "", // Will be set to 'Bearer <token>'
    "X-REFRESH-TOKEN": "", // For token refresh
  },
};

export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    resetPassword: "/auth/users/{userId}/password/reset", // Admin-initiated password reset
    changePassword: "/admin/v1/users/change-password", // User change own password
  },

  // User Management endpoints (Admin)
  users: {
    list: "/admin/v1/users",
    create: "/admin/v1/users",
    getById: "/admin/v1/users/{id}",
    getByUid: "/admin/v1/users/uid/{uid}",
    update: "/admin/v1/users/uid/{uid}",
    delete: "/admin/v1/users/{id}",
    search: "/admin/v1/users/search",
    count: "/admin/v1/users/count",
    activate: "/admin/v1/users/uid/{uid}/activate",
    deactivate: "/admin/v1/users/uid/{uid}/deactivate",
    lock: "/admin/v1/users/uid/{uid}/lock",
    unlock: "/admin/v1/users/uid/{uid}/unlock",
    resetPassword: "/admin/v1/users/uid/{uid}/reset-password",
    updateLastLogin: "/admin/v1/users/uid/{uid}/last-login",
    assignRoles: "/admin/v1/users/uid/{uid}/roles",
    removeRoles: "/admin/v1/users/uid/{uid}/roles",
  },

  // Role Management endpoints (Admin)
  roles: {
    list: "/admin/v1/roles",
    create: "/admin/v1/roles",
    getById: "/admin/v1/roles/{id}",
    getByName: "/admin/v1/roles/name/{name}",
    update: "/admin/v1/roles/{id}",
    delete: "/admin/v1/roles/{id}",
    exists: "/admin/v1/roles/exists/{name}",
    available: "/admin/v1/roles/available",
    all: "/admin/v1/roles/all",
  },

  // Transaction Management endpoints
  transactions: {
    // Core operations
    list: "/admin/v1/transactions",
    getById: "/admin/v1/transactions/{id}",
    search: "/admin/v1/transactions/search",
    summary: "/admin/v1/transactions/summary",

    // Transaction actions
    updateStatus: "/admin/v1/transactions/{id}/status",
    retry: "/admin/v1/transactions/{id}/retry",
    refund: "/admin/v1/transactions/{id}/refund",
    complete: "/admin/v1/transactions/{id}/complete",
    cancel: "/admin/v1/transactions/{id}/cancel",

    // Statistics
    volumeStats: "/admin/v1/transactions/stats/volume",
    statusStats: "/admin/v1/transactions/stats/status",
    gatewayStats: "/admin/v1/transactions/stats/gateway",
    dailyStats: "/admin/v1/transactions/stats/daily",

    // Filtering
    byStatus: "/admin/v1/transactions/status/{status}",
    byMerchant: "/admin/v1/transactions/merchant/{merchantId}",
    byGateway: "/admin/v1/transactions/gateway/{gatewayCode}",
    byDateRange: "/admin/v1/transactions/date-range",
    byAmountRange: "/admin/v1/transactions/amount-range",

    // Additional features
    processingHistory: "/admin/v1/transactions/{id}/processing-history",
    auditTrail: "/admin/v1/transactions/{id}/audit-trail",
    canUpdate: "/admin/v1/transactions/{id}/can-update",
    stale: "/admin/v1/transactions/stale",
    pending: "/admin/v1/transactions/pending",
    failed: "/admin/v1/transactions/failed",

    // Export
    export: "/admin/v1/transactions/export",
    exportExcel: "/admin/v1/transactions/export/excel",
    exportCsv: "/admin/v1/transactions/export/csv",
    exportPdf: "/admin/v1/transactions/export/pdf",

    // Utility
    exists: "/admin/v1/transactions/exists/{internalTransactionId}",
    countByStatus: "/admin/v1/transactions/count/status/{status}",
    amountByStatus: "/admin/v1/transactions/amount/status/{status}",
    processStale: "/admin/v1/transactions/stale/process",
    archive: "/admin/v1/transactions/archive",
  },

  // Disbursement Management endpoints
  disbursements: {
    // Core operations
    list: "/admin/v1/disbursements",
    getById: "/admin/v1/disbursements/{id}",
    getByUid: "/admin/v1/disbursements/uid/{uid}",
    search: "/admin/v1/disbursements/search",
    summary: "/admin/v1/disbursements/summary",

    // Actions
    updateStatus: "/admin/v1/disbursements/{id}/status",
    retry: "/admin/v1/disbursements/{id}/retry",
    forceRetry: "/admin/v1/disbursements/{id}/retry-by-id",
    complete: "/admin/v1/disbursements/{id}/complete",
    cancel: "/admin/v1/disbursements/{id}/cancel",

    // Statistics
    volumeStats: "/admin/v1/disbursements/stats/volume",
    statusStats: "/admin/v1/disbursements/stats/status",
    gatewayStats: "/admin/v1/disbursements/stats/gateway",
    dailyStats: "/admin/v1/disbursements/stats/daily",

    // Filtering
    byStatus: "/admin/v1/disbursements/status/{status}",
    byMerchant: "/admin/v1/disbursements/merchant/{merchantId}",
    byGateway: "/admin/v1/disbursements/gateway/{gatewayCode}",
    byDateRange: "/admin/v1/disbursements/date-range",
    byAmountRange: "/admin/v1/disbursements/amount-range",
    byTransaction: "/admin/v1/disbursements/transaction/{transactionId}",
    byExternalId: "/admin/v1/disbursements/external/{externalId}",

    // Additional features
    processingHistory: "/admin/v1/disbursements/{id}/processing-history",
    auditTrail: "/admin/v1/disbursements/{id}/audit-trail",
    canUpdate: "/admin/v1/disbursements/{id}/can-update",
    stale: "/admin/v1/disbursements/stale",
    pending: "/admin/v1/disbursements/pending",
    failed: "/admin/v1/disbursements/failed",

    // Export
    exportExcel: "/admin/v1/disbursements/export/excel",
    exportCsv: "/admin/v1/disbursements/export/csv",

    // Utility
    exists: "/admin/v1/disbursements/exists/{externalTransactionId}",
    countByStatus: "/admin/v1/disbursements/count/status/{status}",
    amountByStatus: "/admin/v1/disbursements/amount/status/{status}",
    processStale: "/admin/v1/disbursements/stale/process",
    archive: "/admin/v1/disbursements/archive",
    merchantSummary: "/admin/v1/disbursements/merchant/{merchantId}/summary",
    merchantAll: "/admin/v1/disbursements/merchant/{merchantId}/all",
  },

  // Merchant Management endpoints
  merchants: {
    // Core operations
    list: "/admin/v1/merchants",
    getAll: "/admin/v1/merchants/all",
    getById: "/admin/v1/merchants/{id}",
    getByUid: "/admin/v1/merchants/uid/{uid}",
    create: "/admin/v1/merchants",
    update: "/admin/v1/merchants/uid/{uid}",
    delete: "/admin/v1/merchants/uid/{uid}",
    count: "/admin/v1/merchants/count",
    search: "/admin/v1/merchants/search",

    // API Keys Management
    getApiKeys: "/admin/v1/merchants/uid/{uid}/api-keys",
    createApiKey: "/admin/v1/merchants/uid/{uid}/api-keys",
    revokeApiKey: "/admin/v1/merchants/uid/{uid}/api-keys/{apiKey}",

    // Status Management
    activate: "/admin/v1/merchants/uid/{uid}/activate",
    deactivate: "/admin/v1/merchants/uid/{uid}/deactivate",
    verifyKYC: "/admin/v1/merchants/uid/{uid}/verify-kyc",
    updateStatus: "/admin/v1/merchants/uid/{uid}/status",

    // Bank Accounts
    bankAccounts: "/admin/v1/merchants/uid/{uid}/bank-accounts",
    deactivateBankAccount: "/admin/v1/merchants/uid/{uid}/bank-accounts/{bankAccountUid}",

    // Filtering
    byStatus: "/admin/v1/merchants/status/{status}",
    byType: "/admin/v1/merchants/type/{type}",
    byKYCStatus: "/admin/v1/merchants/kyc/{verified}",
    byDateRange: "/admin/v1/merchants/date-range",

    // Statistics
    stats: "/admin/v1/merchants/stats",
    volumeStats: "/admin/v1/merchants/stats/volume",
    statusStats: "/admin/v1/merchants/stats/status",
    typeStats: "/admin/v1/merchants/stats/type",
    kycStats: "/admin/v1/merchants/stats/kyc",

    // Export
    export: "/admin/v1/merchants/export",
    exportExcel: "/admin/v1/merchants/export/excel",
    exportCsv: "/admin/v1/merchants/export/csv",

    // Utility
    exists: "/admin/v1/merchants/exists/{code}",
    validateCode: "/admin/v1/merchants/validate-code/{code}",
    lookup: "/admin/v1/merchants/lookup",

    // Sub-merchants and Relationships
    subMerchants: "/admin/v1/merchants/uid/{uid}/sub-merchants",
    updateParent: "/admin/v1/merchants/uid/{uid}/parent",

    // Activity
    activity: "/admin/v1/merchants/uid/{uid}/activity",
  },

  // Payment Gateways endpoints
  paymentGateways: {
    list: "/admin/v1/payment-gateways",
    getById: "/admin/v1/payment-gateways/{id}",
    create: "/admin/v1/payment-gateways",
    update: "/admin/v1/payment-gateways/{id}",
    delete: "/admin/v1/payment-gateways/{id}",
    getAll: "/admin/v1/payment-gateways/all",
    activate: "/admin/v1/payment-gateways/uid/{uid}/activate",
    deactivate: "/admin/v1/payment-gateways/uid/{uid}/deactivate",

    // status
    status: "/admin/v1/payment-gateways/{id}/status",

    // available  
    available: "/admin/v1/available-payment-gateways",
  },

  // Reports endpoints
  reports: {
    transactionsMonthly: "/admin/v1/reports/transactions/monthly",
    disbursementsMonthly: "/admin/v1/reports/disbursements/monthly",
  },

  // Logs endpoints
  logs: {
    auditLogs: "/admin/v1/audit-logs"
  },

  // Dashboard endpoints
  dashboard: {
    stats: "/admin/v1/dashboard/stats",
  },
};

export const PAGINATION_DEFAULTS = {
  page: 0,
  size: 10,
  sort: ["username,asc"],
};

export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
};