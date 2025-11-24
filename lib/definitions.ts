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