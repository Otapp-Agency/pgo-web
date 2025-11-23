// Core Entity Types - Updated to match Live API responses
export interface User {
  id: string;
  uid: string; // Unique identifier from API
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  roles: UserRole[] | string[]; // API returns array of roles
  active: boolean;
  locked: boolean;
  associatedMerchantId?: string;
  lastLoginAt?: string; // API returns ISO string
  createdAt: string; // API returns ISO string
  updatedAt?: string; // API returns ISO string
}

export interface PGO {
  id: string;
  name: string;
  code: string;
  productionApiUrl: string;
  sandboxApiUrl: string;
  supportedMethods: PaymentMethod[];
  isActive: boolean;
  credentials: PGOCredentials;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Transaction Interface matching API response
export interface TransactionResponseDto {
  id: string;
  uid: string;
  internalTransactionId: string;
  externalTransactionId: string;
  merchantTransactionId: string;
  amount: string;
  currency: string;
  accountNumber: string;
  paymentMethod: string;
  payCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  statusColorCode: string;
  errorCode: string;
  errorMessage: string;
  responseCode: string;
  responseMessage: string;
  statusMessage: string;
  isProduction: string;
  paymentGatewayName: string;
  paymentGatewayCode: string;
  paymentChannelName: string;
  paymentChannelType: string;
  provider: string;
  merchantId: string;
  merchantName: string;
  merchantEmail: string;
  callbackUrl: string;
  returnUrl: string;
  statusCheckUrl: string;
  metadata: string;
  ipAddress: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  callbackDeliveredAt: string;
  disbursementCount: string;
  totalDisbursementAmount: string;
  successfulDisbursementCount: string;
  failedDisbursementCount: string;
  version: string;
  auditTrail: string;
  processingHistory: string;
  canBeCancelled: string;
  canBeRefunded: string;
  canBeRetried: string;
  maxRefundableAmount: string;
  ageInMinutes: string;
  isStale: string;
  displayName: string;
  formattedAmount: string;
  statusDisplayText: string;
  ageDisplayText: string;
}

// Legacy Transaction interface for backward compatibility
export interface Transaction {
  id: string;
  otappTxnId: string;
  merchantTxnId: string;
  merchantId: string;
  pgoId: string;
  pspTxnId?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  customerIdentifier: string;
  customerName?: string;
  description?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy Disbursement interface for backward compatibility
export interface Disbursement {
  id: string;
  otappDisbId: string;
  merchantDisbId: string;
  merchantId: string;
  pgoId: string;
  pspDisbId?: string;
  sourceTransactionId?: string;
  amount: number;
  currency: string;
  recipientAccount: string;
  recipientName?: string;
  channel: DisbursementChannel;
  status: DisbursementStatus;
  description?: string;
  errorCode?: string;
  errorMessage?: string;
  retries: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Disbursement Response DTO matching API structure
export interface DisbursementResponseDto {
  id: string;
  uid: string;
  externalTransactionId: string;
  internalTransactionId: string;
  merchantDisbursementId: string;
  transactionId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  pgoCode: string;
  destinationAccount: string;
  destinationName: string;
  destinationCountryCode: string;
  destinationInstitutionCode: string;
  destinationBankCode: string;
  destinationBranchCode: string;
  recipientPhone: string;
  recipientEmail: string;
  transferType: string;
  scheduleEpoch: string;
  status: string;
  statusMessage: string;
  responseCode: string;
  responseMessage: string;
  retryAttempts: string;
  paymentGatewayName: string;
  paymentGatewayCode: string;
  paymentGatewayChannelName: string;
  paymentGatewayChannelType: string;
  merchantId: string;
  merchantName: string;
  merchantEmail: string;
  createdAt: string;
  updatedAt: string;
  lastRetryAt: string;
  canBeCancelled: string;
  canBeRetried: string;
  ageInMinutes: string;
  isStale: string;
  displayName: string;
  formattedAmount: string;
  statusDisplayText: string;
  ageDisplayText: string;
}

// Disbursement Search Criteria
export interface DisbursementSearchCriteriaDto {
  merchantId?: string;
  merchantName?: string;
  status?: string;
  statuses?: string[];
  paymentGatewayCode?: string;
  paymentGatewayName?: string;
  minAmount?: string;
  maxAmount?: string;
  currency?: string;
  destinationAccount?: string;
  recipientName?: string;
  createdFrom?: string;
  createdTo?: string;
  includeScheduled?: string;
  includeImmediate?: string;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
}

// Disbursement Summary DTO
export interface DisbursementSummaryDto {
  periodStart: string;
  periodEnd: string;
  periodType: string;
  periodLabel: string;
  totalDisbursements: string;
  successfulDisbursements: string;
  failedDisbursements: string;
  pendingDisbursements: string;
  cancelledDisbursements: string;
  totalAmount: string;
  successfulAmount: string;
  failedAmount: string;
  pendingAmount: string;
  averageAmount: string;
  minAmount: string;
  maxAmount: string;
  primaryCurrency: string;
  successRate: string;
  failureRate: string;
  averageProcessingTime: string;
  retriedDisbursements: string;
  averageRetryAttempts: string;
  uniqueMerchants: string;
  uniquePaymentMethods: string;
  uniqueCurrencies: string;
  growthRate: string;
  trend: string;
  generatedAt: string;
  generationTime: string;
}

// Disbursement Action Request Types
export interface UpdateDisbursementStatusRequest {
  status: string;
  reason?: string;
  statusMessage?: string;
  responseCode?: string;
  responseMessage?: string;
  externalTransactionId?: string;
  sendCallback?: string;
  metadata?: string;
  updatedBy?: string;
  ipAddress?: string;
  incrementRetryAttempts?: string;
  notes?: string;
}

export interface CompleteDisbursementRequest {
  reason: string;
}

export interface CancelDisbursementRequest {
  reason: string;
}

// Enums
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MERCHANT_API_INTEGRATOR = "MERCHANT_API_INTEGRATOR",
  OTAPP_CLIENT = "OTAPP_CLIENT",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  LOCKED = "LOCKED",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum DisbursementStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
}

export enum PaymentMethod {
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
  WALLET = "WALLET",
}

export enum DisbursementChannel {
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  WALLET = "WALLET",
}

// Utility Types
export interface PGOCredentials {
  apiKey: string;
  secretKey: string;
  merchantId?: string;
  [key: string]: string | undefined;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  ipAddress: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  timestamp: Date;
}

export interface DashboardMetrics {
  totalTransactions: {
    count: number;
    value: number;
  };
  successfulTransactions: {
    count: number;
    value: number;
  };
  failedTransactions: {
    count: number;
    value: number;
  };
  totalDisbursements: {
    count: number;
    value: number;
  };
  successfulDisbursements: {
    count: number;
    value: number;
  };
  failedDisbursements: {
    count: number;
    value: number;
  };
}

// Authentication Types - Based on Live API responses
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  authMessage: string;
  token: string;
  refreshToken: string;
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  requirePasswordChange: boolean; // Added missing field from API
  roles: string[];
  lastLoginAt?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  authMessage: string;
  token: string;
  refreshToken: string;
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  requirePasswordChange: boolean; // Added missing field from API
  roles: string[];
}

export interface LogoutRequest {
  username: string;
  password: string;
}

export interface LogoutResponse {
  authMessage: string;
  token: null;
  refreshToken: null;
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt?: number; // Timestamp when token expires
}

export interface AuthUser {
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  requirePasswordChange?: boolean; // Added missing field from API
  roles: string[];
  lastLoginAt?: string;
}

// Form Types
export interface LoginFormData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface CreateUserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleNames: string[]; // API expects array of role names
  userType: string;
  associatedMerchantId?: string;
}

