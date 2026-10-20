import Stripe from 'stripe';

/**
 * Server-side Stripe Client Singleton
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
  appInfo: {
    name: 'Apploye SaaS Platform',
    version: '3.4.0',
  },
});

export interface SubscriptionTier {
  id: 'STARTER' | 'STANDARD' | 'ELITE';
  name: string;
  pricePerUserMonthly: number;
  stripePriceIdMonthly: string;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<'STARTER' | 'STANDARD' | 'ELITE', SubscriptionTier> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter Plan',
    pricePerUserMonthly: 7,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
    description: 'Essential time tracking and timesheet approvals for lightweight teams.',
    features: [
      'Automatic & Manual Time Tracking',
      'Timesheet Approvals & Submissions',
      'Basic Activity & Project Reports',
      'Up to 10 team members',
      'Web & Mobile access',
    ],
  },
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard Plan',
    pricePerUserMonthly: 10,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STANDARD || 'price_standard_monthly',
    description: 'Comprehensive employee monitoring with screenshots and stealth tracking.',
    features: [
      'Everything in Starter',
      'Periodic Screenshots (1-10 per 10m)',
      'Apps & URLs Tracking with Categories',
      'Mouse & Keystroke Activity Score (0-100%)',
      'Stealth Mode & Mouse Jiggler Detection',
      'Idle Time Detection & Prompting',
    ],
  },
  ELITE: {
    id: 'ELITE',
    name: 'Elite Enterprise',
    pricePerUserMonthly: 14,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ELITE || 'price_elite_monthly',
    description: 'Full-suite operational SaaS: Automated Invoicing, Payroll, and Shift Scheduling.',
    features: [
      'Everything in Standard',
      'Automated Client Invoicing Engine',
      'Employee Payroll & Gross Pay Calculator',
      'Shift Scheduling & Attendance Roster',
      'Unlimited Historical Screenshot Storage',
      'Custom IP Whitelisting & SLA Support',
    ],
  },
};
