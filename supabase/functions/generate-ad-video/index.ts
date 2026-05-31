/**
 * Submits a video ad generation request to the Higgsfield v2 API and
 * records an ad_jobs row so the Studio UI can poll for completion.
 *
 * Two-step flow because video gen is slow (30-120s):
 *   1. This function builds the prompt server-side from {ad_type, config},
 *      POSTs to the model-specific Higgsfield endpoint (e.g.
 *      /v1/image2video/dop) and stores the returned request_id as
 *      external_id on a new ad_jobs row.
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
 * Body: { brand, product_id, ad_type, config, aspect_ratio, duration_s }
 * Returns: { ok, job_id, external_id, status }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import {
  buildAdPrompt,
  getAdTypeEntry,
  type AdTypeConfig,
  type Brand,
  type ProductContext,
} from '../_shared/adTypes.ts'

const HIGGSFIELD_API_BASE = Deno.env.get('HIGGSFIELD_API_BASE') ?? 'https://platform.higgsfield.ai'

interface RequestBody {
  brand: Brand
  product_id: string
  ad_type: string
  config: AdTypeConfig
  aspect_ratio: '1:1' | '9:16' | '16:9' | '4:5'
  duration_s?: number
}

/** Maps our internal video-model ids to Higgsfield's endpoint + payload
 *  shape. Each endpoint has a slightly different schema (DOP uses
 *  `input_images` array, Kling and Seedance use a single `input_image`
 *  object). All schemas verified against the live API. */
interface ModelConfig {
  endpoint: string
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
      error: 'Video engine credentials not configured. Contact the platform admin.',
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

  if (!body.brand || !body.product_id || !body.ad_type) {
    return jsonResponse({ ok: false, error: 'brand, product_id, and ad_type are required' }, 400)
  }

  const adTypeEntry = getAdTypeEntry(body.ad_type)
  if (!adTypeEntry || adTypeEntry.kind !== 'video') {
    return jsonResponse({ ok: false, error: `ad_type "${body.ad_type}" is not a valid video type` }, 400)
  }

  const modelConfig = MODEL_CONFIGS[adTypeEntry.model]
  if (!modelConfig) {
    return jsonResponse({
      ok: false,
      error: `Internal: no engine config for "${adTypeEntry.model}"`,
    }, 500)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: product } = await admin
    .from('products')
    .select('id, brand, compound, tagline, description, benefits, image_url')
    .eq('brand', body.brand)
    .eq('id', body.product_id)
    .maybeSingle()
  if (!product) return jsonResponse({ ok: false, error: 'product not found' }, 404)

  const productCtx: ProductContext = {
    compound: product.compound,
    tagline: product.tagline,
    description: product.description,
    benefits: product.benefits,
    image_url: product.image_url,
  }

  const built = buildAdPrompt(body.ad_type, body.config ?? {}, productCtx, body.brand)
  if (!built) {
    return jsonResponse({ ok: false, error: 'failed to build prompt' }, 500)
  }

  const duration = Math.max(5, Math.min(20, Math.round(body.duration_s ?? adTypeEntry.defaultDuration ?? 5)))
  const aspect = body.aspect_ratio ?? adTypeEntry.defaultAspect

  // Higgsfield's actual v2 API expects the model inputs wrapped in
  // `params`, not `input` as the npm SDK readme implies. Verified
  // against /v1/image2video/dop returning 200 with a request_id.
  const submission = {
    params: modelConfig.buildInput({
      prompt: built.prompt,
      image_url: product.image_url,
      duration_s: duration,
      aspect_ratio: aspect,
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
    return jsonResponse({ ok: false, error: `video engine unreachable: ${String(err)}` }, 502)
  }

  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '')
    return jsonResponse({
      ok: false,
      error: `video engine ${submitRes.status}: ${errBody.slice(0, 300)}`,
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
      error: 'video engine returned no request_id',
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
        ad_type: body.ad_type,
        config: body.config ?? {},
        model_id: adTypeEntry.model,
        endpoint: modelConfig.endpoint,
        prompt: built.prompt,
        angle: built.angle,
        aspect_ratio: aspect,
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
  return null
}