export interface EditUserFormData {
  username?: string;
  email?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  role?: UserRole;
  status?: UserStatus;
  merchantId?: string;
}

export interface CreatePGOFormData {
  name: string;
  code: string;
  productionApiUrl: string;
  sandboxApiUrl: string;
  supportedMethods: PaymentMethod[];
  isActive: boolean;
  credentials: PGOCredentials;
}

// API Response Types - Updated to match Live API format
export interface ApiResponse<T = unknown> {
  status: boolean; // API uses 'status' instead of 'success'
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first?: boolean;
}

// Transaction Search Criteria matching API documentation
export interface TransactionSearchCriteriaDto {
  internalTransactionId?: string;
  externalTransactionId?: string;
  merchantTransactionId?: string;
  merchantId?: string;
  merchantName?: string;
  status?: string;
  statuses?: string[];
  errorCode?: string;
  responseCode?: string;
  paymentGatewayCode?: string;
  paymentGatewayName?: string;
  paymentChannelType?: string;
  provider?: string;
  paymentMethod?: string;
  payCode?: string;
  minAmount?: string;
  maxAmount?: string;
  currency?: string;
  currencies?: string[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdFrom?: string;
  createdTo?: string;
  statusUpdatedFrom?: string;
  statusUpdatedTo?: string;
  accountNumber?: string;
  ipAddress?: string;
  deviceId?: string;
  includeProduction?: string;
  includeTest?: string;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
  includeDisbursements?: string;
  includeAuditTrail?: string;
}

// Transaction Summary matching API response
export interface TransactionSummaryDto {
  periodStart: string;
  periodEnd: string;
  periodType: string;
  periodLabel: string;
  totalTransactions: string;
  successfulTransactions: string;
  failedTransactions: string;
  pendingTransactions: string;
  cancelledTransactions: string;
  refundedTransactions: string;
  totalAmount: string;
  successfulAmount: string;
  failedAmount: string;
  pendingAmount: string;
  refundedAmount: string;
  averageAmount: string;
  minAmount: string;
  maxAmount: string;
  primaryCurrency: string;
  currencyBreakdown: string;
  gatewayCounts: string;
  gatewayAmounts: string;
  gatewaySuccessRates: string;
  merchantId: string;
  merchantName: string;
  uniqueMerchants: string;
  topMerchants: string;
  successRate: string;
  failureRate: string;
  averageProcessingTime: string;
  retriedTransactions: string;
  totalDisbursements: string;
  successfulDisbursements: string;
  failedDisbursements: string;
  totalDisbursementAmount: string;
  averageDisbursementAmount: string;
  peakHour: string;
  peakDay: string;
  hourlyBreakdown: string;
  dailyBreakdown: string;
  uniqueCustomers: string;
  uniquePaymentMethods: string;
  uniqueCurrencies: string;
  growthRate: string;
  trend: string;
  generatedAt: string;
  generationTime: string;
  metadata: string;
}

// Transaction Action Requests
export interface UpdateTransactionStatusRequest {
  status: string;
  reason?: string;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  responseCode?: string;
  responseMessage?: string;
  externalTransactionId?: string;
  sendCallback?: string;
  metadata?: string;
  updatedBy?: string;
  ipAddress?: string;
}

export interface RefundTransactionRequest {
  refundAmount: number;
  reason: string;
}

export interface CompleteTransactionRequest {
  reason: string;
}

export interface CancelTransactionRequest {
  reason: string;
}

// Legacy Filter Types for backward compatibility
export interface TransactionFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: TransactionStatus;
  amountRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
  merchantId?: string;
  pgoId?: string;
}

export interface DisbursementFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: DisbursementStatus;
  amountRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
  merchantId?: string;
  pgoId?: string;
  sourceTransactionId?: string;
}

// User Management API Types
export interface CreateUserRequest {
  username: string;
  email: string;
  password?: string; // Optional, defaults to system default if not provided
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleNames: string[];
  userType: string;
  associatedMerchantId?: string;
  active?: boolean; // Optional, defaults to true
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  password?: string; // Only include when changing password
  roles?: Array<{
    id: number;
    name: string;
    displayName: string;
    description: string;
  }>;
  active?: boolean;
  locked?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface AdminResetPasswordRequest {
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface PasswordResetRequestDto {
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface AssignRolesRequest {
  roleNames: string[];
}

export interface UserListParams {
  page?: number;
  size?: number;
  sort?: string[];
  search?: string;
}

// Role definitions based on API documentation
export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

// API Error Response
export interface ApiErrorResponse {
  status: false;
  statusCode: number;
  message: string;
  error?: string;
  data?: null;
}
