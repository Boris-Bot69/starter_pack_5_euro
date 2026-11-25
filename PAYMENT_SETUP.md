# Stripe + Supabase Einrichtung

## 1. Supabase-Datenbank

Den Inhalt von `supabase/schema.sql` im Supabase SQL Editor ausführen.

## 2. Supabase CLI und Secrets

Im Projektverzeichnis:

```text
supabase login
supabase link --project-ref clymzwmrbopzinkslfdu
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`SUPABASE_SERVICE_ROLE_KEY` ist in Supabase Edge Functions normalerweise bereits als internes Secret verfügbar. Falls nicht, im Dashboard unter Edge Functions/Secrets ergänzen. Dieser Schlüssel darf niemals in `supabase-config.js` oder GitHub landen.

## 3. Stripe Webhook

In Stripe einen Webhook anlegen:

`https://clymzwmrbopzinkslfdu.supabase.co/functions/v1/stripe-webhook`

Mindestens diese Ereignisse auswählen:

- `checkout.session.completed`
- `checkout.session.expired`

Das angezeigte Webhook Secret als `STRIPE_WEBHOOK_SECRET` hinterlegen. Für den Testbetrieb `sk_test_...` verwenden; vor dem Livegang auf Live-Schlüssel wechseln.

## 4. Frontend

In `supabase-config.js` den öffentlichen Supabase-Anon-Key eintragen. Der Anon-Key darf im Frontend stehen; Service-Role- und Stripe-Secret-Keys dürfen dort nicht stehen.

Danach `index.html`, `en.html` und `supabase-config.js` zu GitHub Pages pushen. Eine Zahlung wird erst nach dem Stripe-Webhook als `paid` gespeichert.
