/**
 * API Endpoints Configuration
 * Maps endpoint paths and provides utility functions for dynamic URLs
 */

import { API_ENDPOINTS } from "./api";
import { ApiResponse } from "@/lib/types";

// Utility functions for building dynamic endpoint URLs
export const buildEndpointUrl = {
  // User endpoints with ID/UID replacement
  userById: (id: string) => API_ENDPOINTS.users.getById.replace("{id}", id),
  userByUid: (uid: string) =>
    API_ENDPOINTS.users.getByUid.replace("{uid}", uid),
  updateUser: (uid: string) => API_ENDPOINTS.users.update.replace("{uid}", uid),
  deleteUser: (id: string) => API_ENDPOINTS.users.delete.replace("{id}", id),
  activateUser: (uid: string) =>
    API_ENDPOINTS.users.activate.replace("{uid}", uid),
  deactivateUser: (uid: string) =>
    API_ENDPOINTS.users.deactivate.replace("{uid}", uid),
  lockUser: (uid: string) => API_ENDPOINTS.users.lock.replace("{uid}", uid),
  unlockUser: (uid: string) => API_ENDPOINTS.users.unlock.replace("{uid}", uid),
  resetUserPassword: (uid: string) =>
    API_ENDPOINTS.users.resetPassword.replace("{uid}", uid),
  assignUserRoles: (uid: string) =>
    API_ENDPOINTS.users.assignRoles.replace("{uid}", uid),
  removeUserRoles: (uid: string) =>
    API_ENDPOINTS.users.removeRoles.replace("{uid}", uid),

  // Auth endpoints with ID replacement
  adminResetPassword: (userId: string) =>
    API_ENDPOINTS.auth.resetPassword.replace("{userId}", userId),

  // Transaction endpoints
  transactionById: (id: string) =>
    API_ENDPOINTS.transactions.getById.replace("{id}", id),
  updateTransactionStatus: (id: string) =>
    API_ENDPOINTS.transactions.updateStatus.replace("{id}", id),
  retryTransaction: (id: string) =>
    API_ENDPOINTS.transactions.retry.replace("{id}", id),
  refundTransaction: (id: string) =>
    API_ENDPOINTS.transactions.refund.replace("{id}", id),
  completeTransaction: (id: string) =>
    API_ENDPOINTS.transactions.complete.replace("{id}", id),
  cancelTransaction: (id: string) =>
    API_ENDPOINTS.transactions.cancel.replace("{id}", id),
  transactionProcessingHistory: (id: string) =>
    API_ENDPOINTS.transactions.processingHistory.replace("{id}", id),
  transactionAuditTrail: (id: string) =>
    API_ENDPOINTS.transactions.auditTrail.replace("{id}", id),
  transactionCanUpdate: (id: string) =>
    API_ENDPOINTS.transactions.canUpdate.replace("{id}", id),
  transactionsByStatus: (status: string) =>
    API_ENDPOINTS.transactions.byStatus.replace("{status}", status),
  transactionsByMerchant: (merchantId: string) =>
    API_ENDPOINTS.transactions.byMerchant.replace("{merchantId}", merchantId),
  transactionsByGateway: (gatewayCode: string) =>
    API_ENDPOINTS.transactions.byGateway.replace("{gatewayCode}", gatewayCode),
  transactionExists: (internalId: string) =>
    API_ENDPOINTS.transactions.exists.replace(
      "{internalTransactionId}",
      internalId
    ),
  transactionCountByStatus: (status: string) =>
    API_ENDPOINTS.transactions.countByStatus.replace("{status}", status),
  transactionAmountByStatus: (status: string) =>
    API_ENDPOINTS.transactions.amountByStatus.replace("{status}", status),

  // Disbursement endpoints with ID/parameter replacement
  disbursementById: (id: string) =>
    API_ENDPOINTS.disbursements.getById.replace("{id}", id),
  disbursementByUid: (uid: string) =>
    API_ENDPOINTS.disbursements.getByUid.replace("{uid}", uid),
  updateDisbursementStatus: (id: string) =>
    API_ENDPOINTS.disbursements.updateStatus.replace("{id}", id),
  retryDisbursement: (id: string) =>
    API_ENDPOINTS.disbursements.retry.replace("{id}", id),
  forceRetryDisbursement: (id: string) =>
    API_ENDPOINTS.disbursements.forceRetry.replace("{id}", id),
  completeDisbursement: (id: string) =>
    API_ENDPOINTS.disbursements.complete.replace("{id}", id),
  cancelDisbursement: (id: string) =>
    API_ENDPOINTS.disbursements.cancel.replace("{id}", id),
  disbursementProcessingHistory: (id: string) =>
    API_ENDPOINTS.disbursements.processingHistory.replace("{id}", id),
  disbursementAuditTrail: (id: string) =>
    API_ENDPOINTS.disbursements.auditTrail.replace("{id}", id),
  disbursementCanUpdate: (id: string) =>
    API_ENDPOINTS.disbursements.canUpdate.replace("{id}", id),
  disbursementsByStatus: (status: string) =>
    API_ENDPOINTS.disbursements.byStatus.replace("{status}", status),
  disbursementsByMerchant: (merchantId: string) =>
    API_ENDPOINTS.disbursements.byMerchant.replace("{merchantId}", merchantId),
  disbursementsByGateway: (gatewayCode: string) =>
    API_ENDPOINTS.disbursements.byGateway.replace("{gatewayCode}", gatewayCode),
  disbursementsByTransaction: (transactionId: string) =>
    API_ENDPOINTS.disbursements.byTransaction.replace(
      "{transactionId}",
      transactionId
    ),
  disbursementByExternalId: (externalId: string) =>
    API_ENDPOINTS.disbursements.byExternalId.replace(
      "{externalId}",
      externalId
    ),
  disbursementExists: (externalTransactionId: string) =>
    API_ENDPOINTS.disbursements.exists.replace(
      "{externalTransactionId}",
      externalTransactionId
    ),
  disbursementCountByStatus: (status: string) =>
    API_ENDPOINTS.disbursements.countByStatus.replace("{status}", status),
  disbursementAmountByStatus: (status: string) =>
    API_ENDPOINTS.disbursements.amountByStatus.replace("{status}", status),
  disbursementMerchantSummary: (merchantId: string) =>
    API_ENDPOINTS.disbursements.merchantSummary.replace(
      "{merchantId}",
      merchantId
    ),
  disbursementMerchantAll: (merchantId: string) =>
    API_ENDPOINTS.disbursements.merchantAll.replace("{merchantId}", merchantId),
};

