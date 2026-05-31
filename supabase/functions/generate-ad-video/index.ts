/**
 * Submits a video ad generation request to the Higgsfield API and
 * records an ad_jobs row so the Studio UI can poll for completion.
 *
 * Two-step flow because video gen is slow (30-120s):
 *   1. This function POSTs the prompt to Higgsfield and stores the
 *      generation_id as external_id on a new ad_jobs row.
 *   2. poll-ad-jobs picks up running jobs, asks Higgsfield for status,
 *      and when ready downloads the video into ad-creatives storage
 *      + creates the matching ad_creatives row.
 *
 * Studio UI auto-polls poll-ad-jobs every 10s while there are running
 * jobs for the active brand.
 *
 * Body: {
 *   brand, product_id, model_id, preset?, prompt, aspect_ratio, duration_s
 * }
 * Returns: { ok, job_id, external_id, status }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

const HIGGSFIELD_API_BASE = Deno.env.get('HIGGSFIELD_API_BASE') ?? 'https://api.higgsfield.ai'

type Brand = 'vitalabs' | 'peptiva'

interface RequestBody {
  brand: Brand
  product_id: string
  model_id: string
  preset?: string
  prompt: string
  aspect_ratio: '1:1' | '9:16' | '16:9' | '4:5'
  duration_s: number
}

const BRAND_NAMES: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}

/** Maps our curated model ids to Higgsfield's provider model strings.
 *  Centralised so we can adjust without touching the UI. */
const PROVIDER_MODEL_MAP: Record<string, string> = {
  veo3: 'veo-3',
  'sora2-video': 'sora-2',
  kling3: 'kling-3',
  seedance2: 'seedance-2',
  'wan2-6': 'wan-2.6',
  'higgsfield-dop': 'higgsfield-dop',
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('HIGGSFIELD_API_KEY')
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'HIGGSFIELD_API_KEY not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ ok: false, error: 'unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )
  const { data: userRes } = await userClient.auth.getUser()
  const user = userRes?.user
  const isAdmin = !!user && Boolean(user.app_metadata?.is_admin)
  if (!isAdmin) return jsonResponse({ ok: false, error: 'forbidden' }, 403)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'invalid json' }, 400)
  }

  if (!body.brand || !body.product_id || !body.prompt || !body.model_id) {
    return jsonResponse({ ok: false, error: 'brand, product_id, model_id, and prompt are required' }, 400)
  }

  const providerModel = PROVIDER_MODEL_MAP[body.model_id]
  if (!providerModel) {
    return jsonResponse({ ok: false, error: `unsupported model_id: ${body.model_id}` }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Pull the product so we can pass image_url to Higgsfield (image-to-video
  // mode) and fill prompt tokens with real copy.
  const { data: product } = await admin
    .from('products')
    .select('id, brand, compound, tagline, benefits, image_url')
    .eq('brand', body.brand)
    .eq('id', body.product_id)
    .maybeSingle()
  if (!product) return jsonResponse({ ok: false, error: 'product not found' }, 404)

  const filledPrompt = fillPromptTokens({
    template: body.prompt,
    product,
    brand: body.brand,
  })

  // Resolution + duration must align with what the chosen model supports —
  // we validated the duration in the Studio UI but enforce ceiling here too.
  const resolution = body.aspect_ratio === '9:16' ? '720p' : '1080p'
  const duration = Math.max(5, Math.min(20, Math.round(body.duration_s)))

  const submission: Record<string, unknown> = {
    model: providerModel,
    prompt: filledPrompt,
    duration,
    resolution,
    aspect_ratio: body.aspect_ratio,
  }
  if (product.image_url) {
    submission.image_url = product.image_url
  }

  let submitRes: Response
  try {
    submitRes = await fetch(`${HIGGSFIELD_API_BASE}/v1/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    })
  } catch (err) {
    return jsonResponse({ ok: false, error: `higgsfield unreachable: ${String(err)}` }, 502)
  }

  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '')
    return jsonResponse({ ok: false, error: `higgsfield ${submitRes.status}: ${errBody.slice(0, 300)}` }, 502)
  }

  const submitJson = await submitRes.json().catch(() => ({}))
  const generationId =
    submitJson?.generation_id ??
    submitJson?.id ??
    submitJson?.data?.task_id ??
    null
  if (!generationId) {
    return jsonResponse({ ok: false, error: 'higgsfield returned no generation id', details: submitJson }, 502)
  }

  const { data: job, error: jobErr } = await admin
    .from('ad_jobs')
    .insert({
      brand: body.brand,
      kind: 'generate_video',
      status: 'running',
      external_id: String(generationId),
      params: {
        product_id: body.product_id,
        model_id: body.model_id,
        provider_model: providerModel,
        preset: body.preset ?? null,
        prompt: filledPrompt,
        aspect_ratio: body.aspect_ratio,
        duration_s: duration,
      },
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    return jsonResponse({ ok: false, error: `failed to record job: ${jobErr?.message}` }, 500)
  }

  return jsonResponse({
    ok: true,
    job_id: job.id,
    external_id: String(generationId),
    status: 'running',
  })
})


function fillPromptTokens(opts: {
  template: string
  product: { compound: string; tagline: string | null; benefits: string[] | null }
  brand: Brand
}): string {
  const benefits = opts.product.benefits ?? []
  const primaryBenefit = benefits[0] ?? opts.product.tagline ?? 'better daily performance'
  const tokens: Record<string, string> = {
    product_name: opts.product.compound,
    product_tagline: opts.product.tagline ?? '',
    primary_benefit: primaryBenefit,
    brand_name: BRAND_NAMES[opts.brand],
  }
  let prompt = opts.template
  for (const [k, v] of Object.entries(tokens)) {
    prompt = prompt.replaceAll(`{{${k}}}`, v)
  }
  return prompt
}
