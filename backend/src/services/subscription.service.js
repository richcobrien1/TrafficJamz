const Subscription = require('../models/subscription.model');
const SubscriptionPlan = require('../models/subscription-plan.model');
const User = require('../models/user.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

/**
 * Subscription service for handling subscription-related operations
 */
class SubscriptionService {
  /**
   * Get all available subscription plans
   * @returns {Promise<Array>} - Array of subscription plans
   */
  async getSubscriptionPlans() {
    try {
      const plans = await SubscriptionPlan.findActivePlans();
      return plans;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's current subscription
   * @param {string} user_id - User ID
   * @returns {Promise<Object>} - Subscription data
   */
  async getUserSubscription(user_id) {
    try {
      const subscription = await Subscription.findActiveByUserId(user_id);
      
      if (!subscription) {
        return {
          status: 'inactive',
          has_subscription: false
        };
      }

      // Get subscription plan details
      const plan = await SubscriptionPlan.findByPk(subscription.plan_id);
      
      return {
        id: subscription.id,
        status: subscription.status,
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billing_cycle: plan.billing_cycle,
          features: plan.features
        } : null,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        auto_renew: subscription.auto_renew,
        has_subscription: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe user to a plan
   * @param {string} user_id - User ID
   * @param {string} planId - Subscription plan ID
   * @param {string} paymentMethodId - Payment method ID
   * @param {boolean} autoRenew - Auto-renew flag
   * @returns {Promise<Object>} - Subscription data
   */
  async subscribe(user_id, planId, paymentMethodId, autoRenew = true) {
    try {
      // Check if user exists
      const user = await User.findOne({ where: { user_id: user_id } })
      if (!user) {
        throw new Error('User not found');
      }

      // Check if plan exists
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan || !plan.active) {
        throw new Error('Subscription plan not found or inactive');
      }

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findActiveByUserId(user_id);
      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Create Stripe customer if not exists
      let stripeCustomerId = null;
      if (paymentMethodId) {
        // In a real implementation, we would:
        // 1. Create or retrieve Stripe customer
        // 2. Attach payment method to customer
        // 3. Create Stripe subscription
        stripeCustomerId = `cus_${Math.random().toString(36).substring(2, 15)}`;
      }

      // Calculate end date based on billing cycle
      const startDate = new Date();
      let endDate = new Date(startDate);
      
      switch (plan.billing_cycle) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annual':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create subscription
      const subscription = await Subscription.create({
        id: uuidv4(),
        user_id: user_id,
        plan_id: planId,
        status: plan.trial_period_days > 0 ? 'trial' : 'active',
        start_date: startDate,
        end_date: endDate,
        auto_renew: autoRenew,
        payment_method_id: paymentMethodId,
        stripe_customer_id: stripeCustomerId,
        trial_end_date: plan.trial_period_days > 0 ? 
          new Date(startDate.getTime() + plan.trial_period_days * 24 * 60 * 60 * 1000) : null
      });

      return {
        id: subscription.id,
        status: subscription.status,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billing_cycle: plan.billing_cycle,
          features: plan.features
        },
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        auto_renew: subscription.auto_renew,
        trial_end_date: subscription.trial_end_date
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel user subscription
   * @param {string} user_id - User ID
   * @returns {Promise<Object>} - Updated subscription
   */
  async cancelSubscription(user_id) {
    try {
      // Get active subscription
      const subscription = await Subscription.findActiveByUserId(user_id);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // In a real implementation, we would:
      // 1. Cancel Stripe subscription if exists
      // 2. Update subscription status

      // Update subscription
      subscription.auto_renew = false;
      subscription.cancellation_date = new Date();
      subscription.cancellation_reason = 'user_requested';
      await subscription.save();

      return {
        id: subscription.id,
        status: subscription.status,
        end_date: subscription.end_date,
        auto_renew: subscription.auto_renew,
        cancellation_date: subscription.cancellation_date
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update payment method
   * @param {string} user_id - User ID
   * @param {string} paymentMethodId - New payment method ID
   * @returns {Promise<boolean>} - Success status
   */
  async updatePaymentMethod(user_id, paymentMethodId) {
    try {
      // Get active subscription
      const subscription = await Subscription.findActiveByUserId(user_id);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // In a real implementation, we would:
      // 1. Attach new payment method to Stripe customer
      // 2. Update default payment method

      // Update subscription
      subscription.payment_method_id = paymentMethodId;
      await subscription.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment history
   * @param {string} user_id - User ID
   * @returns {Promise<Array>} - Array of payments
   */
  async getPaymentHistory(user_id) {
    try {
      // In a real implementation, we would:
      // 1. Fetch payment history from Stripe
      // 2. Format and return the data

      // Mock payment history
      return [
        {
          id: uuidv4(),
          amount: 9.99,
          currency: 'USD',
          status: 'completed',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          description: 'Monthly subscription'
        },
        {
          id: uuidv4(),
          amount: 9.99,
          currency: 'USD',
          status: 'completed',
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          description: 'Monthly subscription'
        }
      ];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle webhook events from payment provider
   * @param {Object} event - Webhook event
   * @returns {Promise<boolean>} - Success status
   */
  async handleWebhookEvent(event) {
    try {
      // In a real implementation, we would:
      // 1. Verify webhook signature
      // 2. Process different event types (payment_succeeded, payment_failed, etc.)
      // 3. Update subscription status accordingly

      console.log('Received webhook event:', event.type);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user has access to a feature
   * @param {string} user_id - User ID
   * @param {string} feature - Feature name
   * @returns {Promise<boolean>} - Access status
   */
  async hasFeatureAccess(user_id, feature) {
    try {
      // Get active subscription
      const subscription = await Subscription.findActiveByUserId(user_id);
      if (!subscription) {
        return false;
      }

      // Get subscription plan
      const plan = await SubscriptionPlan.findByPk(subscription.plan_id);
      if (!plan) {
        return false;
      }

      // Check if plan has the feature
      return plan.features && plan.features[feature] === true;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Create a new subscription plan (admin only)
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} - Created plan
   */
  async createSubscriptionPlan(planData) {
    try {
      // In a real implementation, we would:
      // 1. Create Stripe product and price
      // 2. Store the IDs in our database

      // Create plan
      const plan = await SubscriptionPlan.create({
        id: uuidv4(),
        name: planData.name,
        description: planData.description,
        price: planData.price,
        currency: planData.currency || 'USD',
        billing_cycle: planData.billing_cycle || 'monthly',
        features: planData.features || {},
        trial_period_days: planData.trial_period_days || 0,
        active: true,
        stripe_price_id: `price_${Math.random().toString(36).substring(2, 15)}`,
        stripe_product_id: `prod_${Math.random().toString(36).substring(2, 15)}`
      });

      return plan;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a subscription plan (admin only)
   * @param {string} planId - Plan ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated plan
   */
  async updateSubscriptionPlan(planId, updateData) {
    try {
      // Get plan
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // In a real implementation, we would:
      // 1. Update Stripe product if necessary
      // 2. Create new price if price changes (Stripe prices are immutable)

      // Update allowed fields
      const allowedFields = [
        'name', 'description', 'features', 'trial_period_days', 'active'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          plan[field] = updateData[field];
        }
      }

      await plan.save();
      return plan;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SubscriptionService();
