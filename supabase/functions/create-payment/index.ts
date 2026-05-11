import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const UPRAILS_API_URL = 'https://api.uprails.com/payments'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreatePaymentBody {
  amount: number
  currency: string
  description?: string
  email?: string
  customer_id?: string
  metadata?: Record<string, string>
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
    const apiKey = Deno.env.get('UPRAILS_SECRET_KEY')
    const profileId = Deno.env.get('UPRAILS_PROFILE_ID')

    if (!apiKey || !profileId) {
      throw new Error('Missing UPRAILS_SECRET_KEY or UPRAILS_PROFILE_ID')
    }

    const body: CreatePaymentBody = await req.json()

    if (!body.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uprailsPayload = {
      amount: body.amount,
      currency: body.currency || 'GBP',
      profile_id: profileId,
      confirm: false,
      description: body.description || 'Peptiva order',
      ...(body.email && { email: body.email }),
      ...(body.customer_id && { customer_id: body.customer_id }),
      ...(body.metadata && { metadata: body.metadata }),
    }

    const uprailsRes = await fetch(UPRAILS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(uprailsPayload),
    })

    const data = await uprailsRes.json()

    if (!uprailsRes.ok) {
      console.error('Uprails API error:', data)
      return new Response(JSON.stringify({ error: 'Payment creation failed', details: data }), {
        status: uprailsRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        clientSecret: data.client_secret,
        paymentId: data.payment_id,
        status: data.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('create-payment error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
