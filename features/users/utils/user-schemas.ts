import { z } from 'zod';

/**
 * Create User Schema for form validation
 */
export const CreateUserSchema = z.object({
    username: z.string().min(1, 'Username is required').min(3, 'Username must be at least 3 characters'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Password confirmation is required'),
    user_type: z.string().min(1, 'User type is required'),
    role: z.string().min(1, 'Role is required'),
    is_active: z.boolean(),
    associated_merchant_id: z.string().nullable().optional(),
}).refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
}).refine((data) => {
    // If role is otapp_client, associated_merchant_id is required
    if (data.role === 'otapp_client') {
        return !!data.associated_merchant_id;
    }
    return true;
}, {
    message: 'Associated merchant is required for OTApp Client role',
    path: ['associated_merchant_id'],
}).refine((data) => {
    // If user_type is MERCHANT_USER, associated_merchant_id is required
    if (data.user_type === 'MERCHANT_USER') {
        return !!data.associated_merchant_id;
    }
    return true;
}, {
    message: 'Merchant users must be associated with a sub-merchant',
    path: ['associated_merchant_id'],
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
