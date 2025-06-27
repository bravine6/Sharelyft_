const supabase = require('../config/supabase');

const vehicleController = {
  // Get all vehicles for a driver
  async getDriverVehicles(req, res) {
    try {
      console.log('=== GET VEHICLES REQUEST ===');
      console.log('User from req:', req.user);
      
      const driverId = req.user.id;
      console.log('Driver ID:', driverId);

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return res.json([]);
        }
        return res.status(500).json({ 
          message: 'Failed to fetch vehicles',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

      res.json(vehicles || []);
    } catch (error) {
      console.error('Vehicle fetch error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get a specific vehicle
  async getVehicle(req, res) {
    try {
      const { id } = req.params;
      const driverId = req.user.id;

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .eq('driver_id', driverId)
        .single();

      if (error || !vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      res.json(vehicle);
    } catch (error) {
      console.error('Vehicle fetch error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Add a new vehicle
  async addVehicle(req, res) {
    try {
      const driverId = req.user.id;
      const {
        make,
        model,
        year,
        color,
        license_plate,
        seats,
        fuel_type,
        transmission,
        air_conditioning,
        music_system,
        charging_ports,
        registration_number,
        insurance_company,
        insurance_expiry,
        is_default
      } = req.body;

      // Validate required fields
      if (!make || !model || !year || !color || !license_plate || !seats) {
        return res.status(400).json({ 
          message: 'Required fields: make, model, year, color, license_plate, seats' 
        });
      }

      // Check if license plate already exists
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('license_plate', license_plate)
        .single();

      if (existingVehicle) {
        return res.status(400).json({ 
          message: 'A vehicle with this license plate already exists' 
        });
      }

      // If this is set as default, remove default from other vehicles
      if (is_default) {
        await supabase
          .from('vehicles')
          .update({ is_default: false })
          .eq('driver_id', driverId);
      }

      // Check if this is the first vehicle (make it default)
      const { data: vehicleCount } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact' })
        .eq('driver_id', driverId)
        .eq('is_active', true);

      const isFirstVehicle = !vehicleCount || vehicleCount.length === 0;

      const vehicleData = {
        driver_id: driverId,
        make,
        model,
        year: parseInt(year),
        color,
        license_plate: license_plate.toUpperCase(),
        seats: parseInt(seats),
        fuel_type: fuel_type || 'petrol',
        transmission: transmission || 'manual',
        air_conditioning: !!air_conditioning,
        music_system: !!music_system,
        charging_ports: !!charging_ports,
        registration_number,
        insurance_company,
        insurance_expiry,
        is_default: isFirstVehicle || !!is_default,
        verification_status: 'verified' // Set to verified for testing
      };

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();

      if (error) {
        console.error('Error adding vehicle:', error);
        return res.status(500).json({ message: 'Failed to add vehicle' });
      }

      res.status(201).json({ 
        message: 'Vehicle added successfully',
        vehicle 
      });

    } catch (error) {
      console.error('Vehicle add error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Update a vehicle
  async updateVehicle(req, res) {
    try {
      const { id } = req.params;
      const driverId = req.user.id;
      const updateData = { ...req.body };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.driver_id;
      delete updateData.created_at;
      delete updateData.verification_status;
      delete updateData.verified_at;

      // If setting as default, remove default from other vehicles
      if (updateData.is_default) {
        await supabase
          .from('vehicles')
          .update({ is_default: false })
          .eq('driver_id', driverId)
          .neq('id', id);
      }

      // Format license plate
      if (updateData.license_plate) {
        updateData.license_plate = updateData.license_plate.toUpperCase();
      }

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', id)
        .eq('driver_id', driverId)
        .select()
        .single();

      if (error || !vehicle) {
        console.error('Error updating vehicle:', error);
        return res.status(404).json({ message: 'Vehicle not found or update failed' });
      }

      res.json({ 
        message: 'Vehicle updated successfully',
        vehicle 
      });
    } catch (error) {
      console.error('Vehicle update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Set vehicle as default
  async setDefaultVehicle(req, res) {
    try {
      const { id } = req.params;
      const driverId = req.user.id;

      // Remove default from all vehicles
      await supabase
        .from('vehicles')
        .update({ is_default: false })
        .eq('driver_id', driverId);

      // Set this vehicle as default
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update({ is_default: true })
        .eq('id', id)
        .eq('driver_id', driverId)
        .select()
        .single();

      if (error || !vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      res.json({ 
        message: 'Default vehicle updated successfully',
        vehicle 
      });
    } catch (error) {
      console.error('Set default vehicle error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Delete/deactivate a vehicle
  async deleteVehicle(req, res) {
    try {
      const { id } = req.params;
      const driverId = req.user.id;

      // Check if vehicle exists and belongs to driver
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('is_default')
        .eq('id', id)
        .eq('driver_id', driverId)
        .single();

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      // Soft delete (deactivate) the vehicle
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          is_active: false,
          is_default: false 
        })
        .eq('id', id)
        .eq('driver_id', driverId);

      if (error) {
        console.error('Error deleting vehicle:', error);
        return res.status(500).json({ message: 'Failed to delete vehicle' });
      }

      // If this was the default vehicle, set another as default
      if (vehicle.is_default) {
        const { data: otherVehicles } = await supabase
          .from('vehicles')
          .select('id')
          .eq('driver_id', driverId)
          .eq('is_active', true)
          .limit(1);

        if (otherVehicles && otherVehicles.length > 0) {
          await supabase
            .from('vehicles')
            .update({ is_default: true })
            .eq('id', otherVehicles[0].id);
        }
      }

      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Vehicle delete error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get vehicle options for ride posting (for all drivers)
  async getVehicleOptions(req, res) {
    try {
      const driverId = req.user.id;

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, license_plate, seats, color')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .eq('verification_status', 'verified')
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle options:', error);
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return res.json([]);
        }
        return res.status(500).json({ message: 'Failed to fetch vehicle options' });
      }

      const options = vehicles.map(vehicle => ({
        id: vehicle.id,
        label: `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`,
        details: `${vehicle.year} ${vehicle.color} - ${vehicle.seats} seats`,
        ...vehicle
      }));

      res.json(options);
    } catch (error) {
      console.error('Vehicle options error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = vehicleController;