const supabase = require('../config/supabase');
const crypto = require('crypto');

// Get all payment methods for a user
exports.getPaymentMethods = async (req, res) => {
  try {
    const { user } = req;
    
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Remove sensitive information from card details
    const sanitizedData = data.map(method => {
      if (method.type === 'card' && method.card_number) {
        return {
          ...method,
          card_number: `**** **** **** ${method.card_number.slice(-4)}`
        };
      }
      return method;
    });
    
    res.json(sanitizedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    const { user } = req;
    const { type, details } = req.body;
    
    // Validate required fields
    if (!type || !details) {
      return res.status(400).json({ message: 'Payment method type and details are required' });
    }
    
    // Validate payment method type
    if (!['card', 'bank'].includes(type)) {
      return res.status(400).json({ message: 'Invalid payment method type' });
    }
    
    let paymentMethodData = {
      user_id: user.id,
      type,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if this is the user's first payment method
    const { data: existingMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id);
    
    const isFirstMethod = !existingMethods || existingMethods.length === 0;
    
    // Process different payment method types
    switch (type) {
      case 'card':
        const { card_number, cardholder_name, expiry_date, cvv } = details;
        
        if (!card_number || !cardholder_name || !expiry_date || !cvv) {
          return res.status(400).json({ message: 'All card details are required' });
        }
        
        // Basic card number validation (remove spaces and check length)
        const cleanCardNumber = card_number.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(cleanCardNumber)) {
          return res.status(400).json({ message: 'Invalid card number' });
        }
        
        // Validate expiry date (MM/YY format)
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry_date)) {
          return res.status(400).json({ message: 'Invalid expiry date format (MM/YY)' });
        }
        
        // Check if card is expired
        const [month, year] = expiry_date.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        if (expiryDate < new Date()) {
          return res.status(400).json({ message: 'Card has expired' });
        }
        
        // Encrypt sensitive card data (in production, use proper encryption)
        const encryptedCardNumber = crypto.createHash('sha256').update(cleanCardNumber).digest('hex');
        
        paymentMethodData = {
          ...paymentMethodData,
          card_number: cleanCardNumber, // Store last 4 digits only in production
          cardholder_name,
          expiry_date,
          name: 'Credit/Debit Card',
          is_default: isFirstMethod
        };
        break;
        
      case 'bank':
        const { bank_name, account_number, account_name } = details;
        
        if (!bank_name || !account_number || !account_name) {
          return res.status(400).json({ message: 'All bank details are required' });
        }
        
        // Validate account number (basic validation)
        if (!/^\d{6,20}$/.test(account_number)) {
          return res.status(400).json({ message: 'Invalid account number' });
        }
        
        paymentMethodData = {
          ...paymentMethodData,
          bank_name,
          account_number,
          account_name,
          name: bank_name,
          is_default: isFirstMethod
        };
        break;
    }
    
    // Insert payment method
    const { data, error } = await supabase
      .from('payment_methods')
      .insert(paymentMethodData)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Sanitize response for card data
    if (data.type === 'card' && data.card_number) {
      data.card_number = `**** **** **** ${data.card_number.slice(-4)}`;
    }
    
    res.status(201).json({
      message: 'Payment method added successfully',
      payment_method: data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set default payment method
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Verify the payment method belongs to the user
    const { data: paymentMethod, error: findError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (findError || !paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    // Remove default from all other payment methods
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id);
    
    // Set this method as default
    const { error } = await supabase
      .from('payment_methods')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Verify the payment method belongs to the user
    const { data: paymentMethod, error: findError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (findError || !paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    // Check if this is the default payment method
    if (paymentMethod.is_default) {
      // Check if user has other payment methods
      const { data: otherMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .neq('id', id);
      
      if (otherMethods && otherMethods.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete the default payment method. Set another method as default first.' 
        });
      }
    }
    
    // Delete the payment method
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify payment method
exports.verifyPaymentMethod = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const { verification_code } = req.body;
    
    // Verify the payment method belongs to the user
    const { data: paymentMethod, error: findError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (findError || !paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    if (paymentMethod.is_verified) {
      return res.status(400).json({ message: 'Payment method is already verified' });
    }
    
    // For cards, we would integrate with payment processors like Stripe.
    // For now, we'll simulate verification.

    let verificationSuccess = false;

    switch (paymentMethod.type) {
      case 'card':
        // Simulate card verification
        // In production, this would involve creating a small charge and verifying
        verificationSuccess = verification_code === '1234'; // Demo code
        break;
        
      case 'bank':
        // Simulate bank verification
        // In production, this would involve micro-deposits or bank API integration
        verificationSuccess = verification_code === '1234'; // Demo code
        break;
    }
    
    if (!verificationSuccess) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Update payment method as verified
    const { error } = await supabase
      .from('payment_methods')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: 'Payment method verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};