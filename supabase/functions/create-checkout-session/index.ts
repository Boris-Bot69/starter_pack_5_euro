import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const catalog: Record<string, { name: string; price: number }> = {
  sheets: { name: 'Bettwäsche-Set', price: 8 }, pillow: { name: 'Kopfkissen', price: 4.5 },
  blanket: { name: 'Bettdecke', price: 10 }, towel: { name: 'Handtuch-Set', price: 3 },
  plate: { name: 'Teller & Schüssel', price: 3.5 }, cutlery: { name: 'Besteck-Set', price: 2.5 },
  pot: { name: 'Kochtopf', price: 7 }, pan: { name: 'Bratpfanne', price: 6 }, bottle: { name: 'Wasserflasche', price: 2 },
  hygiene_kit: { name: 'Hygiene-Set', price: 4 }, laundry: { name: 'Waschmittel', price: 2.5 }, cleaning: { name: 'Reinigungsmittel', price: 3 },
  adapter: { name: 'EU-Steckdosenadapter', price: 4 }, bag: { name: 'Einkaufstasche', price: 1 }, transit: { name: 'Nahverkehr-Guide', price: 0 }, vouchers: { name: 'Lokale Studi-Gutscheine', price: 0 },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const { customer, itemIds, discountCode } = body;
    if (!customer?.name || !customer?.email || !customer?.type || !customer?.arrival || !Array.isArray(itemIds) || itemIds.length === 0) {
      return json({ error: 'Ungültige Bestelldaten.' }, 400);
    }

    const items = itemIds.map((id: string) => catalog[id]).filter(Boolean);
    if (items.length !== itemIds.length) return json({ error: 'Unbekannter Artikel.' }, 400);
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
    const discount = discountCode === 'STARTER5' ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
    const total = Math.round((subtotal - discount) * 100) / 100;
    if (total <= 0) return json({ error: 'Kostenlose Bestellungen benötigen keinen Zahlungsabschluss.' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const clientOrderId = `US-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      client_order_id: clientOrderId, name: customer.name, email: customer.email,
      customer_type: customer.type, arrival_date: customer.arrival, address: customer.address || null,
      items: items.map((item, i) => ({ id: itemIds[i], name: item.name, price: item.price })), subtotal, discount, total,
    }).select('id').single();
    if (orderError) throw orderError;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
    const origin = req.headers.get('origin') || 'https://boris-bot69.github.io/starter_pack_5_euro';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: customer.email,
      line_items: [{ price_data: { currency: 'eur', product_data: { name: 'UniStarter Bestellung' }, unit_amount: Math.round(total * 100) }, quantity: 1 }],
      metadata: { order_id: order.id, client_order_id: clientOrderId },
      success_url: `${origin}/?payment=success&order=${clientOrderId}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });
    await supabase.from('orders').update({ stripe_checkout_session_id: session.id }).eq('id', order.id);
    return json({ url: session.url });
  } catch (error) {
    console.error(error);
    return json({ error: 'Zahlung konnte nicht gestartet werden.' }, 500);
  }
});
