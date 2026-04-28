import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const event = await req.json()
    const eventType = event.type || event.event_type
    const paymentId = event.data?.payment_id || event.payment_id

    console.log(`[uprails-webhook] Received event: ${eventType}, payment: ${paymentId}`)

    switch (eventType) {
      case 'payment.succeeded':
        console.log(`Payment ${paymentId} succeeded — amount: ${event.data?.amount}`)
        // Future: insert order into Supabase DB, send confirmation email, etc.
        break

      case 'payment.failed':
        console.log(`Payment ${paymentId} failed — reason: ${event.data?.error?.message}`)
        break

      case 'payment.requires_action':
        console.log(`Payment ${paymentId} requires additional action (3DS)`)
        break

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('uprails-webhook error:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
