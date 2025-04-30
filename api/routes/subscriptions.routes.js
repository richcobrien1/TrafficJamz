const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscription.service');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route GET /api/subscriptions/plans
 * @desc Get all available subscription plans
 * @access Public
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/subscriptions/me
 * @desc Get user's current subscription
 * @access Private
 */
router.get('/me',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const subscription = await subscriptionService.getUserSubscription(req.user.user_id);
      res.json({ success: true, subscription });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/subscriptions/subscribe
 * @desc Subscribe user to a plan
 * @access Private
 */
router.post('/subscribe',
  passport.authenticate('jwt', { session: false }),
  [
    body('plan_id').exists().withMessage('Plan ID is required'),
    body('payment_method_id').optional(),
    body('auto_renew').optional().isBoolean().withMessage('Auto renew must be a boolean'),
    validate
  ],
  async (req, res) => {
    try {
      const subscription = await subscriptionService.subscribe(
        req.user.user_id,
        req.body.plan_id,
        req.body.payment_method_id,
        req.body.auto_renew
      );
      res.status(201).json({ success: true, subscription });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel user subscription
 * @access Private
 */
router.post('/cancel',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await subscriptionService.cancelSubscription(req.user.user_id);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/subscriptions/payment-method
 * @desc Update payment method
 * @access Private
 */
router.put('/payment-method',
  passport.authenticate('jwt', { session: false }),
  [
    body('payment_method_id').exists().withMessage('Payment method ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      await subscriptionService.updatePaymentMethod(req.user.user_id, req.body.payment_method_id);
      res.json({ success: true, message: 'Payment method updated successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/subscriptions/payment-history
 * @desc Get payment history
 * @access Private
 */
router.get('/payment-history',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const history = await subscriptionService.getPaymentHistory(req.user.user_id);
      res.json({ success: true, history });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/subscriptions/webhook
 * @desc Handle webhook events from payment provider
 * @access Public (but should be secured with webhook signature verification)
 */
router.post('/webhook', async (req, res) => {
  try {
    // In a real implementation, we would verify the webhook signature
    await subscriptionService.handleWebhookEvent(req.body);
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook error');
  }
});

/**
 * @route GET /api/subscriptions/feature-access/:feature
 * @desc Check if user has access to a feature
 * @access Private
 */
router.get('/feature-access/:feature',
  passport.authenticate('jwt', { session: false }),
  [
    param('feature').exists().withMessage('Feature name is required'),
    validate
  ],
  async (req, res) => {
    try {
      const hasAccess = await subscriptionService.hasFeatureAccess(req.user.user_id, req.params.feature);
      res.json({ success: true, has_access: hasAccess });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Admin routes - these would typically be in a separate admin router with additional authorization

/**
 * @route POST /api/subscriptions/plans
 * @desc Create a new subscription plan (admin only)
 * @access Private/Admin
 */
router.post('/plans',
  passport.authenticate('jwt', { session: false }),
  [
    // Add admin check middleware here
    body('name').exists().withMessage('Plan name is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('billing_cycle').isIn(['monthly', 'quarterly', 'annual']).withMessage('Invalid billing cycle'),
    validate
  ],
  async (req, res) => {
    try {
      // Mock admin check
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const plan = await subscriptionService.createSubscriptionPlan(req.body);
      res.status(201).json({ success: true, plan });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/subscriptions/plans/:planId
 * @desc Update a subscription plan (admin only)
 * @access Private/Admin
 */
router.put('/plans/:planId',
  passport.authenticate('jwt', { session: false }),
  [
    // Add admin check middleware here
    param('planId').exists().withMessage('Plan ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      // Mock admin check
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const plan = await subscriptionService.updateSubscriptionPlan(req.params.planId, req.body);
      res.json({ success: true, plan });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
