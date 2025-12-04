# Payment Gateway System: Frontend Developer Guide

## Table of Contents

1. [Disbursement](#1-disbursement)
2. [Payment Gateway](#2-payment-gateway)
3. [Payment Channel](#3-payment-channel)
4. [Merchant](#4-merchant)
5. [Transaction](#5-transaction)
6. [Relationships & Flow](#relationships--flow)
7. [Additional Frontend Considerations](#additional-frontend-considerations)
8. [API Endpoints Summary](#api-endpoints-summary)
9. [Security Considerations](#security-considerations)
10. [Testing Tips](#testing-tips)

---

## 1. DISBURSEMENT

### Definition
A **disbursement** is an outbound payment that sends funds to a recipient after a successful transaction. It represents money leaving the system to a destination account.

### Key Characteristics
- One transaction can have **multiple disbursements**
- Disbursements are processed **asynchronously** after payment success
- Each disbursement can **succeed or fail independently**
- Total disbursement amounts **must equal** the transaction amount
- Supports **retry mechanism** with exponential backoff (default: 3 attempts)

### Key Fields for Frontend

```typescript
interface Disbursement {
  // Identifiers
  uid: string;                    // Public-safe ULID (26 chars)
  internalTransactionId: string;  // Internal processing ID
  merchantDisbursementId?: string; // Merchant's idempotency key
  
  // Money
  amount: number;                 // Disbursement amount
  currency: string;                // ISO 4217 (e.g., "TZS")
  
  // Destination
  paymentMethod: "MNO" | "CARD" | "BANK_TRANSFER";
  destinationAccount: string;    // Phone number, account, or wallet ID
  destinationName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  destinationCountryCode?: string;
  destinationInstitutionCode?: string; // e.g., "AZAMPESA", "CRDB"
  destinationBankCode?: string;
  
  // Status
  status: DisbursementStatus;
  statusMessage?: string;
  statusUpdatedAt: string;
  
  // Retry Information
  retryAttempts: number;
  maxRetryAttempts: number;
  lastRetryAt?: string;
  nextRetryAt?: string;
  
  // Relationships
  transactionId: string;          // Parent transaction
  merchantId: number;
  paymentGatewayId?: number;
}
```

### Disbursement Statuses

| Status            | Display Name    | Color   | Description                    |
| ----------------- | --------------- | ------- | ------------------------------ |
| `PENDING`         | Pending         | #ffc107 | Awaiting processing            |
| `PROCESSING`      | Processing      | #007bff | Currently being processed      |
| `SUCCESS`         | Successful      | #28a745 | Funds successfully transferred |
| `FAILED`          | Failed          | #dc3545 | Disbursement attempt failed    |
| `CANCELLED`       | Cancelled       | #6c757d | Cancelled before processing    |
| `RETRY_ATTEMPTED` | Retry Attempted | #fd7e14 | A retry has been attempted     |
| `CHAINED`         | Chained         | #6f42c1 | Part of a retry chain          |
| `REJECTED`        | Rejected        | #dc3545 | Permanently rejected by PSP    |
| `REVERSED`        | Reversed        | #fd7e14 | Funds returned after success   |
| `REIMBURSED`      | Reimbursed      | #17a2b8 | Manually compensated           |

### Use Cases

1. **Marketplace Payouts**
   - Customer pays 100,000 TZS
   - Platform keeps 20,000 TZS (fee)
   - Seller receives 80,000 TZS

2. **Split Payments**
   - Payment of 50,000 TZS
   - 30,000 TZS to Service Provider A
   - 20,000 TZS to Service Provider B

3. **Escrow Releases**
   - After order completion, release funds to merchant

4. **Refunds**
   - Return funds to customer account

5. **Commission Payouts**
   - Pay commissions to agents/affiliates

### Frontend Implementation Tips

```typescript
// Display disbursement status with color coding
const getStatusColor = (status: DisbursementStatus): string => {
  const statusMap = {
    PENDING: '#ffc107',
    PROCESSING: '#007bff',
    SUCCESS: '#28a745',
    FAILED: '#dc3545',
    // ... etc
  };
  return statusMap[status] || '#6c757d';
};

// Show retry information
const showRetryInfo = (disbursement: Disbursement) => {
  if (disbursement.retryAttempts > 0) {
    return `Retry ${disbursement.retryAttempts}/${disbursement.maxRetryAttempts}`;
  }
};

// Poll for status updates
const pollDisbursementStatus = async (disbursementId: string) => {
  const interval = setInterval(async () => {
    const status = await fetchDisbursementStatus(disbursementId);
    if (status === 'SUCCESS' || status === 'FAILED' || status === 'REJECTED') {
      clearInterval(interval);
    }
  }, 5000); // Poll every 5 seconds
};
```

---

## 2. PAYMENT GATEWAY

### Definition
A **payment gateway** is an external service provider (PSP) that processes payments. It acts as the bridge between your system and financial institutions.

### Key Characteristics
- Multiple gateways can be configured (AzamPay, Selcom, Equity, etc.)
- Each gateway has **production and sandbox endpoints**
- Gateways support different **payment methods**
- Gateways can be **activated/deactivated** independently

### Key Fields for Frontend

```typescript
interface PaymentGateway {
  id: number;
  uid: string;                    // ULID identifier
  code: string;                    // Unique code (e.g., "AZAM", "SELCOM")
  name: string;                    // Display name (e.g., "AzamPay")
  apiBaseUrlProduction: string;    // Production API endpoint
  apiBaseUrlSandbox: string;      // Sandbox API endpoint
  supportedMethods: string[];     // ["MNO", "CARD", "BANK_TRANSFER"]
  isActive: boolean;               // Gateway availability
  createdAt: string;
  updatedAt: string;
}
```

### Supported Gateways in System

| Gateway Code | Name    | Supported Methods  | Status                |
| ------------ | ------- | ------------------ | --------------------- |
| `AZAM`       | AzamPay | MNO, BANK_TRANSFER | ✅ Active              |
| `SELCOM`     | Selcom  | CARD, MNO          | ✅ Active              |
| `EQUITY`     | Equity  | BANK_TRANSFER      | 🚧 Not yet implemented |

### Use Cases

1. **Multi-Gateway Routing**
   - Route mobile money to AzamPay
   - Route card payments to Selcom
   - Route bank transfers to Equity

2. **Gateway Failover**
   - If primary gateway fails, switch to backup

3. **Gateway-Specific Features**
   - Different checkout flows per gateway
   - Gateway-specific error messages

4. **Testing and Production**
   - Use sandbox for development
   - Use production for live transactions

### Frontend Implementation Tips

```typescript
// Get available gateways for a payment method
const getAvailableGateways = (paymentMethod: PaymentMethod): PaymentGateway[] => {
  return gateways.filter(gateway => 
    gateway.isActive && 
    gateway.supportedMethods.includes(paymentMethod)
  );
};

// Display gateway status
const GatewayStatusBadge = ({ gateway }: { gateway: PaymentGateway }) => {
  return (
    <Badge color={gateway.isActive ? 'green' : 'red'}>
      {gateway.isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
};

// Gateway selection UI
const GatewaySelector = ({ onSelect }: { onSelect: (gateway: PaymentGateway) => void }) => {
  return (
    <Select onChange={onSelect}>
      {gateways.map(gateway => (
        <Option key={gateway.code} value={gateway.code}>
          {gateway.name} {gateway.isActive ? '✓' : '✗'}
        </Option>
      ))}
    </Select>
  );
};
```

---

## 3. PAYMENT CHANNEL

### Definition
A **payment channel** is a specific payment method or service within a payment gateway. It represents the actual mechanism used to process payments (e.g., M-Pesa, Airtel Money, Visa, Mastercard).

### Key Characteristics
- Channels belong to a **payment gateway**
- Channels have types: **MNO, BANK, CARD, WALLET**
- Channels can support **redirect flows**
- Channels may require **OTP verification**
- Channels are linked to gateways via **PaymentGatewayChannel**

### Key Fields for Frontend

```typescript
interface PaymentChannel {
  id: number;
  uid: string;
  code: string;                   // e.g., "MPESA", "AIRTEL", "VISA"
  name: string;                   // e.g., "M-Pesa", "Airtel Money"
  paymentChannelType: "MNO" | "BANK" | "CARD" | "WALLET";
  isActive: boolean;
  supportsRedirect: boolean;       // Can redirect to external page
  requiresOtp: boolean;            // Requires OTP verification
  description?: string;
}

interface PaymentGatewayChannel {
  id: number;
  uid: string;
  payCode: string;                 // Unique routing code (e.g., "MPESA", "AIRTEL")
  provider: string;                 // Provider name
  paymentGateway: PaymentGateway;  // Parent gateway
  paymentChannel: PaymentChannel;  // Channel details
  isActive: boolean;
}
```

### Payment Channel Types

| Type          | Code     | Description                      | Examples                        |
| ------------- | -------- | -------------------------------- | ------------------------------- |
| Mobile Money  | `MNO`    | Mobile Network Operator services | M-Pesa, Airtel Money, Tigo Pesa |
| Bank Transfer | `BANK`   | Traditional banking transfers    | CRDB, NMB, Equity Bank          |
| Card          | `CARD`   | Credit/Debit cards               | Visa, Mastercard, Amex          |
| Wallet        | `WALLET` | Digital wallets                  | PayPal, Apple Pay, Google Pay   |

### Use Cases

1. **Channel Selection**
   - Customer chooses M-Pesa or Airtel Money
   - System routes to appropriate channel

2. **Redirect Flows**
   - Card payments redirect to 3D Secure page
   - Mobile money redirects to USSD prompt

3. **OTP Handling**
   - Show OTP input for channels that require it
   - Handle OTP verification flow

4. **Channel-Specific Validation**
   - Phone number format for MNO
   - Card number format for CARD
   - Account number format for BANK

### Frontend Implementation Tips

```typescript
// Get channels by type
const getChannelsByType = (type: PaymentChannelType): PaymentChannel[] => {
  return channels.filter(channel => 
    channel.paymentChannelType === type && 
    channel.isActive
  );
};

// Channel selection component
const ChannelSelector = ({ 
  type, 
  onSelect 
}: { 
  type: PaymentChannelType; 
  onSelect: (channel: PaymentChannel) => void 
}) => {
  const availableChannels = getChannelsByType(type);
  
  return (
    <Radio.Group onChange={onSelect}>
      {availableChannels.map(channel => (
        <Radio key={channel.code} value={channel.code}>
          {channel.name}
          {channel.requiresOtp && <Badge>OTP Required</Badge>}
        </Radio>
      ))}
    </Radio.Group>
  );
};

// Handle redirect flow
const handlePaymentRedirect = (channel: PaymentChannel, transactionId: string) => {
  if (channel.supportsRedirect) {
    // Redirect to gateway's payment page
    window.location.href = `/payment/redirect/${transactionId}`;
  } else {
    // Show inline payment form
    showPaymentForm(channel);
  }
};

// OTP input for channels that require it
const OTPInput = ({ 
  channel, 
  onSubmit 
}: { 
  channel: PaymentChannel; 
  onSubmit: (otp: string) => void 
}) => {
  if (!channel.requiresOtp) return null;
  
  return (
    <Input.OTP 
      length={6} 
      onChange={onSubmit}
      placeholder="Enter OTP"
    />
  );
};
```

---

## 4. MERCHANT

### Definition
A **merchant** is a business entity that uses the payment gateway to accept payments. Merchants can be platform operators, sub-merchants, agents, or partners.

### Key Characteristics
- **Hierarchical structure** (Root → Platform → Sub-merchant → Agent)
- Each merchant has **API keys** for authentication
- Merchants have **statuses** (PENDING, ACTIVE, SUSPENDED, etc.)
- Merchants have **types** (TRAVEL, RETAIL, ECOMMERCE, etc.)
- Merchants can have **KYC verification status**

### Key Fields for Frontend

```typescript
interface Merchant {
  // Identifiers
  id: number;
  uid: string;                    // ULID (26 chars)
  code: string;                    // Unique merchant code
  name: string;                   // Merchant name
  
  // Business Details
  businessName: string;
  businessRegistrationNumber: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessPostalCode: string;
  businessCountry: string;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  
  // Status & Type
  status: MerchantStatus;
  statusReason?: string;
  merchantType: MerchantType;
  merchantRole: MerchantRole;
  
  // Hierarchy
  parentMerchantId?: number;
  parentMerchant?: Merchant;
  subMerchants?: Merchant[];
  
  // KYC
  kycVerified: boolean;
  kycStatus: MerchantKycStatus;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Merchant Statuses

| Status         | Display Name | Description                            |
| -------------- | ------------ | -------------------------------------- |
| `PENDING`      | Pending      | Application submitted, awaiting review |
| `ACTIVE`       | Active       | Approved and operational               |
| `SUSPENDED`    | Suspended    | Temporarily suspended                  |
| `INACTIVE`     | Inactive     | Permanently deactivated                |
| `REJECTED`     | Rejected     | Application rejected                   |
| `UNDER_REVIEW` | Under Review | Under compliance review                |

### Merchant Types

| Type            | Description            | Use Cases                       |
| --------------- | ---------------------- | ------------------------------- |
| `TRAVEL`        | Travel and transport   | Bus operators, airlines, tours  |
| `RETAIL`        | Retail stores          | Physical retail outlets         |
| `ECOMMERCE`     | E-commerce             | Online shops                    |
| `SERVICES`      | Service providers      | Salons, consultants             |
| `DIGITAL_GOODS` | Digital products       | E-books, software               |
| `SUBSCRIPTION`  | Subscription services  | SaaS, streaming                 |
| `MARKETPLACE`   | Multi-vendor platforms | Marketplaces, aggregators       |
| `FINANCIAL`     | Financial services     | Microfinance, insurance         |
| `GAMING`        | Gaming platforms       | Online games, in-game purchases |
| `FOOD_DELIVERY` | Food delivery          | Restaurants, delivery services  |

### Merchant Roles

| Role          | Description                 | Hierarchy Level |
| ------------- | --------------------------- | --------------- |
| `ROOT`        | Root merchant (PGW company) | Level 0         |
| `PLATFORM`    | Platform aggregator         | Level 1         |
| `SUBMERCHANT` | Individual business         | Level 2         |
| `AGENT`       | Field agent/POS operator    | Level 3         |
| `PARTNER`     | Integrator/white-label      | Optional        |

### Use Cases

1. **Platform-Submerchant Model**
   - BMS (Platform) creates transactions for BM Coach (Sub-merchant)
   - Platform manages multiple sub-merchants

2. **Merchant Onboarding**
   - Collect business information
   - KYC verification
   - API key generation

3. **Merchant Management**
   - View merchant status
   - Suspend/activate merchants
   - View transaction history

4. **Multi-Tenant Isolation**
   - Merchants only see their own data
   - Platform merchants see their sub-merchants

### Frontend Implementation Tips

```typescript
// Merchant status badge
const MerchantStatusBadge = ({ merchant }: { merchant: Merchant }) => {
  const statusColors = {
    PENDING: 'yellow',
    ACTIVE: 'green',
    SUSPENDED: 'orange',
    INACTIVE: 'gray',
    REJECTED: 'red',
    UNDER_REVIEW: 'blue'
  };
  
  return (
    <Badge color={statusColors[merchant.status]}>
      {merchant.status}
    </Badge>
  );
};

// Merchant hierarchy display
const MerchantHierarchy = ({ merchant }: { merchant: Merchant }) => {
  return (
    <Breadcrumb>
      {merchant.parentMerchant && (
        <Breadcrumb.Item>{merchant.parentMerchant.name}</Breadcrumb.Item>
      )}
      <Breadcrumb.Item>{merchant.name}</Breadcrumb.Item>
    </Breadcrumb>
  );
};

// KYC status indicator
const KYCStatus = ({ merchant }: { merchant: Merchant }) => {
  if (merchant.kycVerified) {
    return <CheckCircleOutlined style={{ color: 'green' }} />;
  }
  return <ClockCircleOutlined style={{ color: 'orange' }} />;
};

// Merchant type icon
const MerchantTypeIcon = ({ type }: { type: MerchantType }) => {
  const icons = {
    TRAVEL: <CarOutlined />,
    RETAIL: <ShopOutlined />,
    ECOMMERCE: <ShoppingOutlined />,
    // ... etc
  };
  return icons[type] || <QuestionCircleOutlined />;
};
```

---

## 5. TRANSACTION

### Definition
A **transaction** represents an inbound payment from a customer to a merchant. It's the core entity that tracks payment attempts and their outcomes.

### Key Characteristics
- Created when a payment is **initiated**
- Has a unique **merchant transaction ID** for idempotency
- Can have **multiple disbursements**
- Status changes as payment is **processed**
- Supports **webhooks/callbacks** for status updates

### Key Fields for Frontend

```typescript
interface Transaction {
  // Identifiers
  id: number;
  uid: string;                    // Public ULID
  internalTransactionId: string;   // Internal processing ID
  merchantTransactionId: string;   // Merchant's unique reference
  externalTransactionId?: string;  // Gateway's transaction ID
  
  // Money
  amount: number;
  currency: string;                 // ISO 4217 (e.g., "TZS")
  
  // Relationships
  merchantId: number;
  merchant: Merchant;
  subMerchantId?: number;
  subMerchant?: Merchant;
  paymentGatewayId: number;
  paymentGateway: PaymentGateway;
  paymentGatewayChannelId: number;
  paymentGatewayChannel: PaymentGatewayChannel;
  
  // Payment Details
  paymentMethod: "MNO" | "CARD" | "BANK_TRANSFER";
  payCode?: string;                // Channel routing code
  accountNumber: string;          // Customer account number
  
  // Customer Info
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Status
  status: TransactionStatus;
  statusMessage?: string;
  statusUpdatedAt?: string;
  statusColorCode?: string;       // Hex color for UI
  
  // Error Handling
  errorCode?: string;
  errorMessage?: string;
  responseCode?: string;
  responseMessage?: string;
  
  // URLs
  callbackUrl?: string;           // Webhook URL
  returnUrl?: string;              // Redirect URL after payment
  statusCheckUrl?: string;         // Direct gateway status check URL
  
  // Metadata
  metadata?: Record<string, any>;
  ipAddress?: string;
  deviceId?: string;
  
  // Disbursements
  disbursements?: Disbursement[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  callbackDeliveredAt?: string;
}
```

### Transaction Statuses

| Status      | Display Name | Color   | Description                                  |
| ----------- | ------------ | ------- | -------------------------------------------- |
| `PENDING`   | Pending      | #ffc107 | Payment initiated, awaiting gateway response |
| `SUCCESS`   | Successful   | #28a745 | Payment completed successfully               |
| `FAILED`    | Failed       | #dc3545 | Payment failed or rejected                   |
| `CANCELLED` | Cancelled    | #6c757d | Cancelled before completion                  |
| `REFUNDED`  | Refunded     | #007bff | Payment refunded to customer                 |
| `EXPIRED`   | Expired      | #6c757d | Timed out without completion                 |

### Use Cases

1. **Payment Checkout**
   - Customer initiates payment
   - Transaction created with PENDING status
   - Redirect to payment gateway

2. **Status Tracking**
   - Poll transaction status
   - Receive webhook updates
   - Display real-time status

3. **Transaction History**
   - View all transactions for a merchant
   - Filter by status, date, amount
   - Export transaction reports

4. **Reconciliation**
   - Match transactions with gateway records
   - Identify discrepancies
   - Generate reconciliation reports

5. **Refunds**
   - Initiate refund for successful transaction
   - Track refund status
   - Update transaction to REFUNDED

### Frontend Implementation Tips

```typescript
// Transaction status display
const TransactionStatus = ({ transaction }: { transaction: Transaction }) => {
  return (
    <Tag color={transaction.statusColorCode}>
      {transaction.status}
    </Tag>
  );
};

// Transaction timeline
const TransactionTimeline = ({ transaction }: { transaction: Transaction }) => {
  const events = [
    { time: transaction.createdAt, label: 'Created', status: 'PENDING' },
    { time: transaction.statusUpdatedAt, label: 'Status Updated', status: transaction.status },
    { time: transaction.callbackDeliveredAt, label: 'Callback Received', status: transaction.status },
  ];
  
  return (
    <Timeline>
      {events.map((event, index) => (
        <Timeline.Item key={index} color={getStatusColor(event.status)}>
          {event.label} - {formatDateTime(event.time)}
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

// Poll transaction status
const useTransactionStatus = (transactionId: string) => {
  const [status, setStatus] = useState<TransactionStatus>('PENDING');
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const transaction = await fetchTransaction(transactionId);
      setStatus(transaction.status);
      
      if (['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(transaction.status)) {
        clearInterval(interval);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [transactionId]);
  
  return status;
};

// Transaction list with filters
const TransactionList = () => {
  const [filters, setFilters] = useState({
    status: undefined,
    dateRange: undefined,
    amountRange: undefined,
    merchantId: undefined,
  });
  
  return (
    <Table
      dataSource={transactions}
      filters={filters}
      columns={[
        { title: 'ID', dataIndex: 'merchantTransactionId' },
        { title: 'Amount', dataIndex: 'amount', render: (amount, record) => 
          `${amount} ${record.currency}` 
        },
        { title: 'Status', dataIndex: 'status', render: (status) => 
          <TransactionStatus status={status} />
        },
        { title: 'Created', dataIndex: 'createdAt', render: formatDateTime },
      ]}
    />
  );
};

// Disbursement summary for transaction
const DisbursementSummary = ({ transaction }: { transaction: Transaction }) => {
  if (!transaction.disbursements || transaction.disbursements.length === 0) {
    return <Text>No disbursements</Text>;
  }
  
  const total = transaction.disbursements.reduce((sum, d) => sum + d.amount, 0);
  const successful = transaction.disbursements.filter(d => d.status === 'SUCCESS').length;
  
  return (
    <Statistic
      title="Disbursements"
      value={`${successful}/${transaction.disbursements.length} successful`}
      suffix={`Total: ${total} ${transaction.currency}`}
    />
  );
};
```

---

## RELATIONSHIPS & FLOW

### Entity Relationships

```
Merchant (Platform)
  ├── SubMerchant
  │     └── Transaction
  │           ├── PaymentGateway
  │           ├── PaymentGatewayChannel
  │           │     └── PaymentChannel
  │           └── Disbursement[]
  │                 └── PaymentGateway (for payout)
```

### Payment Flow

```
1. Merchant creates Transaction
   ↓
2. Transaction routed to PaymentGatewayChannel
   ↓
3. PaymentGateway processes payment
   ↓
4. Transaction status updated (SUCCESS/FAILED)
   ↓
5. If SUCCESS, Disbursements are processed
   ↓
6. Each Disbursement sent to PaymentGateway
   ↓
7. Disbursement status updated
```

### Complete Payment Request Example

```typescript
interface PaymentRequest {
  // Required
  merchantTransactionId: string;  // Unique per merchant
  amount: number;                  // Min: 100.00
  currency: string;                // ISO 4217 (e.g., "TZS")
  paymentMethod: "MNO" | "CARD" | "BANK_TRANSFER";
  subMerchantUid: string;          // ULID of sub-merchant
  
  // Optional
  payCode?: string;                // Channel routing (e.g., "MPESA")
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;          // E.164 format: "+255712345678"
  accountNumber?: string;
  callbackUrl?: string;           // Webhook URL
  returnUrl?: string;              // Redirect URL
  description?: string;
  metadata?: Record<string, any>;
  
  // Disbursements (optional)
  disbursements?: DisbursementRequest[];
}

interface DisbursementRequest {
  amount: number;                  // Must sum to transaction amount
  currency?: string;               // Defaults to transaction currency
  paymentMethod: "MNO" | "CARD" | "BANK_TRANSFER";
  destinationAccount: string;      // Phone, account, or wallet ID
  destinationName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  destinationCountryCode?: string;
  destinationInstitutionCode?: string;
  description?: string;
}
```

---

## ADDITIONAL FRONTEND CONSIDERATIONS

### 1. Error Handling

```typescript
// Common error codes
const ERROR_CODES = {
  INVALID_CREDENTIALS: '401',
  VALIDATION_ERROR: '400',
  INVALID_PAY_CODE: '400',
  PLATFORM_MERCHANT_ONLY: '403',
  SUBMERCHANT_NOT_FOUND: '403',
  DISBURSEMENT_AMOUNT_MISMATCH: '400',
};

// Error message mapping
const getErrorMessage = (error: ApiError): string => {
  const messages = {
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid API key or secret',
    [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed. Please check your input.',
    [ERROR_CODES.INVALID_PAY_CODE]: 'Invalid payment channel code',
    // ... etc
  };
  return messages[error.code] || error.message || 'An error occurred';
};
```

### 2. Idempotency

```typescript
// Always use unique merchantTransactionId
const createTransaction = async (request: PaymentRequest) => {
  // Generate unique ID (e.g., UUID or timestamp-based)
  const merchantTransactionId = generateUniqueId();
  
  return await api.post('/merchant/v1/transactions', {
    ...request,
    merchantTransactionId,
  });
};
```

### 3. Webhook Handling

```typescript
// Webhook endpoint handler
app.post('/webhooks/payment', async (req, res) => {
  // Verify webhook signature (if implemented)
  // const isValid = verifyWebhookSignature(req);
  // if (!isValid) return res.status(401).send('Invalid signature');
  
  const { transactionId, status, amount, currency } = req.body;
  
  // Update transaction status in your database
  await updateTransactionStatus(transactionId, status);
  
  // Trigger UI update (e.g., via WebSocket or polling)
  notifyClient(transactionId, status);
  
  res.status(200).send('OK');
});
```

### 4. Status Polling Strategy

```typescript
// Exponential backoff polling
const pollWithBackoff = async (
  transactionId: string,
  onStatusChange: (status: TransactionStatus) => void
) => {
  let delay = 1000; // Start with 1 second
  
  const poll = async () => {
    const transaction = await fetchTransactionStatus(transactionId);
    onStatusChange(transaction.status);
    
    if (['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(transaction.status)) {
      return; // Stop polling
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    delay = Math.min(delay * 2, 30000);
    setTimeout(poll, delay);
  };
  
  poll();
};
```

### 5. Currency Formatting

```typescript
// Format currency for display
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Example: formatCurrency(50000, 'TZS') => "TSh 50,000.00"
```

### 6. Phone Number Validation

```typescript
// Validate E.164 phone format
const isValidPhoneNumber = (phone: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

// Format phone number for display
const formatPhoneNumber = (phone: string): string => {
  // +255712345678 => +255 712 345 678
  return phone.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
};
```

### 7. Transaction Search & Filtering

```typescript
interface TransactionFilters {
  status?: TransactionStatus[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  paymentMethod?: PaymentMethod[];
  merchantId?: number;
  subMerchantId?: number;
  searchQuery?: string; // Search in transaction ID, customer name, etc.
}

const useTransactionSearch = (filters: TransactionFilters) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const results = await api.get('/merchant/v1/transactions', { params: filters });
      setTransactions(results.data);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    search();
  }, [search]);
  
  return { transactions, loading, refetch: search };
};
```

### 8. Real-time Updates

```typescript
// WebSocket connection for real-time updates
const useTransactionUpdates = (transactionId: string) => {
  const [status, setStatus] = useState<TransactionStatus>('PENDING');
  
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/transactions/${transactionId}/updates`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setStatus(update.status);
    };
    
    return () => ws.close();
  }, [transactionId]);
  
  return status;
};
```

---

## API ENDPOINTS SUMMARY

### Merchant Endpoints

| Endpoint                                     | Method | Description                      |
| -------------------------------------------- | ------ | -------------------------------- |
| `/merchant/v1/transactions`                  | POST   | Create payment transaction       |
| `/merchant/v1/transactions/uid/{uid}/status` | GET    | Get transaction status           |
| `/merchant/v1/transactions`                  | GET    | List transactions (with filters) |
| `/merchant/v1/disbursements`                 | GET    | List disbursements               |
| `/merchant/v1/disbursements/{id}`            | GET    | Get disbursement details         |

### Admin Endpoints

| Endpoint                     | Method | Description           |
| ---------------------------- | ------ | --------------------- |
| `/admin/v1/merchants`        | GET    | List all merchants    |
| `/admin/v1/payment-gateways` | GET    | List payment gateways |
| `/admin/v1/payment-channels` | GET    | List payment channels |
| `/admin/v1/transactions`     | GET    | List all transactions |

---

## SECURITY CONSIDERATIONS

1. **API Key Storage**: Store securely (environment variables, secure storage)
2. **HTTPS Only**: Use HTTPS for all API calls
3. **Webhook Verification**: Verify webhook signatures when implemented
4. **Input Validation**: Validate all user inputs
5. **Rate Limiting**: Respect rate limits and handle 429 responses
6. **Error Messages**: Avoid exposing sensitive information

---

## TESTING TIPS

1. Use **sandbox environment** for development
2. Test all transaction statuses
3. Test disbursement scenarios (single, multiple, failures)
4. Test error cases (invalid credentials, validation errors)
5. Test webhook handling
6. Test idempotency (duplicate requests)
7. Test with different payment methods and channels

---

## Additional Resources

- **API Documentation**: See `docs/MERCHANT_CHECKOUT_API_DOCUMENTATION.md`
- **Technical Documentation**: See `docs/TECHNICAL_DOCUMENTATION.md`
- **Quick Start Guide**: See `deploy/QUICKSTART.md`

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0

