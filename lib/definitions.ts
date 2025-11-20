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
