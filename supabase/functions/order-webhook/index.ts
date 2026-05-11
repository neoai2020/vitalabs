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

  const zapierUrl = Deno.env.get('ZAPIER_WEBHOOK_URL')
  if (!zapierUrl) {
    console.error('[order-webhook] ZAPIER_WEBHOOK_URL secret is not set')
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()

    const items = body.items ?? []
    const productNames = items.map((i: { sku?: string; compound?: string }) =>
      [i.sku, i.compound].filter(Boolean).join(' — ')
    )
    const totalPence = body.amount ?? 0
    const totalGBP = (totalPence / 100).toFixed(2)
    const aov = items.length > 0
      ? (totalPence / 100 / items.length).toFixed(2)
      : totalGBP

    const payload = {
      name: body.customerName ?? '',
      email: body.customerEmail ?? '',
      phone: body.customerPhone ?? '',
      shipping_address1: body.shippingAddress?.address1 ?? '',
      shipping_address2: body.shippingAddress?.address2 ?? '',
      shipping_city: body.shippingAddress?.city ?? '',
      shipping_county: body.shippingAddress?.county ?? '',
      shipping_postcode: body.shippingAddress?.postcode ?? '',
      shipping_country: body.shippingAddress?.country ?? '',
      products: productNames.join(' | '),
      order_total: `£${totalGBP}`,
      aov: `£${aov}`,
      item_count: items.length,
      order_date: new Date().toISOString(),
    }

    console.log('[order-webhook] Sending to Zapier:', JSON.stringify(payload))

    const zapierRes = await fetch(zapierUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!zapierRes.ok) {
      const errText = await zapierRes.text()
      console.error(`[order-webhook] Zapier returned ${zapierRes.status}: ${errText}`)
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[order-webhook] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
