// Phone-number normalizer. Kenyan-first (defaults country code to +254 when
// the user leaves it off), but tolerates already-international numbers too.
// Returns a canonical E.164-ish form so equality checks and uniqueness
// queries don't get tripped up by whitespace / formatting variations.
//
// Examples:
//   normalizePhone('0712345678')       → '+254712345678'
//   normalizePhone('712345678')        → '+254712345678'
//   normalizePhone('+254 713 432 225') → '+254713432225'
//   normalizePhone('254713432225')     → '+254713432225'
//   normalizePhone('')                 → null
//   normalizePhone(null)               → null
//   normalizePhone('abc')              → null (invalid — caller decides)
function normalizePhone(input) {
  if (input == null) return null;
  const cleaned = String(input).replace(/[^+\d]/g, '');
  if (!cleaned) return null;

  // Already in +254 form
  if (cleaned.startsWith('+254')) return cleaned;

  // 254 without the leading plus
  if (cleaned.startsWith('254')) return '+' + cleaned;

  // Local Kenyan format starting with 0
  if (cleaned.startsWith('0')) return '+254' + cleaned.substring(1);

  // 9-digit mobile without country code (starts with 7)
  if (/^7\d{8}$/.test(cleaned)) return '+254' + cleaned;

  // Some other international number already digit-only
  if (/^\d{10,15}$/.test(cleaned) && !cleaned.startsWith('+')) return '+' + cleaned;

  // Give up — return cleaned so caller can decide to reject
  return cleaned;
}

module.exports = { normalizePhone };
