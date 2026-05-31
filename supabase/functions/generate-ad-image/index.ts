/**
 * Generates static image ad creatives for a product using Gemini 2.5
 * Flash Image (Nano Banana).
 *
 * Flow:
 *   1. Verify caller is an admin (the function is called via the user's
 *      JWT; we re-derive admin status from app_metadata).
 *   2. Load the product (image_url + copy) from the brand the admin is
 *      operating on.
 *   3. Resolve the hook template + tokens, append any custom prompt the
 *      operator added.
 *   4. Download the product image and base64-encode it as a reference.
 *   5. Call Gemini once per variant (in parallel) — Nano Banana returns
 *      one image per call, so N variants = N calls.
 *   6. Upload each generated PNG to the public ad-creatives bucket under
 *      <brand>/<product_id>/<creative_id>.png.
 *   7. Insert one ad_creatives row per variant.
 *
 * Failure model: any variant that fails is logged and skipped — partial
 * success is fine because the operator can hit "Generate" again to fill
 * the remaining slots. Total failure returns 502.
 *
 * Body: { brand, product_id, hook_id, aspect_ratio, custom_prompt?, variants_n }
 * Returns: { ok, creatives: Creative[], errors?: string[] }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { generateAdCopy } from '../_shared/adCopy.ts'

/* Image generation requires the v1beta endpoint — `responseModalities`
 * is a beta-only generationConfig field and v1 rejects the request as
 * "Unknown name responseModalities" with HTTP 400. */
const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Brand = 'vitalabs' | 'peptiva'
type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

interface RequestBody {
  brand: Brand
  product_id: string
  hook_id: string
  aspect_ratio: AspectRatio
  custom_prompt?: string
  variants_n?: number
  /** Resolved prompt template from the client. Server-side we still
   * re-fill tokens against the canonical product row to stop a malicious
   * client from injecting random tokens. */
  prompt_template: string
}

interface Product {
  id: string
  brand: Brand
  compound: string
  tagline: string | null
  description: string | null
  benefits: string[] | null
  image_url: string | null
}

interface CreatedCreative {
  id: string
  public_url: string
  storage_path: string
  aspect_ratio: AspectRatio
}

const MAX_VARIANTS = 8

const BRAND_NAMES: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'GEMINI_API_KEY not configured' }, 500)
  }

  // Identify the caller via their JWT. We trust the auth header here for
  // the admin gate; service role does the writes once we've checked.
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

  if (!body.brand || !body.product_id) {
    return jsonResponse({ ok: false, error: 'brand and product_id required' }, 400)
  }
  if (!body.prompt_template) {
    return jsonResponse({ ok: false, error: 'prompt_template required' }, 400)
  }

  const variantsN = Math.max(1, Math.min(MAX_VARIANTS, body.variants_n ?? 4))
  const aspect = body.aspect_ratio ?? '1:1'

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Load product so we can fill prompt tokens with real copy and use
  // the product image as a visual reference.
  const { data: product, error: productErr } = await admin
    .from('products')
    .select('id, brand, compound, tagline, description, benefits, image_url')
    .eq('brand', body.brand)
    .eq('id', body.product_id)
    .maybeSingle()
  if (productErr || !product) {
    return jsonResponse({ ok: false, error: 'product not found' }, 404)
  }

  // Try to download the product image as a reference. If it fails we
  // proceed without it — Gemini will still produce something usable from
  // the prompt alone, just less on-brand.
  let referenceImage: { mime: string; base64: string } | null = null
  if (product.image_url) {
    try {
      const imgRes = await fetch(product.image_url)
      if (imgRes.ok) {
        const mime = imgRes.headers.get('content-type') ?? 'image/jpeg'
        const buf = new Uint8Array(await imgRes.arrayBuffer())
        referenceImage = { mime, base64: bytesToBase64(buf) }
      } else {
        console.warn('[generate-ad-image] reference image fetch failed', imgRes.status)
      }
    } catch (err) {
      console.warn('[generate-ad-image] reference image fetch threw', err)
    }
  }

  const filledPrompt = fillPromptTokens({
    template: body.prompt_template,
    product: product as Product,
    brand: body.brand,
    aspect_ratio: aspect,
    extra: body.custom_prompt ?? '',
  })

  // Generate variants in parallel. Each call is independent — failures
  // are caught per-variant so a single bad call doesn't kill the batch.
  const generations = await Promise.allSettled(
    Array.from({ length: variantsN }, (_, idx) =>
      generateSingleVariant({
        apiKey,
        prompt: filledPrompt,
        referenceImage,
        variantIndex: idx,
      }),
    ),
  )

  const created: CreatedCreative[] = []
  const errors: string[] = []

  for (let i = 0; i < generations.length; i++) {
    const result = generations[i]
    if (result.status !== 'fulfilled') {
      errors.push(`variant ${i + 1}: ${String(result.reason)}`)
      continue
    }
    const png = result.value
    if (!png) {
      errors.push(`variant ${i + 1}: gemini returned no image`)
      continue
    }

    // Best-effort Facebook ad copy generation. Run before the row insert
    // so the metadata lands in a single write — copy failures are
    // tolerated (creative still ships, copy can be regenerated later).
    const adCopy = await generateAdCopy(apiKey, {
      brand_name: BRAND_NAMES[body.brand],
      product_name: product.compound,
      product_tagline: product.tagline ?? '',
      primary_benefit: (product.benefits?.[0] ?? product.tagline ?? 'better daily performance'),
      creative_angle: body.hook_id,
      visual_prompt: filledPrompt,
      kind: 'image',
    })

    // Insert the row first so we have a stable id for the storage path,
    // then upload the bytes and patch the row with the public URL.
    const { data: row, error: insertErr } = await admin
      .from('ad_creatives')
      .insert({
        brand: body.brand,
        product_id: body.product_id,
        kind: 'image',
        generator: 'gemini-nano-banana',
        preset: body.hook_id,
        prompt: filledPrompt,
        aspect_ratio: aspect,
        storage_path: '',
        public_url: '',
        status: 'ready',
        metadata: {
          hook_id: body.hook_id,
          variant_index: i,
          ad_copy: adCopy ?? null,
        },
      })
      .select('id')
      .single()
    if (insertErr || !row) {
      errors.push(`variant ${i + 1}: db insert failed (${insertErr?.message})`)
      continue
    }

    const path = `${body.brand}/${body.product_id}/${row.id}.png`
    const { error: uploadErr } = await admin.storage
      .from('ad-creatives')
      .upload(path, png, { contentType: 'image/png', upsert: true })
    if (uploadErr) {
      errors.push(`variant ${i + 1}: upload failed (${uploadErr.message})`)
      await admin.from('ad_creatives').delete().eq('id', row.id)
      continue
    }

    const { data: pub } = admin.storage.from('ad-creatives').getPublicUrl(path)
    const publicUrl = pub?.publicUrl ?? ''

    const { error: patchErr } = await admin
      .from('ad_creatives')
      .update({ storage_path: path, public_url: publicUrl })
      .eq('id', row.id)
    if (patchErr) {
      errors.push(`variant ${i + 1}: db update failed (${patchErr.message})`)
      continue
    }

    created.push({ id: row.id, public_url: publicUrl, storage_path: path, aspect_ratio: aspect })
  }

  if (created.length === 0) {
    return jsonResponse({ ok: false, error: 'all variants failed', details: errors }, 502)
  }

  return jsonResponse({ ok: true, creatives: created, errors: errors.length ? errors : undefined })
})


