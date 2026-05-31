/**
 * Polls Higgsfield for all currently-running ad_jobs for a brand and
 * finalises any that have completed (downloads the video, writes to
 * storage, creates the ad_creatives row, marks the job done).
 *
 * Called every ~10s from the Studio UI while there's at least one
 * running job for the active brand. Idempotent: re-running for an
 * already-completed job is a no-op.
 *
 * Body: { brand }
 * Returns: { ok, polled, done, failed, still_running, jobs: JobStatus[] }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { generateAdCopy } from '../_shared/adCopy.ts'

const HIGGSFIELD_API_BASE = Deno.env.get('HIGGSFIELD_API_BASE') ?? 'https://platform.higgsfield.ai'

type Brand = 'vitalabs' | 'peptiva'

const BRAND_NAMES: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}


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

interface JobStatus {
  job_id: string
  external_id: string | null
  status: 'queued' | 'running' | 'done' | 'failed'
  creative_id?: string
  error?: string
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

  let body: { brand: Brand }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'invalid json' }, 400)
  }
  if (!body.brand) return jsonResponse({ ok: false, error: 'brand required' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: jobs, error: jobsErr } = await admin
    .from('ad_jobs')
    .select('id, brand, kind, status, external_id, params')
    .eq('brand', body.brand)
    .eq('kind', 'generate_video')
    .eq('status', 'running')
    .order('created_at', { ascending: true })

  if (jobsErr) return jsonResponse({ ok: false, error: jobsErr.message }, 500)

  const results: JobStatus[] = []
  let done = 0
  let failed = 0
  let stillRunning = 0

  for (const job of jobs ?? []) {
    if (!job.external_id) {
      // No external id means the submission never landed. Mark failed.
      await admin
        .from('ad_jobs')
        .update({ status: 'failed', error: 'missing external_id', completed_at: new Date().toISOString() })
        .eq('id', job.id)
      failed += 1
      results.push({ job_id: job.id, external_id: null, status: 'failed', error: 'missing external_id' })
      continue
    }

    try {
      const status = await fetchProviderStatus(job.external_id, credentials)

      if (status.terminal === 'done' && status.video_url) {
        const creativeId = await finaliseSuccess({
          admin,
          job,
          videoUrl: status.video_url,
          previewUrl: status.preview_url ?? null,
        })
        if (creativeId) {
          done += 1
          results.push({ job_id: job.id, external_id: job.external_id, status: 'done', creative_id: creativeId })
        } else {
          failed += 1
          results.push({ job_id: job.id, external_id: job.external_id, status: 'failed', error: 'finalisation failed' })
        }
      } else if (status.terminal === 'failed') {
        await admin
          .from('ad_jobs')
          .update({
            status: 'failed',
            error: status.error ?? 'provider reported failure',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        failed += 1
        results.push({ job_id: job.id, external_id: job.external_id, status: 'failed', error: status.error })
      } else {
        stillRunning += 1
        results.push({ job_id: job.id, external_id: job.external_id, status: 'running' })
      }
    } catch (err) {
      // Don't mark the job failed on a single transient status fetch failure —
      // the next poll will retry. Just log and report still_running.
      console.warn('[poll-ad-jobs] status fetch failed', job.id, err)
      stillRunning += 1
      results.push({ job_id: job.id, external_id: job.external_id, status: 'running' })
    }
  }

  return jsonResponse({
    ok: true,
    polled: jobs?.length ?? 0,
    done,
    failed,
    still_running: stillRunning,
    jobs: results,
  })
})


interface ProviderStatus {
  terminal: 'done' | 'failed' | 'pending'
  video_url?: string
  preview_url?: string
  error?: string
}

/** Hits Higgsfield v2's `/requests/{request_id}/status` endpoint and
 *  normalises the response so the caller doesn't have to care about
 *  field naming variations. The v2 completion payload looks like:
 *    { status: 'completed', request_id, images: [{url}], video: {url} } */
