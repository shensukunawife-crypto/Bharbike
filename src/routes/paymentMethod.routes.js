import { Router } from 'express';
import paymentMethodController from '../controllers/paymentMethodController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Payment methods routes
router.get('/methods', paymentMethodController.getPaymentMethods);
router.post('/methods', paymentMethodController.addPaymentMethod);
router.put('/methods/:methodId', paymentMethodController.updatePaymentMethod);
router.delete('/methods/:methodId', paymentMethodController.deletePaymentMethod);
router.put('/methods/:methodId/default', paymentMethodController.setDefaultPaymentMethod);

// Reward points routes
router.get('/rewards', paymentMethodController.getRewardPoints);
router.post('/rewards/redeem', paymentMethodController.redeemRewardPoints);
router.get('/rewards/transactions', paymentMethodController.getRewardTransactions);

// Invoices route
router.get('/invoices', paymentMethodController.getInvoices);

export default router;
