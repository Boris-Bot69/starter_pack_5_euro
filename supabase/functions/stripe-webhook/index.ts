import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  try {
    const event = await stripe.webhooks.constructEventAsync(await req.text(), signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const session = event.data.object as Stripe.Checkout.Session;
    if (event.type === 'checkout.session.completed' && session.metadata?.order_id) {
      await supabase.from('orders').update({ status: 'paid', stripe_payment_intent_id: String(session.payment_intent || ''), paid_at: new Date().toISOString() }).eq('id', session.metadata.order_id);
    }
    if (event.type === 'checkout.session.expired' && session.metadata?.order_id) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', session.metadata.order_id);
    }
    return new Response('ok');
  } catch (error) { console.error(error); return new Response('Invalid webhook', { status: 400 }); }
});