// Pagination query builder
export const buildPaginationQuery = (params: {
  page?: number;
  size?: number;
  sort?: string[];
  search?: string;
  role?: string;
  status?: string;
}) => {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.set("page", params.page.toString());
  if (params.size !== undefined)
    queryParams.set("size", params.size.toString());
  if (params.sort && params.sort.length > 0) {
    queryParams.set("sort", params.sort.join(","));
  }
  if (params.search) queryParams.set("search", params.search);
  if (params.role) queryParams.set("role", params.role);
  if (params.status) queryParams.set("status", params.status);

  return queryParams.toString();
};

// HTTP methods enum for consistency
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

// API response types are imported from the main types file

// Pagination response structure
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

// Query parameters for user listing
export interface UserListQuery {
  page?: number;
  size?: number;
  sort?: string[];
  search?: string;
  role?: string;
  status?: string;
}

// Endpoint metadata for API calls
export interface EndpointConfig {
  method: HttpMethod;
  path: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

// Endpoint configurations for easy reference
export const ENDPOINT_CONFIGS = {
  // Authentication
  login: {
    method: HttpMethod.POST,
    path: API_ENDPOINTS.auth.login,
    requiresAuth: false,
  },
  refresh: {
    method: HttpMethod.POST,
    path: API_ENDPOINTS.auth.refresh,
    requiresAuth: false,
  },
  logout: {
    method: HttpMethod.POST,
    path: API_ENDPOINTS.auth.logout,
    requiresAuth: true,
  },

  // User Management
  getUsers: {
    method: HttpMethod.GET,
    path: API_ENDPOINTS.users.list,
    requiresAuth: true,
    requiresAdmin: true,
  },
  createUser: {
    method: HttpMethod.POST,
    path: API_ENDPOINTS.users.create,
    requiresAuth: true,
    requiresAdmin: true,
  },
  getUserById: {
    method: HttpMethod.GET,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  getUserByUid: {
    method: HttpMethod.GET,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  updateUser: {
    method: HttpMethod.PUT,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  deleteUser: {
    method: HttpMethod.DELETE,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  activateUser: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  deactivateUser: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  lockUser: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  unlockUser: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  resetUserPassword: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  changePassword: {
    method: HttpMethod.POST,
    path: API_ENDPOINTS.auth.changePassword,
    requiresAuth: true,
  },
  assignRoles: {
    method: HttpMethod.POST,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
  removeRoles: {
    method: HttpMethod.DELETE,
    path: "",
    requiresAuth: true,
    requiresAdmin: true,
  }, // Dynamic path
} as const;

export { API_ENDPOINTS };
