import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPI_API_URL = 'https://api.vapi.ai/call/phone'

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const apiKey = Deno.env.get('VAPI_API_KEY')
  const assistantId = Deno.env.get('VAPI_ASSISTANT_ID')
  const phoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID')

  if (!apiKey || !assistantId || !phoneNumberId) {
    return new Response(JSON.stringify({ error: 'VAPI not configured' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: calls, error: fetchError } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('status', 'pending')
    .lte('call_at', new Date().toISOString())
    .limit(10)

  if (fetchError) {
    console.error('[process-calls] Fetch error:', fetchError)
    return new Response(JSON.stringify({ error: 'DB fetch failed' }), { status: 500 })
  }

  if (!calls || calls.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  let processed = 0

  for (const call of calls) {
    try {
      await supabase
        .from('scheduled_calls')
        .update({ status: 'processing' })
        .eq('id', call.id)

      const res = await fetch(VAPI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId,
          phoneNumberId,
          customer: {
            number: call.phone,
            name: call.first_name || '',
          },
          assistantOverrides: {
            variableValues: call.variable_values || {},
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        await supabase
          .from('scheduled_calls')
          .update({ status: 'completed', vapi_call_id: data.id })
          .eq('id', call.id)
        console.log(`[process-calls] Call ${call.id} → VAPI ${data.id}`)
        processed++
      } else {
        const text = await res.text()
        console.error(`[process-calls] Call ${call.id} failed:`, res.status, text)
        await supabase
          .from('scheduled_calls')
          .update({ status: 'failed', error_message: `${res.status}: ${text}` })
          .eq('id', call.id)
      }
    } catch (err) {
      console.error(`[process-calls] Call ${call.id} error:`, err)
      await supabase
        .from('scheduled_calls')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', call.id)
    }
  }

  return new Response(
    JSON.stringify({ processed, total: calls.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
