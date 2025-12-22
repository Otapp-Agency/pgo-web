export interface MerchantListParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    merchantType?: string;
    kyc_verified?: boolean;
    sort?: string[];
}
