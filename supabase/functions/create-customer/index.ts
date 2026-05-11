import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const UPRAILS_CUSTOMERS_URL = 'https://api.uprails.com/customers'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateCustomerBody {
  email?: string
  name?: string
  phone?: string
  phone_country_code?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    first_name?: string
    last_name?: string
  }
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
    if (!apiKey) {
      throw new Error('Missing UPRAILS_SECRET_KEY')
    }

    const body: CreateCustomerBody = await req.json()

    const uprailsRes = await fetch(UPRAILS_CUSTOMERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    const data = await uprailsRes.json()

    if (!uprailsRes.ok) {
      console.error('Uprails create-customer error:', data)
      return new Response(JSON.stringify({ error: 'Customer creation failed', details: data }), {
        status: uprailsRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ customerId: data.customer_id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('create-customer error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
