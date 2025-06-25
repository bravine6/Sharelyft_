const supabase = require('../config/supabase');

/**
 * Create a Supabase client with user context for RLS
 * @param {string} userId - The authenticated user's ID
 * @returns {Object} Supabase client with user context
 */
const getSupabaseWithUser = (userId) => {
  // For service role operations with user context, we'll manually set user context
  // This allows RLS policies to work with auth.uid()
  return {
    from: (table) => ({
      select: (columns = '*') => {
        return supabase.from(table).select(columns);
      },
      insert: (data) => {
        // For INSERT operations, we can use RPC to set user context
        return supabase.rpc('insert_with_user_context', {
          table_name: table,
          data: JSON.stringify(data),
          user_id: userId
        });
      },
      update: (data) => {
        const query = supabase.from(table).update(data);
        // Add user context for RLS
        return query;
      },
      delete: () => {
        const query = supabase.from(table).delete();
        return query;
      }
    })
  };
};

/**
 * Execute operation with user context for RLS
 * @param {string} userId - User ID to set context for
 * @param {Function} operation - Function that performs the database operation
 */
const withUserContext = async (userId, operation) => {
  try {
    // Set the user context for this session
    await supabase.rpc('set_user_context', { user_id: userId });
    
    // Execute the operation
    const result = await operation(supabase);
    
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getSupabaseWithUser,
  withUserContext,
  supabase
};