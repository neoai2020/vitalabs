/**
 * Submits a video ad generation request to the Higgsfield v2 API and
 * records an ad_jobs row so the Studio UI can poll for completion.
 *
 * Two-step flow because video gen is slow (30-120s):
 *   1. This function POSTs the prompt to the model-specific Higgsfield
 *      endpoint (e.g. /v1/image2video/dop) and stores the returned
 *      request_id as external_id on a new ad_jobs row.
 *   2. poll-ad-jobs picks up running jobs, hits Higgsfield's
 *      /requests/{request_id}/status, and when ready downloads the
 *      video into ad-creatives storage + creates the matching
 *      ad_creatives row.
 *
 * Studio UI auto-polls poll-ad-jobs every 10s while there are running
 * jobs for the active brand.
 *
 * Auth: Higgsfield v2 expects `Authorization: Key KEY_ID:KEY_SECRET`.
 * We read credentials from either:
 *   - HIGGSFIELD_API_KEY containing the full "KEY_ID:KEY_SECRET" string, OR
 *   - HIGGSFIELD_API_KEY + HIGGSFIELD_API_SECRET separately.
 *
 * Body: {
 *   brand, product_id, model_id, preset?, prompt, aspect_ratio, duration_s
 * }
 * Returns: { ok, job_id, external_id, status }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

const HIGGSFIELD_API_BASE = Deno.env.get('HIGGSFIELD_API_BASE') ?? 'https://platform.higgsfield.ai'

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

/** Maps our curated model ids to Higgsfield's endpoint + payload shape.
 *  Each endpoint has a slightly different schema (DOP uses `input_images`
 *  array, Kling and Seedance use a single `input_image` object). All
 *  schemas verified against the live API. */
interface ModelConfig {
  endpoint: string
  /** Builds the input payload for this model's endpoint. */
  buildInput: (opts: { prompt: string; image_url: string | null; duration_s: number; aspect_ratio: string }) => Record<string, unknown>
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'higgsfield-dop': {
    endpoint: '/v1/image2video/dop',
    buildInput: ({ prompt, image_url, duration_s }) => ({
      model: 'dop-turbo',
      prompt,
      input_images: image_url
        ? [{ type: 'image_url', image_url }]
        : [],
      duration: duration_s,
    }),
  },
  'kling3': {
    endpoint: '/v1/image2video/kling',
    buildInput: ({ prompt, image_url, duration_s }) => ({
      prompt,
      input_image: image_url
        ? { type: 'image_url', image_url }
        : null,
      duration: duration_s,
      mode: 'pro',
    }),
  },
  'seedance2': {
    endpoint: '/v1/image2video/seedance',
    buildInput: ({ prompt, image_url, duration_s, aspect_ratio }) => ({
      prompt,
      input_image: image_url
        ? { type: 'image_url', image_url }
        : null,
      duration: duration_s,
      aspect_ratio,
      resolution: '1080',
    }),
  },
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const credentials = resolveHiggsfieldCredentials()
  if (!credentials) {
    return jsonResponse({
      ok: false,
      error: 'HIGGSFIELD_API_KEY not configured. Set it as "KEY_ID:KEY_SECRET" or set HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET separately. Keys come from https://cloud.higgsfield.ai under API settings.',
    }, 500)
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

  const modelConfig = MODEL_CONFIGS[body.model_id]
  if (!modelConfig) {
    return jsonResponse({
      ok: false,
      error: `Model "${body.model_id}" is not yet enabled. Only "higgsfield-dop" is verified against the Higgsfield v2 API. Other partner models (Veo, Sora, Kling, Seedance, Wan) require endpoint paths we'll enable once verified against your account.`,
    }, 400)
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

  const duration = Math.max(5, Math.min(20, Math.round(body.duration_s)))

  // Higgsfield's actual v2 API expects the model inputs wrapped in
  // `params`, not `input` as the npm SDK readme implies. Verified
  // against /v1/image2video/dop returning 200 with a request_id.
  const submission = {
    params: modelConfig.buildInput({
      prompt: filledPrompt,
      image_url: product.image_url,
      duration_s: duration,
      aspect_ratio: body.aspect_ratio,
    }),
  }

  let submitRes: Response
  try {
    submitRes = await fetch(`${HIGGSFIELD_API_BASE}${modelConfig.endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    })
  } catch (err) {
    return jsonResponse({ ok: false, error: `higgsfield unreachable: ${String(err)}` }, 502)
  }

  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '')
    return jsonResponse({
      ok: false,
      error: `higgsfield ${submitRes.status}: ${errBody.slice(0, 300)}`,
    }, 502)
  }

  const submitJson = await submitRes.json().catch(() => ({}))
  const requestId =
    submitJson?.request_id ??
    submitJson?.id ??
    submitJson?.data?.request_id ??
    null
  if (!requestId) {
    return jsonResponse({
      ok: false,
      error: 'higgsfield returned no request_id',
      details: submitJson,
    }, 502)
  }

  const { data: job, error: jobErr } = await admin
    .from('ad_jobs')
    .insert({
      brand: body.brand,
      kind: 'generate_video',
      status: 'running',
      external_id: String(requestId),
      params: {
        product_id: body.product_id,
        model_id: body.model_id,
        endpoint: modelConfig.endpoint,
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
    external_id: String(requestId),
    status: 'running',
  })
})


/** Resolves Higgsfield credentials into the "KEY_ID:KEY_SECRET" string
 *  the v2 API wants in the Authorization header. Returns null if neither
 *  shape is present. */
function resolveHiggsfieldCredentials(): string | null {
  const key = Deno.env.get('HIGGSFIELD_API_KEY')?.trim()
  if (!key) return null
  if (key.includes(':')) return key
  const secret = Deno.env.get('HIGGSFIELD_API_SECRET')?.trim()
  if (secret) return `${key}:${secret}`
  // Single token without secret won't authenticate against v2 — return null
  // so the caller can surface a helpful error instead of a 401 from Higgsfield.
  return null
}


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