async function fetchProviderStatus(externalId: string, credentials: string): Promise<ProviderStatus> {
  const res = await fetch(`${HIGGSFIELD_API_BASE}/requests/${encodeURIComponent(externalId)}/status`, {
    headers: { Authorization: `Key ${credentials}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`status ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json()

  // v2 status values: queued | in_progress | completed | failed | nsfw
  // Also handle a few legacy/synonymous values just in case.
  const raw = String(json?.status ?? '').toLowerCase()
  if (['completed', 'succeeded', 'success', 'done'].includes(raw)) {
    const videoUrl =
      json?.video?.url ??
      json?.result?.video?.url ??
      json?.data?.video?.url ??
      json?.video_url ??
      undefined
    const previewUrl =
      json?.images?.[0]?.url ??
      json?.preview?.url ??
      json?.thumbnail?.url ??
      json?.preview_url ??
      undefined
    return { terminal: 'done', video_url: videoUrl, preview_url: previewUrl }
  }
  if (['failed', 'error', 'nsfw'].includes(raw)) {
    return {
      terminal: 'failed',
      error: raw === 'nsfw'
        ? 'content flagged by Higgsfield moderation (credits refunded)'
        : (json?.error ?? json?.message ?? 'provider reported failure'),
    }
  }
  return { terminal: 'pending' }
}


interface FinaliseOpts {
  admin: ReturnType<typeof createClient>
  job: { id: string; brand: Brand; params: Record<string, unknown> }
  videoUrl: string
  previewUrl: string | null
}

/** Downloads the video, uploads to storage, creates the ad_creatives
 *  row, links the job to it, and marks the job done. Returns the new
 *  creative id on success. */
async function finaliseSuccess(opts: FinaliseOpts): Promise<string | null> {
  const params = opts.job.params as {
    product_id?: string
    model_id?: string
    provider_model?: string
    preset?: string | null
    ad_type?: string
    config?: Record<string, unknown>
    angle?: string
    prompt?: string
    aspect_ratio?: string
    duration_s?: number
  }

  let videoBytes: Uint8Array
  try {
    const r = await fetch(opts.videoUrl)
    if (!r.ok) throw new Error(`download ${r.status}`)
    videoBytes = new Uint8Array(await r.arrayBuffer())
  } catch (err) {
    await opts.admin
      .from('ad_jobs')
      .update({ status: 'failed', error: `video download failed: ${String(err)}`, completed_at: new Date().toISOString() })
      .eq('id', opts.job.id)
    return null
  }

  let thumbnailUrl: string | null = null
  if (opts.previewUrl) {
    try {
      const r = await fetch(opts.previewUrl)
      if (r.ok) {
        const bytes = new Uint8Array(await r.arrayBuffer())
        const thumbPath = `${opts.job.brand}/${params.product_id ?? 'unknown'}/${opts.job.id}-thumb.jpg`
        const { error } = await opts.admin.storage
          .from('ad-creatives')
          .upload(thumbPath, bytes, { contentType: 'image/jpeg', upsert: true })
        if (!error) {
          const { data } = opts.admin.storage.from('ad-creatives').getPublicUrl(thumbPath)
          thumbnailUrl = data?.publicUrl ?? null
        }
      }
    } catch (err) {
      console.warn('[poll-ad-jobs] thumbnail download failed', err)
    }
  }

  // Best-effort Facebook ad copy generation. Pulls product + brand context
  // so the copywriter brief matches the visual prompt the model was given.
  // Failures are swallowed — the creative still ships without copy and
  // the operator can regenerate copy from the library.
  let adCopy: Awaited<ReturnType<typeof generateAdCopy>> = null
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (geminiKey && params.product_id) {
    const { data: product } = await opts.admin
      .from('products')
      .select('compound, tagline, benefits')
      .eq('brand', opts.job.brand)
      .eq('id', params.product_id)
      .maybeSingle() as { data: { compound?: string; tagline?: string | null; benefits?: string[] | null } | null }
    if (product?.compound) {
      adCopy = await generateAdCopy(geminiKey, {
        brand_name: BRAND_NAMES[opts.job.brand],
        product_name: product.compound,
        product_tagline: product.tagline ?? '',
        primary_benefit: product.benefits?.[0] ?? product.tagline ?? 'better daily performance',
        creative_angle: params.angle ?? params.ad_type ?? 'video',
        visual_prompt: params.prompt ?? '',
        kind: 'video',
      })
    }
  }

  const { data: creativeRow, error: insertErr } = await opts.admin
    .from('ad_creatives')
    .insert({
      brand: opts.job.brand,
      product_id: params.product_id ?? null,
      kind: 'video',
      generator: params.model_id ?? 'video-engine',
      preset: params.ad_type ?? params.preset ?? null,
      prompt: params.prompt ?? null,
      aspect_ratio: params.aspect_ratio ?? '9:16',
      duration_s: params.duration_s ?? null,
      storage_path: '',
      public_url: '',
      thumbnail_url: thumbnailUrl,
      status: 'ready',
      metadata: {
        ad_type: params.ad_type ?? null,
        config: params.config ?? {},
        external_id: opts.job.id,
        ad_copy: adCopy ?? null,
      },
    })
    .select('id')
    .single()
  if (insertErr || !creativeRow) {
    await opts.admin
      .from('ad_jobs')
      .update({ status: 'failed', error: `creative insert failed: ${insertErr?.message}`, completed_at: new Date().toISOString() })
      .eq('id', opts.job.id)
    return null
  }

  const path = `${opts.job.brand}/${params.product_id ?? 'unknown'}/${creativeRow.id}.mp4`
  const { error: uploadErr } = await opts.admin.storage
    .from('ad-creatives')
    .upload(path, videoBytes, { contentType: 'video/mp4', upsert: true })
  if (uploadErr) {
    await opts.admin.from('ad_creatives').delete().eq('id', creativeRow.id)
    await opts.admin
      .from('ad_jobs')
      .update({ status: 'failed', error: `video upload failed: ${uploadErr.message}`, completed_at: new Date().toISOString() })
      .eq('id', opts.job.id)
    return null
  }

  const { data: pub } = opts.admin.storage.from('ad-creatives').getPublicUrl(path)
  const publicUrl = pub?.publicUrl ?? ''

  await opts.admin
    .from('ad_creatives')
    .update({ storage_path: path, public_url: publicUrl })
    .eq('id', creativeRow.id)

  await opts.admin
    .from('ad_jobs')
    .update({
      status: 'done',
      creative_id: creativeRow.id,
      result: { creative_id: creativeRow.id, public_url: publicUrl, thumbnail_url: thumbnailUrl },
      completed_at: new Date().toISOString(),
    })
    .eq('id', opts.job.id)

  return creativeRow.id
}
