-- Payment System Database Schema for ShareLyft
-- Supports multiple payment methods and escrow system

-- Payment methods table
CREATE TABLE payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('mpesa', 'card', 'bank', 'wallet')),
  
  -- M-Pesa specific fields
  mpesa_phone VARCHAR(15) NULL,
  
  -- Card specific fields (encrypted/tokenized)
  card_token VARCHAR(255) NULL,
  card_last_four VARCHAR(4) NULL,
  card_brand VARCHAR(20) NULL,
  card_exp_month INTEGER NULL,
  card_exp_year INTEGER NULL,
  
  -- Bank specific fields
  bank_name VARCHAR(100) NULL,
  account_number_encrypted VARCHAR(255) NULL,
  
  is_default BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);

-- Payments table - tracks all payment transactions
CREATE TABLE payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Payment amounts
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  driver_amount NUMERIC(10, 2) NOT NULL CHECK (driver_amount > 0),
  
  -- Payment method and status
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_method_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
  ),
  
  -- External payment references
  external_payment_id VARCHAR(255) NULL, -- Stripe payment intent, M-Pesa transaction ID, etc.
  external_reference VARCHAR(255) NULL,
  
  -- Payment flow tracking
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  failed_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Error handling
  failure_reason TEXT NULL,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  payment_metadata JSONB NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Payment escrow table - holds funds until ride completion
CREATE TABLE payment_escrow (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'held' CHECK (
    status IN ('held', 'released', 'refunded')
  ),
  
  held_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  released_at TIMESTAMP WITH TIME ZONE NULL,
  release_reason VARCHAR(50) NULL CHECK (
    release_reason IN ('ride_completed', 'manual_release', 'dispute_resolved')
  ),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT payment_escrow_pkey PRIMARY KEY (id)
);

-- Payment disputes table
CREATE TABLE payment_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  disputer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  dispute_type VARCHAR(30) NOT NULL CHECK (
    dispute_type IN ('ride_not_completed', 'overcharge', 'service_issue', 'refund_request')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'investigating', 'resolved', 'closed')
  ),
  
  description TEXT NOT NULL,
  resolution TEXT NULL,
  resolved_by UUID NULL REFERENCES user_profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  
  CONSTRAINT payment_disputes_pkey PRIMARY KEY (id)
);

-- Platform earnings table - tracks revenue
CREATE TABLE platform_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  fee_type VARCHAR(20) NOT NULL CHECK (
    fee_type IN ('platform_fee', 'payment_processing', 'dispute_fee')
  ),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT platform_earnings_pkey PRIMARY KEY (id)
);

-- Wallet/Credits system
CREATE TABLE user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT user_wallets_user_id_key UNIQUE (user_id)
);

-- Wallet transactions
CREATE TABLE wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN ('credit', 'debit', 'refund', 'bonus')
  ),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(10, 2) NOT NULL CHECK (balance_after >= 0),
  
  description TEXT NOT NULL,
  reference_type VARCHAR(20) NULL CHECK (
    reference_type IN ('payment', 'refund', 'bonus', 'topup')
  ),
  reference_id UUID NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(method_type);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

CREATE INDEX idx_payments_ride_request_id ON payments(ride_request_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_recipient_id ON payments(recipient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_payment_escrow_payment_id ON payment_escrow(payment_id);
CREATE INDEX idx_payment_escrow_status ON payment_escrow(status);

CREATE INDEX idx_payment_disputes_payment_id ON payment_disputes(payment_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);

CREATE INDEX idx_platform_earnings_payment_id ON platform_earnings(payment_id);
CREATE INDEX idx_platform_earnings_created_at ON platform_earnings(created_at);

CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Create update triggers
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_escrow_updated_at
    BEFORE UPDATE ON payment_escrow
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();