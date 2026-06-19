-- Driver Verification Documents Table
CREATE TABLE IF NOT EXISTS driver_verification_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('license', 'insurance', 'registration', 'photo')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected')),
    rejection_reason TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_verification_user_id ON driver_verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_type ON driver_verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_verification_status ON driver_verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_verification_uploaded_at ON driver_verification_documents(uploaded_at);

-- Row Level Security disabled for now
-- ALTER TABLE driver_verification_documents ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_driver_verification_documents_updated_at
    BEFORE UPDATE ON driver_verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_verification_updated_at();

-- Add verification status to user_profiles table if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' 
CHECK (verification_status IN ('pending', 'partial', 'verified', 'rejected'));

-- Function to update user verification status based on documents
CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's overall verification status
    UPDATE user_profiles 
    SET verification_status = (
        CASE 
            WHEN (
                SELECT COUNT(*) 
                FROM driver_verification_documents 
                WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
                AND document_type IN ('license', 'insurance', 'registration')
                AND status = 'verified'
            ) = 3 THEN 'verified'
            WHEN (
                SELECT COUNT(*) 
                FROM driver_verification_documents 
                WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
                AND status = 'verified'
            ) > 0 THEN 'partial'
            WHEN (
                SELECT COUNT(*) 
                FROM driver_verification_documents 
                WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
                AND status = 'rejected'
            ) > 0 THEN 'rejected'
            ELSE 'pending'
        END
    )
    WHERE id = COALESCE(NEW.user_id, OLD.user_id)
    AND user_type = 'driver';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to automatically update user verification status
CREATE TRIGGER update_user_verification_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON driver_verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_status();

-- Insert default document storage bucket policy (if using Supabase Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies disabled for now
-- CREATE POLICY "Users can upload verification documents" ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'documents');

-- CREATE POLICY "Users can view own verification documents" ON storage.objects FOR SELECT
--     USING (bucket_id = 'documents');

-- CREATE POLICY "Users can delete own verification documents" ON storage.objects FOR DELETE
--     USING (bucket_id = 'documents');