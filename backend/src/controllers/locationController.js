const supabase = require('../config/supabase');

// Get all counties
exports.getCounties = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('counties')
      .select('*')
      .order('name');
    
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all towns
exports.getTowns = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('towns')
      .select('*')
      .order('name');
    
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get towns by county
exports.getTownsByCounty = async (req, res) => {
  try {
    const { countyId } = req.params;
    
    const { data, error } = await supabase
      .from('towns')
      .select('*')
      .eq('county_id', countyId)
      .order('name');
    
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get counties with their towns
exports.getCountiesWithTowns = async (req, res) => {
  try {
    const { data: counties, error: countiesError } = await supabase
      .from('counties')
      .select('*')
      .order('name');
    
    if (countiesError) {
      return res.status(500).json({ message: countiesError.message });
    }
    
    const { data: towns, error: townsError } = await supabase
      .from('towns')
      .select('*')
      .order('name');
    
    if (townsError) {
      return res.status(500).json({ message: townsError.message });
    }
    
    // Group towns by county
    const countiesWithTowns = counties.map(county => ({
      ...county,
      towns: towns.filter(town => town.county_id === county.id)
    }));
    
    res.json(countiesWithTowns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};