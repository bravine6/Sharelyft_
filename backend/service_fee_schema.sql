-- Simple Service Fee Payment System for ShareLyft
-- Collects KSh 50 from driver + KSh 50 from passenger = KSh 100 total
-- After payment, unlocks chat and contact information

-- Service fee payments table
CREATE TABLE service_fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payer_type VARCHAR(10) NOT NULL CHECK (payer_type IN ('driver', 'passenger')),
  
  amount NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (amount = 50.00),
  payment_method_type VARCHAR(20) NOT NULL CHECK (payment_method_type IN ('mpesa', 'card', 'wallet')),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  
  -- M-Pesa specific fields
  mpesa_phone VARCHAR(15) NULL,
  mpesa_transaction_id VARCHAR(50) NULL,
  
  -- Card payment fields
  card_transaction_id VARCHAR(100) NULL,
  
  -- External payment references
  external_payment_id VARCHAR(255) NULL,
  external_reference VARCHAR(255) NULL,
  
  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  failed_at TIMESTAMP WITH TIME ZONE NULL,
  failure_reason TEXT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT service_fee_payments_pkey PRIMARY KEY (id),
  CONSTRAINT service_fee_payments_unique_payer UNIQUE (ride_request_id, payer_id, payer_type)
);

-- Connection unlock status table
CREATE TABLE connection_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  
  driver_paid BOOLEAN NOT NULL DEFAULT FALSE,
  passenger_paid BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Unlock status
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Features unlocked
  chat_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  contact_info_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT connection_unlocks_pkey PRIMARY KEY (id),
  CONSTRAINT connection_unlocks_ride_request_unique UNIQUE (ride_request_id)
);

-- Platform revenue tracking
CREATE TABLE platform_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  
  driver_fee_payment_id UUID NULL REFERENCES service_fee_payments(id),
  passenger_fee_payment_id UUID NULL REFERENCES service_fee_payments(id),
  
  total_revenue NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  driver_fee_received NUMERIC(5, 2) NULL,
  passenger_fee_received NUMERIC(5, 2) NULL,
  
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT platform_revenue_pkey PRIMARY KEY (id),
  CONSTRAINT platform_revenue_ride_request_unique UNIQUE (ride_request_id)
);

-- Chat messages table (unlocked after payment)
CREATE TABLE chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  message_type VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'location', 'image')),
  
  -- Message metadata
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX idx_service_fee_payments_ride_request_id ON service_fee_payments(ride_request_id);
CREATE INDEX idx_service_fee_payments_payer_id ON service_fee_payments(payer_id);
CREATE INDEX idx_service_fee_payments_status ON service_fee_payments(status);
CREATE INDEX idx_service_fee_payments_payer_type ON service_fee_payments(payer_type);

CREATE INDEX idx_connection_unlocks_ride_request_id ON connection_unlocks(ride_request_id);
CREATE INDEX idx_connection_unlocks_status ON connection_unlocks(is_unlocked);

CREATE INDEX idx_platform_revenue_revenue_date ON platform_revenue(revenue_date);
CREATE INDEX idx_platform_revenue_ride_request_id ON platform_revenue(ride_request_id);

CREATE INDEX idx_chat_messages_ride_request_id ON chat_messages(ride_request_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Create update triggers
CREATE TRIGGER update_service_fee_payments_updated_at
    BEFORE UPDATE ON service_fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_unlocks_updated_at
    BEFORE UPDATE ON connection_unlocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check and unlock connection when both payments are received
CREATE OR REPLACE FUNCTION check_and_unlock_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if payment was just completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Get or create connection unlock record
    INSERT INTO connection_unlocks (ride_request_id)
    VALUES (NEW.ride_request_id)
    ON CONFLICT (ride_request_id) DO NOTHING;
    
    -- Update payment status based on payer type
    UPDATE connection_unlocks 
    SET 
      driver_paid = CASE 
        WHEN NEW.payer_type = 'driver' THEN TRUE 
        ELSE driver_paid 
      END,
      passenger_paid = CASE 
        WHEN NEW.payer_type = 'passenger' THEN TRUE 
        ELSE passenger_paid 
      END,
      updated_at = NOW()
    WHERE ride_request_id = NEW.ride_request_id;
    
    -- Check if both have paid and unlock if so
    UPDATE connection_unlocks 
    SET 
      is_unlocked = TRUE,
      unlocked_at = NOW(),
      chat_enabled = TRUE,
      contact_info_revealed = TRUE,
      updated_at = NOW()
    WHERE ride_request_id = NEW.ride_request_id 
      AND driver_paid = TRUE 
      AND passenger_paid = TRUE 
      AND is_unlocked = FALSE;
    
    -- Update platform revenue
    INSERT INTO platform_revenue (
      ride_request_id, 
      total_revenue,
      driver_fee_received,
      passenger_fee_received
    )
    VALUES (
      NEW.ride_request_id,
      CASE 
        WHEN NEW.payer_type = 'driver' THEN 50.00
        ELSE 50.00
      END,
      CASE WHEN NEW.payer_type = 'driver' THEN 50.00 ELSE NULL END,
      CASE WHEN NEW.payer_type = 'passenger' THEN 50.00 ELSE NULL END
    )
    ON CONFLICT (ride_request_id) DO UPDATE SET
      total_revenue = platform_revenue.total_revenue + 50.00,
      driver_fee_received = CASE 
        WHEN NEW.payer_type = 'driver' THEN 50.00 
        ELSE platform_revenue.driver_fee_received 
      END,
      passenger_fee_received = CASE 
        WHEN NEW.payer_type = 'passenger' THEN 50.00 
        ELSE platform_revenue.passenger_fee_received 
      END;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-unlock when both payments complete
CREATE TRIGGER trigger_check_unlock_connection
    AFTER UPDATE ON service_fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION check_and_unlock_connection();