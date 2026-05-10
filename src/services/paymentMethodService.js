import supabase from '../utils/supabaseClient.js';

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("does not exist") || error.code === "42P01";
}

class PaymentMethodService {
  // Get all payment methods for a user
  async getPaymentMethods(userId) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return data;
  }

  // Add a new payment method
  async addPaymentMethod(userId, methodData) {
    const { type, provider, identifier, display_name, is_default, metadata } = methodData;

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        type,
        provider,
        identifier,
        display_name,
        is_default: is_default || false,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update a payment method
  async updatePaymentMethod(userId, methodId, updates) {
    const { data, error } = await supabase
      .from('payment_methods')
      .update(updates)
      .eq('id', methodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a payment method
  async deletePaymentMethod(userId, methodId) {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  // Set default payment method
  async setDefaultPaymentMethod(userId, methodId) {
    // The trigger will automatically unset other defaults
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get reward points for a user
  async getRewardPoints(userId) {
    let { data, error } = await supabase
      .from('reward_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no record exists, create one
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('reward_points')
        .insert({ user_id: userId, points: 0 })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    if (error) {
      if (isMissingTableError(error)) return { id: 'mock', user_id: userId, points: 0, cashback_value: 0 };
      throw error;
    }
    return data;
  }

  // Add reward points
  async addRewardPoints(userId, points, description, referenceId = null) {
    // Get current points
    const currentReward = await this.getRewardPoints(userId);

    // Update points
    const { data: updatedReward, error: updateError } = await supabase
      .from('reward_points')
      .update({ points: currentReward.points + points })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create transaction record
    const { error: txError } = await supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        points,
        type: 'earned',
        description,
        reference_id: referenceId
      });

    if (txError) throw txError;

    return updatedReward;
  }

  // Redeem reward points
  async redeemRewardPoints(userId, points, description, referenceId = null) {
    // Get current points
    const currentReward = await this.getRewardPoints(userId);

    if (currentReward.points < points) {
      throw new Error('Insufficient reward points');
    }

    // Update points
    const { data: updatedReward, error: updateError } = await supabase
      .from('reward_points')
      .update({ points: currentReward.points - points })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create transaction record
    const { error: txError } = await supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        points: -points,
        type: 'redeemed',
        description,
        reference_id: referenceId
      });

    if (txError) throw txError;

    return updatedReward;
  }

  // Get reward transactions
  async getRewardTransactions(userId, limit = 50) {
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return data;
  }

  // Get invoices (from payments table)
  async getInvoices(userId, limit = 20) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_method,
        created_at,
        rentals (
          bike_id,
          bikes (
            name,
            registration_number
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    // Format invoices
    return data.map(payment => ({
      id: `INV-${payment.id.slice(0, 4).toUpperCase()}`,
      amount: payment.amount,
      status: payment.status === 'completed' ? 'Paid' : payment.status === 'refunded' ? 'Refunded' : 'Pending',
      payment_method: payment.payment_method,
      date: payment.created_at,
      bike_name: payment.rentals?.bikes?.name || 'Unknown Bike',
      bike_number: payment.rentals?.bikes?.registration_number || 'N/A'
    }));
  }
}

export default new PaymentMethodService();
