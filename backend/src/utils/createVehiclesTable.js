const { supabase } = require('../config/supabase');

async function createVehiclesTable() {
  const sql = `
    -- Create vehicles table for driver vehicle management
    CREATE TABLE IF NOT EXISTS vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      
      -- Basic vehicle information
      make VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
      color VARCHAR(50) NOT NULL,
      license_plate VARCHAR(20) NOT NULL UNIQUE,
      
      -- Vehicle specifications
      seats INTEGER NOT NULL DEFAULT 4 CHECK (seats >= 2 AND seats <= 8),
      fuel_type VARCHAR(20) DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
      transmission VARCHAR(20) DEFAULT 'manual' CHECK (transmission IN ('manual', 'automatic')),
      
      -- Vehicle features
      air_conditioning BOOLEAN DEFAULT false,
      music_system BOOLEAN DEFAULT false,
      charging_ports BOOLEAN DEFAULT false,
      
      -- Registration and legal
      registration_number VARCHAR(50),
      insurance_company VARCHAR(100),
      insurance_expiry DATE,
      
      -- Verification status
      verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
      verification_notes TEXT,
      verified_at TIMESTAMP WITH TIME ZONE,
      
      -- Documents (JSON array of document URLs/paths)
      vehicle_photos JSONB DEFAULT '[]',
      registration_documents JSONB DEFAULT '[]',
      insurance_documents JSONB DEFAULT '[]',
      
      -- Vehicle status
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    console.log('Creating vehicles table...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error creating vehicles table:', error);
      return false;
    }

    console.log('Vehicles table created successfully');

    // Create indexes
    const indexSql = `
      CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
      CREATE INDEX IF NOT EXISTS idx_vehicles_verification_status ON vehicles(verification_status);
      CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_driver_default ON vehicles(driver_id) WHERE is_default = true;
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
    
    if (indexError) {
      console.error('Error creating indexes:', indexError);
    } else {
      console.log('Vehicle indexes created successfully');
    }

    return true;
  } catch (error) {
    console.error('Exception creating vehicles table:', error);
    return false;
  }
}

module.exports = { createVehiclesTable };