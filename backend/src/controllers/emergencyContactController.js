// Emergency Contact controller.
//
// Emergency contacts live in a SEPARATE protected table (user_emergency_contacts),
// not on user_profiles. They must never appear on public profiles or in chat
// contact-reveal. Only the owner may read/write their own row (enforced by
// authMiddleware + RLS on the table as defense-in-depth).
//
// A future admin/safety workflow may need read access — that's a scope for later
// and should go through a distinct, audited endpoint, not this one.

const supabase = require('../config/supabase');
const { normalizePhone } = require('../utils/phone');

// GET /api/profile/emergency-contact
// Returns the caller's emergency contact (or empty object if unset).
exports.getEmergencyContact = async (req, res) => {
  try {
    const userId = req.user.id; // user_profiles.id (profile PK)

    const { data, error } = await supabase
      .from('user_emergency_contacts')
      .select('name, phone, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[getEmergencyContact] Supabase error:', error);
      return res.status(500).json({ message: error.message });
    }

    // maybeSingle returns null if no row — return an empty shell so frontend
    // can treat "no contact" and "contact with empty fields" identically.
    res.json(data || { name: null, phone: null, updated_at: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile/emergency-contact
// Body: { name, phone }
// Upserts the caller's emergency contact. Pass null/'' to clear a field.
exports.upsertEmergencyContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body || {};

    // Validate: phone (if given) must look like a real phone number
    let normalizedPhone = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone || !/^\+?\d{9,15}$/.test(normalizedPhone)) {
        return res.status(400).json({
          message: 'Emergency contact phone must be a valid phone number'
        });
      }
    }

    const trimmedName = typeof name === 'string' ? name.trim() : null;
    if (trimmedName && trimmedName.length > 100) {
      return res.status(400).json({ message: 'Emergency contact name too long' });
    }

    // Upsert on user_id (UNIQUE constraint in the table)
    const { data, error } = await supabase
      .from('user_emergency_contacts')
      .upsert(
        {
          user_id: userId,
          name: trimmedName || null,
          phone: normalizedPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('name, phone, updated_at')
      .single();

    if (error) {
      console.error('[upsertEmergencyContact] Supabase error:', error);
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Emergency contact saved', contact: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
