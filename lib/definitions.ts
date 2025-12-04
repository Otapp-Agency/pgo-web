import { z } from 'zod'

export const LoginFormSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }).trim(),
  password: z
    .string()
    .min(1, { message: 'Password field must not be empty.' })
    .trim(),
})

export type FormState =
  | {
    errors?: {
      username?: string[]
      password?: string[]
    }
    message?: string
  }
  | undefined

export interface SessionPayload {
  userId: string
  uid: string
  token: string
  refreshToken?: string
  username: string
  name: string
  email: string
  roles: string[]
  userType?: string
  requirePasswordChange?: boolean
  expiresAt: number // Store as timestamp for JWT compatibility
}

export const TransactionSchema = z.object({
  id: z.string(),
  uid: z.string(),
  internalTransactionId: z.string(),
  externalTransactionId: z.string(),
  merchantTransactionId: z.string(),
  pspTransactionId: z.string(),
  amount: z.string(),
  currency: z.string(),
  customerIdentifier: z.string(),
  paymentMethod: z.string(),
  customerName: z.string(),
  status: z.string(),
  colorCode: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  description: z.string(),
  pgoId: z.string(),
  pgoName: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
  submerchantId: z.string(),
  submerchantUid: z.string(),
  submerchantName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Transaction = z.infer<typeof TransactionSchema>

export const DisbursementSchema = z.object({
  id: z.string(),
  uid: z.string(),
  internalTransactionId: z.string().optional().default(''),
  externalTransactionId: z.string().optional().default(''),
  merchantTransactionId: z.string().optional().default(''),
  pspTransactionId: z.string().optional().default(''),
  amount: z.string(),
  currency: z.string(),
  customerIdentifier: z.string().optional().default(''),
  paymentMethod: z.string().optional().default(''),
  customerName: z.string().optional().default(''),
  status: z.string(),
  colorCode: z.string(),
  errorCode: z.string().optional().default(''),
  errorMessage: z.string().optional().default(''),
  description: z.string().optional().default(''),
  pgoId: z.string(),
  pgoName: z.string(),
  merchantId: z.string(),
  merchantName: z.string().optional().default(''),
  submerchantId: z.string().optional().default(''),
  submerchantUid: z.string().optional().default(''),
  submerchantName: z.string().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Disbursement = z.infer<typeof DisbursementSchema>

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  is_active: z.boolean(),
  is_locked: z.boolean(),
  associated_merchant_id: z.string().nullable(),
  last_login_at: z.string().nullable(),
  created_at: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

export const MerchantSchema = z.object({
  id: z.string(),
  uid: z.string(),
  code: z.string(),
  name: z.string(),
  business_name: z.string().nullable().optional(),
  business_registration_number: z.string().nullable().optional(),
  business_address: z.string().nullable().optional(),
  business_city: z.string().nullable().optional(),
  business_state: z.string().nullable().optional(),
  business_postal_code: z.string().nullable().optional(),
  business_country: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  merchant_type: z.string().nullable().optional(),
  status: z.string(), // ACTIVE, SUSPENDED, INACTIVE
  status_reason: z.string().nullable().optional(),
  merchant_role: z.string().nullable().optional(), // ROOT, PLATFORM, SUBMERCHANT, AGENT, PARTNER
  kyc_verified: z.boolean(),
  kyc_status: z.string().nullable().optional(), // IN_REVIEW, APPROVED, REJECTED, etc.
  kyc_notes: z.string().nullable().optional(),
  kyc_verified_at: z.string().nullable().optional(),
  kyc_verified_by: z.string().nullable().optional(),
  single_transaction_limit: z.string().nullable().optional(),
  daily_transaction_limit: z.string().nullable().optional(),
  monthly_transaction_limit: z.string().nullable().optional(),
  parent_merchant_uid: z.string().nullable().optional(),
  parent_merchant_name: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

// Merchant Bank Account Schema
export const BankAccountSchema = z.object({
  id: z.string().optional(),
  uid: z.string(),
  bank_name: z.string(),
  account_name: z.string(),
  account_number: z.string(),
  bank_code: z.string().nullable().optional(),
  branch_code: z.string().nullable().optional(),
  account_type: z.enum(['CURRENT', 'SAVINGS']).nullable().optional(),
  swift_code: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  bank_address: z.string().nullable().optional(),
  currency: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).nullable().optional(),
  is_active: z.boolean().optional(),
  primary: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export type BankAccount = z.infer<typeof BankAccountSchema>

// Create/Update Bank Account Request Schema
export const CreateBankAccountRequestSchema = z.object({
  bankAccountUid: z.string().optional(), // Optional for create, required for update
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
  branchCode: z.string().min(1, 'Branch code is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountType: z.enum(['CURRENT', 'SAVINGS']),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  bankAddress: z.string().optional(),
  primary: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  notes: z.string().optional(),
})

export type CreateBankAccountRequest = z.infer<typeof CreateBankAccountRequestSchema>

// Merchant status update request
export interface MerchantStatusUpdateRequest {
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  reason: string
}

// Merchant type enum
export const MerchantTypeEnum = z.enum(['RETAIL', 'TRAVEL', 'HOSPITALITY', 'E_COMMERCE', 'FINANCIAL_SERVICES', 'OTHER'])
export type MerchantType = z.infer<typeof MerchantTypeEnum>

// Merchant role enum
export const MerchantRoleEnum = z.enum(['ROOT', 'PLATFORM', 'SUBMERCHANT', 'AGENT', 'PARTNER'])
export type MerchantRole = z.infer<typeof MerchantRoleEnum>

// Create Merchant Request Schema
export const CreateMerchantRequestSchema = z.object({
  merchantName: z.string().min(1, 'Merchant name is required'),
  merchantCode: z.string().min(1, 'Merchant code is required'),
  businessName: z.string().min(1, 'Business name is required'),
  businessRegistrationNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessState: z.string().optional(),
  businessPostalCode: z.string().optional(),
  businessCountry: z.string().optional(),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  merchantType: MerchantTypeEnum,
  merchantRole: MerchantRoleEnum,
  parentMerchantId: z.number().optional().nullable(),
  singleTransactionLimit: z.number().positive('Must be greater than 0').optional(),
  dailyTransactionLimit: z.number().positive('Must be greater than 0').optional(),
  monthlyTransactionLimit: z.number().positive('Must be greater than 0').optional(),
})

export type CreateMerchantRequest = z.infer<typeof CreateMerchantRequestSchema>

export const AuditLogSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  username: z.string().nullable(),
  action: z.string(), // e.g., 'USER_CREATED', 'PGO_UPDATED' - required field from API
  description: z.string(),
  ip_address: z.string(),
  old_values: z.record(z.string(), z.unknown()).nullable(),
  new_values: z.record(z.string(), z.unknown()).nullable(),
  timestamp: z.string(), // datetime
})

export type AuditLog = z.infer<typeof AuditLogSchema>

export type Merchant = z.infer<typeof MerchantSchema>

export const PaymentGatewaySchema = z.object({
  id: z.string(),
  uid: z.string(),
  name: z.string(),
  code: z.string(),
  api_base_url_production: z.string().nullable().optional(),
  api_base_url_sandbox: z.string().nullable().optional(),
  supported_methods: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const PaymentGatewayDetailSchema = PaymentGatewaySchema.extend({
  credentials: z.record(z.string(), z.string().optional()).optional(),
})

export type PaymentGateway = z.infer<typeof PaymentGatewaySchema>
export type PaymentGatewayDetail = z.infer<typeof PaymentGatewayDetailSchema>

export interface PaginatedPaymentGatewayResponse {
  data: PaymentGateway[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

// Breakdown item schema for reports (count and value)
const BreakdownItemSchema = z.object({
  count: z.number(),
  value: z.number(),
})

export type BreakdownItem = z.infer<typeof BreakdownItemSchema>

// Monthly Transaction Summary Report Schema (FR-REP-001)
export const MonthlyTransactionSummarySchema = z.object({
  report_period: z.string(), // Format: "YYYY-MM"
  total_transactions: z.number(),
  total_value: z.number(),
  currency: z.string(),
  status_breakdown: z.record(z.string(), BreakdownItemSchema),
  pgo_breakdown: z.record(z.string(), BreakdownItemSchema),
  method_breakdown: z.record(z.string(), BreakdownItemSchema),
})

export type MonthlyTransactionSummary = z.infer<typeof MonthlyTransactionSummarySchema>

// Query params for monthly transaction summary
export interface MonthlyTransactionSummaryParams {
  year: number
  month?: number
  merchant_id?: string
  pgo_id?: string
}

// Monthly Disbursement Summary Report Schema (FR-REP-001)
export const MonthlyDisbursementSummarySchema = z.object({
  report_period: z.string(), // Format: "YYYY-MM"
  total_disbursements: z.number(),
  total_value: z.number(),
  currency: z.string(),
  status_breakdown: z.record(z.string(), BreakdownItemSchema),
  pgo_breakdown: z.record(z.string(), BreakdownItemSchema),
  method_breakdown: z.record(z.string(), BreakdownItemSchema),
})

export type MonthlyDisbursementSummary = z.infer<typeof MonthlyDisbursementSummarySchema>

// Query params for monthly disbursement summary
export interface MonthlyDisbursementSummaryParams {
  year: number
  month?: number
  merchant_id?: string
  pgo_id?: string
}

import type { PaginatedApiResponse } from '@/lib/types'

export type PaginatedDisbursementResponse = PaginatedApiResponse<Disbursement>
export type PaginatedUserResponse = PaginatedApiResponse<User>
export type PaginatedMerchantResponse = PaginatedApiResponse<Merchant>