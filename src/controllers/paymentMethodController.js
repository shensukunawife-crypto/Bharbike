import paymentMethodService from '../services/paymentMethodService.js';

class PaymentMethodController {
  // Get all payment methods
  async getPaymentMethods(req, res) {
    try {
      const userId = req.user.id;
      const methods = await paymentMethodService.getPaymentMethods(userId);

      res.json({
        success: true,
        data: methods || []
      });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.json({
        success: false,
        message: 'Failed to fetch payment methods',
        data: []
      });
    }
  }

  // Add a new payment method
  async addPaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const methodData = req.body;

      // Validate required fields
      if (!methodData.type || !methodData.identifier || !methodData.display_name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: type, identifier, display_name'
        });
      }

      const method = await paymentMethodService.addPaymentMethod(userId, methodData);

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: method
      });
    } catch (error) {
      console.error('Add payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add payment method',
        error: error.message
      });
    }
  }

  // Update a payment method
  async updatePaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const { methodId } = req.params;
      const updates = req.body;

      const method = await paymentMethodService.updatePaymentMethod(userId, methodId, updates);

      res.json({
        success: true,
        message: 'Payment method updated successfully',
        data: method
      });
    } catch (error) {
      console.error('Update payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment method',
        error: error.message
      });
    }
  }

  // Delete a payment method
  async deletePaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const { methodId } = req.params;

      await paymentMethodService.deletePaymentMethod(userId, methodId);

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment method',
        error: error.message
      });
    }
  }

  // Set default payment method
  async setDefaultPaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const { methodId } = req.params;

      const method = await paymentMethodService.setDefaultPaymentMethod(userId, methodId);

      res.json({
        success: true,
        message: 'Default payment method updated',
        data: method
      });
    } catch (error) {
      console.error('Set default payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set default payment method',
        error: error.message
      });
    }
  }

  // Get reward points
  async getRewardPoints(req, res) {
    try {
      const userId = req.user.id;
      const reward = await paymentMethodService.getRewardPoints(userId);

      const cashback_value = Math.floor((reward?.points || 0) / 10); // 10 points = ₹1
      res.json({
        success: true,
        data: {
          ...(reward || { points: 0 }),
          cashback_value
        }
      });
    } catch (error) {
      console.error('Get reward points error:', error);
      res.json({
        success: false,
        message: 'Failed to fetch reward points',
        data: { points: 0, cashback_value: 0 }
      });
    }
  }

  // Redeem reward points
  async redeemRewardPoints(req, res) {
    try {
      const userId = req.user.id;
      const { points, description } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid points amount'
        });
      }

      const reward = await paymentMethodService.redeemRewardPoints(
        userId,
        points,
        description || 'Points redeemed'
      );

      res.json({
        success: true,
        message: 'Reward points redeemed successfully',
        data: reward
      });
    } catch (error) {
      console.error('Redeem reward points error:', error);
      res.status(error.message === 'Insufficient reward points' ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to redeem reward points'
      });
    }
  }

  // Get reward transactions
  async getRewardTransactions(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      const transactions = await paymentMethodService.getRewardTransactions(userId, limit);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Get reward transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reward transactions',
        error: error.message
      });
    }
  }

  // Get invoices
  async getInvoices(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      const limit = parseInt(req.query.limit) || 20;
      console.log(`[PaymentMethodController.getInvoices] Fetching for user: ${userId}`);

      const invoices = await paymentMethodService.getInvoices(userId, limit);

      res.json({
        success: true,
        data: invoices || []
      });
    } catch (error) {
      console.error('[PaymentMethodController.getInvoices] Critical error:', error);
      res.status(200).json({
        success: true,
        data: [],
        message: 'Returning empty invoices due to error'
      });
    }
  }
}

export default new PaymentMethodController();
