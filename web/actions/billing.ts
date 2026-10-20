'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { stripe, SUBSCRIPTION_TIERS } from '@/utils/stripe';

export interface BillingActionResult {
  error?: string;
  url?: string;
  success?: boolean;
}

/**
 * Creates a Stripe Checkout Session for upgrading or subscribing to a plan.
 */
export async function createCheckoutSession(
  tierId: 'STARTER' | 'STANDARD' | 'ELITE',
  seatsCount: number
): Promise<BillingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to manage billing.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization selected.' };
  }

  // 1. Fetch organization details
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, owner_id, stripe_customer_id, plan')
    .eq('id', activeOrgId)
    .single();

  if (orgErr || !org) {
    return { error: 'Organization not found.' };
  }

  // Verify caller is the owner
  if (org.owner_id !== user.id) {
    return { error: 'Only the Organization Owner can modify billing and subscription plans.' };
  }

  const tier = SUBSCRIPTION_TIERS[tierId];
  if (!tier) {
    return { error: 'Invalid subscription tier selected.' };
  }

  const validSeats = Math.max(1, seatsCount);

  try {
    let customerId = org.stripe_customer_id;

    // Create Stripe Customer if one does not exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organization_id: org.id,
          owner_user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: tier.pricePerUserMonthly * 100, // in cents
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `Apploye ${tier.name}`,
              description: `${tier.description} ($${tier.pricePerUserMonthly}/seat/month)`,
            },
          },
          quantity: validSeats,
        },
      ],
      metadata: {
        organization_id: org.id,
        plan: tierId,
        seats_allocated: String(validSeats),
      },
      subscription_data: {
        metadata: {
          organization_id: org.id,
          plan: tierId,
          seats_allocated: String(validSeats),
        },
      },
      success_url: `${appUrl}/dashboard/admin/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/dashboard/admin/billing?canceled=true`,
    });

    return { url: session.url || undefined };
  } catch (err: any) {
    console.error('Stripe Checkout Session error:', err);
    return { error: err.message || 'Failed to initialize Stripe checkout.' };
  }
}

/**
 * Creates a Stripe Customer Portal Session for managing payment methods and viewing invoices.
 */
export async function createCustomerPortalSession(): Promise<BillingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', activeOrgId)
    .single();

  if (!org?.stripe_customer_id) {
    return { error: 'No active Stripe billing profile found. Please subscribe to a plan first.' };
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/dashboard/admin/billing`,
    });

    return { url: portalSession.url };
  } catch (err: any) {
    console.error('Stripe Customer Portal error:', err);
    return { error: err.message || 'Failed to create customer portal session.' };
  }
}

/**
 * Adjusts the seat allocation count for an active subscription.
 */
export async function updateSubscriptionSeats(newSeatCount: number): Promise<BillingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, stripe_subscription_id, seats_allocated, owner_id')
    .eq('id', activeOrgId)
    .single();

  if (!org || org.owner_id !== user.id) {
    return { error: 'Forbidden. Owner permissions required.' };
  }

  const validSeats = Math.max(1, newSeatCount);

  if (org.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
      const itemId = sub.items.data[0]?.id;

      if (itemId) {
        await stripe.subscriptions.update(org.stripe_subscription_id, {
          items: [
            {
              id: itemId,
              quantity: validSeats,
            },
          ],
          proration_behavior: 'create_prorations',
        });
      }
    } catch (err: any) {
      return { error: `Failed to update Stripe seat quantity: ${err.message}` };
    }
  }

  // Update in DB
  const { error } = await supabase
    .from('organizations')
    .update({ seats_allocated: validSeats })
    .eq('id', org.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/billing');
  return { success: true };
}
