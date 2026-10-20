import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { createClient } from '@supabase/supabase-js';

// Service role client to bypass RLS during webhook execution
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In development / testing without secret
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // 1. Initial checkout completed
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.organization_id;
        const plan = session.metadata?.plan || 'STANDARD';
        const seatsAllocated = parseInt(session.metadata?.seats_allocated || '5', 10);
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (orgId) {
          await supabaseAdmin
            .from('organizations')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'ACTIVE',
              plan: plan,
              seats_allocated: seatsAllocated,
            })
            .eq('id', orgId);
        }
        break;
      }

      // 2. Subscription status or plan updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status.toUpperCase();
        const seats = subscription.items?.data[0]?.quantity || 5;

        let mappedStatus: string;
        switch (status) {
          case 'ACTIVE':
            mappedStatus = 'ACTIVE';
            break;
          case 'TRIALING':
            mappedStatus = 'TRIALING';
            break;
          case 'PAST_DUE':
            mappedStatus = 'PAST_DUE';
            break;
          case 'CANCELED':
          case 'UNPAID':
            mappedStatus = 'CANCELED';
            break;
          default:
            mappedStatus = 'ACTIVE';
        }

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: mappedStatus,
            seats_allocated: seats,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 3. Subscription deleted / canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'CANCELED',
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 4. Recurring invoice payment successful
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'ACTIVE',
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Stripe webhook:', error);
    return new NextResponse('Webhook handler error', { status: 500 });
  }
}
