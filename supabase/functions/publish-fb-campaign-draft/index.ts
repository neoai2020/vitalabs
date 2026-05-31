/**
 * Pushes a campaign + ad sets + ads to Meta as a PAUSED draft.
 *
 * The Studio surface never launches campaigns — we only ever create
 * paused objects on Meta. The operator goes to Ads Manager to flip them
 * live. This is the right product call because (a) it removes the
 * "oops I just spent the daily budget" footgun and (b) it lets the
 * operator review the AI-generated creatives in Meta's own preview
 * before money moves.
 *
 * Flow per request (a single campaign):
 *   1. Verify admin via JWT.
 *   2. Read brand-scoped meta_ads config (ad_account_id, page_id,
 *      optional instagram_actor_id).
 *   3. POST /act_<id>/campaigns → fb_campaign_id.
 *   4. For each ad set:
 *      a. For each video creative: POST /act_<id>/advideos with the
 *         file_url so Meta ingests it and returns a video_id.
 *      b. POST /act_<id>/adsets → fb_adset_id.
 *      c. For each creative on this ad set:
 *         - POST /act_<id>/adcreatives with object_story_spec
 *           (link_data for images, video_data for videos).
 *         - POST /act_<id>/ads referencing the ad set + creative.
 *   5. Persist ad_campaigns + ad_sets rows (or update if id passed).
 *
 * If any step fails after the campaign was created, we still persist
 * the campaign with `last_sync_error` so the operator can see what
 * went wrong and decide whether to archive or fix and re-sync.
 *
 * Body: { brand, campaign: CampaignInput, ad_sets: AdSetInput[] }
 * Returns: { ok, campaign: { id, fb_campaign_id, ads_manager_url }, ad_sets: ... }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

const META_API_VERSION = Deno.env.get('META_API_VERSION') ?? 'v21.0'
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

type Brand = 'vitalabs' | 'peptiva'

interface CampaignInput {
  name: string
  objective: string
  daily_budget_pence: number
  start_at?: string | null
  end_at?: string | null
}

interface AdSetInput {
  name: string
  creative_ids: string[]
  daily_budget_pence?: number | null
  optimisation_goal?: string
  bid_strategy?: string
  targeting?: {
    countries?: string[]
    age_min?: number
    age_max?: number
    genders?: number[]
    interests?: { id: string; name: string }[]
  }
}

interface RequestBody {
  brand: Brand
  campaign: CampaignInput
  ad_sets: AdSetInput[]
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const token = Deno.env.get('META_SYSTEM_USER_TOKEN')
  if (!token) {
    return jsonResponse({ ok: false, error: 'META_SYSTEM_USER_TOKEN not configured' }, 500)
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

  if (!body.brand || !body.campaign?.name) {
    return jsonResponse({ ok: false, error: 'brand and campaign.name required' }, 400)
  }
  if (!body.ad_sets?.length) {
    return jsonResponse({ ok: false, error: 'at least one ad_set required' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Load brand meta_ads config — the ad account id is the destination
  // for every Meta API call we make below.
  const { data: cfgRow, error: cfgErr } = await admin
    .from('site_config')
    .select('value')
    .eq('brand', body.brand)
    .eq('key', 'meta_ads')
    .maybeSingle()
  if (cfgErr) return jsonResponse({ ok: false, error: `config lookup failed: ${cfgErr.message}` }, 500)
  const cfg = (cfgRow?.value ?? {}) as { ad_account_id?: string; page_id?: string; instagram_actor_id?: string }
  if (!cfg.ad_account_id || !cfg.page_id) {
    return jsonResponse({
      ok: false,
      error: 'meta_ads config missing — set ad_account_id and page_id in Site config → Meta Ads.',
    }, 400)
  }

  const adAccount = cfg.ad_account_id.startsWith('act_') ? cfg.ad_account_id : `act_${cfg.ad_account_id}`

  // Resolve creative IDs to their underlying ad_creatives rows. We need
  // public_url + kind + storage_path to build object_story_spec.
  const allCreativeIds = [...new Set(body.ad_sets.flatMap(a => a.creative_ids))]
  if (allCreativeIds.length === 0) {
    return jsonResponse({ ok: false, error: 'no creatives selected' }, 400)
  }
  const { data: creatives, error: creativesErr } = await admin
    .from('ad_creatives')
    .select('id, brand, kind, public_url, prompt, aspect_ratio')
    .eq('brand', body.brand)
    .in('id', allCreativeIds)
  if (creativesErr) {
    return jsonResponse({ ok: false, error: `creatives lookup failed: ${creativesErr.message}` }, 500)
  }
  if (!creatives || creatives.length !== allCreativeIds.length) {
    return jsonResponse({ ok: false, error: 'one or more creatives missing or wrong brand' }, 400)
  }
  const creativeById = new Map(creatives.map(c => [c.id, c]))

  // Audit log row for the publish job — useful when something goes wrong
  // halfway through and we want to know what state Meta is in.
  const { data: jobRow } = await admin
    .from('ad_jobs')
    .insert({
      brand: body.brand,
      kind: 'publish_draft',
      status: 'running',
      params: { campaign: body.campaign, ad_sets: body.ad_sets },
    })
    .select('id')
    .single()
  const jobId = jobRow?.id ?? null

  const markJobFailed = async (err: string) => {
    if (!jobId) return
    await admin
      .from('ad_jobs')
      .update({ status: 'failed', error: err, completed_at: new Date().toISOString() })
      .eq('id', jobId)
  }

  /* ── Step 1: create the campaign object on Meta ───────────────── */
  let fbCampaignId: string
  try {
    fbCampaignId = await metaCreateCampaign({
      adAccount,
      token,
      name: body.campaign.name,
      objective: body.campaign.objective || 'OUTCOME_SALES',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markJobFailed(message)
    return jsonResponse({ ok: false, error: message }, 502)
  }

  /* ── Persist the campaign row locally now that Meta has accepted ─ */
  const { data: campaignRow, error: campaignErr } = await admin
    .from('ad_campaigns')
    .insert({
      brand: body.brand,
      name: body.campaign.name,
      fb_campaign_id: fbCampaignId,
      objective: body.campaign.objective || 'OUTCOME_SALES',
      daily_budget_pence: body.campaign.daily_budget_pence,
      start_at: body.campaign.start_at ?? null,
      end_at: body.campaign.end_at ?? null,
      status: 'draft_synced',
    })
    .select('id, fb_campaign_id')
    .single()
  if (campaignErr || !campaignRow) {
    const message = `campaign created on Meta (${fbCampaignId}) but local persistence failed: ${campaignErr?.message}`
    await markJobFailed(message)
    return jsonResponse({ ok: false, error: message }, 500)
  }

  /* ── Step 2: ad sets, creatives, ads ─────────────────────────── */
  const adSetResults: { id: string; fb_adset_id: string; ad_ids: string[] }[] = []
  const failures: string[] = []

  for (const adSet of body.ad_sets) {
    try {
      // a) Pre-upload any video creatives so we have a video_id ready
      const videoIdByCreativeId = new Map<string, string>()
      for (const cid of adSet.creative_ids) {
        const c = creativeById.get(cid)
        if (c?.kind === 'video' && c.public_url) {
          const videoId = await metaUploadVideo({
            adAccount,
            token,
            fileUrl: c.public_url,
            title: body.campaign.name,
          })
          videoIdByCreativeId.set(c.id, videoId)
        }
      }

      // b) Create the ad set itself
      const fbAdSetId = await metaCreateAdSet({
        adAccount,
        token,
        campaignId: fbCampaignId,
        name: adSet.name,
        dailyBudgetPence: adSet.daily_budget_pence ?? Math.max(100, Math.round(body.campaign.daily_budget_pence / body.ad_sets.length)),
        startAt: body.campaign.start_at ?? null,
        endAt: body.campaign.end_at ?? null,
        optimisationGoal: adSet.optimisation_goal ?? 'OFFSITE_CONVERSIONS',
        bidStrategy: adSet.bid_strategy ?? 'LOWEST_COST_WITHOUT_CAP',
        targeting: adSet.targeting ?? {},
      })

      // c) Persist ad_set row
      const { data: adSetRow } = await admin
        .from('ad_sets')
        .insert({
          campaign_id: campaignRow.id,
          brand: body.brand,
          name: adSet.name,
          fb_adset_id: fbAdSetId,
          creative_ids: adSet.creative_ids,
          targeting: adSet.targeting ?? {},
          optimisation_goal: adSet.optimisation_goal ?? 'OFFSITE_CONVERSIONS',
          bid_strategy: adSet.bid_strategy ?? 'LOWEST_COST_WITHOUT_CAP',
          daily_budget_pence: adSet.daily_budget_pence ?? null,
        })
        .select('id')
        .single()

      // d) For each creative, create an ad creative then an ad
      const adIds: string[] = []
      for (const cid of adSet.creative_ids) {
        const c = creativeById.get(cid)
        if (!c) continue
        const fbCreativeId = await metaCreateAdCreative({
          adAccount,
          token,
          pageId: cfg.page_id!,
          instagramActorId: cfg.instagram_actor_id || undefined,
          creative: c,
          videoId: videoIdByCreativeId.get(cid),
          campaignName: body.campaign.name,
        })
        const fbAdId = await metaCreateAd({
          adAccount,
          token,
          adSetId: fbAdSetId,
          creativeId: fbCreativeId,
          name: `${adSet.name} · ${c.kind}`,
        })
        adIds.push(fbAdId)
      }

      adSetResults.push({ id: adSetRow?.id ?? '', fb_adset_id: fbAdSetId, ad_ids: adIds })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`ad set "${adSet.name}": ${msg}`)
    }
  }

  /* ── Step 3: finalise ─────────────────────────────────────────── */
  if (failures.length > 0) {
    await admin
      .from('ad_campaigns')
      .update({ last_sync_error: failures.join(' · ') })
      .eq('id', campaignRow.id)
    if (jobId) {
      await admin
        .from('ad_jobs')
        .update({
          status: 'failed',
          campaign_id: campaignRow.id,
          error: failures.join(' · '),
          result: { fb_campaign_id: fbCampaignId, ad_sets: adSetResults },
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }
  } else if (jobId) {
    await admin
      .from('ad_jobs')
      .update({
        status: 'done',
        campaign_id: campaignRow.id,
        result: { fb_campaign_id: fbCampaignId, ad_sets: adSetResults },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }

  return jsonResponse({
    ok: failures.length === 0,
    campaign: {
      id: campaignRow.id,
      fb_campaign_id: fbCampaignId,
      ads_manager_url: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccount.replace(/^act_/, '')}&selected_campaign_ids=${fbCampaignId}`,
    },
    ad_sets: adSetResults,
    failures: failures.length ? failures : undefined,
  })
})


/* ─── Meta Marketing API helpers ─────────────────────────────────── */

async function metaPost(url: string, params: Record<string, string>, token: string): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = (json?.error?.message as string | undefined) ?? `meta ${res.status}`
    throw new Error(errMsg)
  }
  return json
}

async function metaCreateCampaign(opts: { adAccount: string; token: string; name: string; objective: string }): Promise<string> {
  const json = await metaPost(`${META_GRAPH}/${opts.adAccount}/campaigns`, {
    name: opts.name,
    objective: opts.objective,
    status: 'PAUSED',
    special_ad_categories: '[]',
    buying_type: 'AUCTION',
  }, opts.token)
  const id = (json.id as string | undefined) ?? ''
  if (!id) throw new Error('meta did not return campaign id')
  return id
}

async function metaUploadVideo(opts: { adAccount: string; token: string; fileUrl: string; title: string }): Promise<string> {
  const json = await metaPost(`${META_GRAPH}/${opts.adAccount}/advideos`, {
    file_url: opts.fileUrl,
    title: opts.title.slice(0, 90),
  }, opts.token)
  const id = (json.id as string | undefined) ?? ''
  if (!id) throw new Error('meta did not return video id')
  return id
}

async function metaCreateAdSet(opts: {
  adAccount: string
  token: string
  campaignId: string
  name: string
  dailyBudgetPence: number
  startAt: string | null
  endAt: string | null
  optimisationGoal: string
  bidStrategy: string
  targeting: AdSetInput['targeting']
}): Promise<string> {
  // Meta expects budget in cents of the account currency. We store pence;
  // they're equivalent for GBP/USD/EUR which is what the brands use.
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: opts.targeting?.countries ?? ['GB'] },
  }
  if (opts.targeting?.age_min) targeting.age_min = opts.targeting.age_min
  if (opts.targeting?.age_max) targeting.age_max = opts.targeting.age_max
  if (opts.targeting?.genders && opts.targeting.genders.length) targeting.genders = opts.targeting.genders
  if (opts.targeting?.interests?.length) {
    targeting.flexible_spec = [{ interests: opts.targeting.interests }]
  }

  const params: Record<string, string> = {
    name: opts.name,
    campaign_id: opts.campaignId,
    daily_budget: String(opts.dailyBudgetPence),
    billing_event: 'IMPRESSIONS',
    optimization_goal: opts.optimisationGoal,
    bid_strategy: opts.bidStrategy,
    status: 'PAUSED',
    targeting: JSON.stringify(targeting),
  }
  if (opts.startAt) params.start_time = new Date(opts.startAt).toISOString()
  if (opts.endAt) params.end_time = new Date(opts.endAt).toISOString()

  const json = await metaPost(`${META_GRAPH}/${opts.adAccount}/adsets`, params, opts.token)
  const id = (json.id as string | undefined) ?? ''
  if (!id) throw new Error('meta did not return ad set id')
  return id
}

async function metaCreateAdCreative(opts: {
  adAccount: string
  token: string
  pageId: string
  instagramActorId?: string
  creative: { id: string; kind: 'image' | 'video'; public_url: string; prompt: string | null }
  videoId?: string
  campaignName: string
}): Promise<string> {
  // We default the link URL to the brand's homepage. Per-campaign landing
  // URL support comes later — for MVP the operator can edit the destination
  // in Ads Manager before launch.
  const linkUrl = 'https://vitalabs.io'
  const messageCopy = opts.creative.prompt?.slice(0, 200) ?? opts.campaignName

  const objectStorySpec: Record<string, unknown> = { page_id: opts.pageId }
  if (opts.instagramActorId) objectStorySpec.instagram_actor_id = opts.instagramActorId

  if (opts.creative.kind === 'image') {
    objectStorySpec.link_data = {
      link: linkUrl,
      message: messageCopy,
      picture: opts.creative.public_url,
      call_to_action: { type: 'SHOP_NOW', value: { link: linkUrl } },
    }
  } else {
    if (!opts.videoId) throw new Error('video creative missing uploaded video id')
    objectStorySpec.video_data = {
      video_id: opts.videoId,
      message: messageCopy,
      call_to_action: { type: 'SHOP_NOW', value: { link: linkUrl } },
    }
  }

  const json = await metaPost(`${META_GRAPH}/${opts.adAccount}/adcreatives`, {
    name: `${opts.campaignName} · ${opts.creative.id.slice(0, 8)}`,
    object_story_spec: JSON.stringify(objectStorySpec),
  }, opts.token)
  const id = (json.id as string | undefined) ?? ''
  if (!id) throw new Error('meta did not return ad creative id')
  return id
}

async function metaCreateAd(opts: {
  adAccount: string
  token: string
  adSetId: string
  creativeId: string
  name: string
}): Promise<string> {
  const json = await metaPost(`${META_GRAPH}/${opts.adAccount}/ads`, {
    name: opts.name,
    adset_id: opts.adSetId,
    creative: JSON.stringify({ creative_id: opts.creativeId }),
    status: 'PAUSED',
  }, opts.token)
  const id = (json.id as string | undefined) ?? ''
  if (!id) throw new Error('meta did not return ad id')
  return id
}