/** Calls Gemini once and returns the first generated image as a Uint8Array. */
async function generateSingleVariant(opts: {
  apiKey: string
  prompt: string
  referenceImage: { mime: string; base64: string } | null
  variantIndex: number
}): Promise<Uint8Array | null> {
  const parts: Record<string, unknown>[] = []
  if (opts.referenceImage) {
    parts.push({ inline_data: { mime_type: opts.referenceImage.mime, data: opts.referenceImage.base64 } })
  }
  // Slight variation in the seed-hint pushes Gemini to produce a
  // different composition per variant rather than near-duplicates.
  const variantHint = opts.variantIndex === 0
    ? ''
    : `\n\nVariation #${opts.variantIndex + 1}: change composition, light direction, and background tone from the previous variant. Keep the product recognisable.`
  parts.push({ text: opts.prompt + variantHint })

  const res = await fetch(`${GEMINI_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      // The image preview models ignore some safetySettings but harmless to include.
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`gemini ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  const candidates = json?.candidates as Array<{ content?: { parts?: Array<Record<string, unknown>> } }> | undefined
  const firstParts = candidates?.[0]?.content?.parts ?? []
  for (const p of firstParts) {
    const inlineSnake = p['inline_data'] as { data?: string; mime_type?: string } | undefined
    const inlineCamel = p['inlineData'] as { data?: string; mimeType?: string } | undefined
    const inline = inlineSnake ?? inlineCamel
    if (inline?.data) return base64ToBytes(inline.data)
  }
  return null
}


interface FillOpts {
  template: string
  product: Product
  brand: Brand
  aspect_ratio: AspectRatio
  extra: string
}

/** Replaces {{token}} placeholders + appends a styling footer that tells
 *  Gemini what aspect ratio and brand voice to compose for. */
function fillPromptTokens(opts: FillOpts): string {
  const benefits = opts.product.benefits ?? []
  const primaryBenefit = benefits[0] ?? opts.product.tagline ?? 'better daily performance'
  const tokens: Record<string, string> = {
    product_name: opts.product.compound,
    product_tagline: opts.product.tagline ?? '',
    primary_benefit: primaryBenefit,
    brand_name: BRAND_NAMES[opts.brand],
    testimonial_quote: 'I noticed the difference within a fortnight.',
    testimonial_author: 'Verified UK customer',
    problem_question: `Tired of ${primaryBenefit.toLowerCase()} feeling out of reach?`,
  }
  let prompt = opts.template
  for (const [key, value] of Object.entries(tokens)) {
    prompt = prompt.replaceAll(`{{${key}}}`, value)
  }
  const extra = opts.extra.trim() ? `\n\nAdditional direction from the brand operator: ${opts.extra.trim()}` : ''
  const footer = `\n\nCompose for a ${opts.aspect_ratio} aspect ratio. Photo-real, premium UK wellness brand aesthetic. Avoid any explicit medical claims. Do not show needles or syringes. The product label should remain readable.`
  return `${prompt}${extra}${footer}`
}


/** Browser-style btoa is available in Deno, but we need a chunked
 *  variant that handles binary buffers > 64KB without exhausting
 *  String.fromCharCode argument limits. */
function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}
