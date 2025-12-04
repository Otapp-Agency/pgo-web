/**
 * Payment Gateway Type Definitions
 */

export type PaymentMethod = 'MNO' | 'CARD' | 'BANK_TRANSFER';

export interface PaymentGatewayCredentials {
  api_key?: string;
  secret_key?: string;
  merchant_id?: string;
  [key: string]: string | undefined; // Allow PSP-specific credentials
}

export interface PaymentGateway {
  id: string;
  name: string;
  code: string;
  api_base_url_production?: string | null;
  api_base_url_sandbox?: string | null;
  credentials?: PaymentGatewayCredentials;
  supported_methods: PaymentMethod[];
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaymentGatewayCreateRequest {
  name: string;
  code: string;
  api_base_url_production?: string;
  api_base_url_sandbox?: string;
  credentials: PaymentGatewayCredentials;
  supported_methods: PaymentMethod[];
  is_active?: boolean;
}

export interface PaymentGatewayUpdateRequest {
  name?: string;
  api_base_url_production?: string;
  api_base_url_sandbox?: string;
  credentials?: PaymentGatewayCredentials;
  supported_methods?: PaymentMethod[];
  is_active?: boolean;
}

export interface PaymentGatewayListResponse {
  data: Omit<PaymentGateway, 'credentials'>[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
  first?: boolean;
}

export interface PaymentGatewayDetailResponse extends PaymentGateway {
  credentials: PaymentGatewayCredentials; // Decrypted credentials included
}

export interface AvailablePaymentGateway {
  id: string;
  name: string;
  code: string;
  supported_methods: PaymentMethod[];
}

export interface AvailablePaymentGatewaysResponse {
  data: AvailablePaymentGateway[];
}






