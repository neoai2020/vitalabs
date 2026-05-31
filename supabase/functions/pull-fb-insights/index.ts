/**
 * Pulls daily insights from Meta Marketing API for every synced
 * campaign on the brand and upserts rows into ad_insights_daily.
 *
 * Endpoint shape:
 *   GET /act_<id>/insights
 *     ?level=adset
 *     &time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
 *     &time_increment=1
 *     &fields=campaign_id,adset_id,spend,impressions,clicks,inline_link_clicks,actions,action_values
 *
 * Body: { brand, since?: 'YYYY-MM-DD', until?: 'YYYY-MM-DD' }
 *   Defaults to the last 7 days (timezone-naïve — Meta returns the
 *   account's reporting timezone).
 *
 * Returns: { ok, brand, rows_upserted, days, ad_account_id }
 *
 * Idempotent — re-running for the same date range overwrites the
 * existing daily rows.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

const META_API_VERSION = Deno.env.get('META_API_VERSION') ?? 'v21.0'
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

type Brand = 'vitalabs' | 'peptiva'

interface RequestBody {
  brand: Brand
  since?: string
  until?: string
}

interface InsightsRow {
  campaign_id?: string
  adset_id?: string
  date_start?: string
  spend?: string
  impressions?: string
  clicks?: string
  inline_link_clicks?: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const token = Deno.env.get('META_SYSTEM_USER_TOKEN')
  if (!token) return jsonResponse({ ok: false, error: 'META_SYSTEM_USER_TOKEN not configured' }, 500)

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
  if (!body.brand) return jsonResponse({ ok: false, error: 'brand required' }, 400)

  const since = body.since ?? isoDateAgo(7)
  const until = body.until ?? isoDateAgo(0)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: cfgRow } = await admin
    .from('site_config')
    .select('value')
    .eq('brand', body.brand)
    .eq('key', 'meta_ads')
    .maybeSingle()
  const cfg = (cfgRow?.value ?? {}) as { ad_account_id?: string }
  if (!cfg.ad_account_id) {
    return jsonResponse({ ok: false, error: 'meta_ads.ad_account_id not configured for this brand' }, 400)
  }
  const adAccount = cfg.ad_account_id.startsWith('act_') ? cfg.ad_account_id : `act_${cfg.ad_account_id}`

  // Map fb_campaign_id back to our local ad_campaigns row so the upsert
  // can attach campaign_id (used for the Insights → Campaign join later).
  const { data: campaigns } = await admin
    .from('ad_campaigns')
    .select('id, fb_campaign_id')
    .eq('brand', body.brand)
    .not('fb_campaign_id', 'is', null)
  const campaignIdByFb = new Map((campaigns ?? []).map(c => [c.fb_campaign_id, c.id]))

  // Fetch insights at adset level so we can join back through ad_sets if
  // we want per-ad-set breakdowns later. Campaign-level aggregations are
  // computed from these client-side.
  const url = new URL(`${META_GRAPH}/${adAccount}/insights`)
  url.searchParams.set('level', 'adset')
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('time_range', JSON.stringify({ since, until }))
  url.searchParams.set('fields', 'campaign_id,adset_id,spend,impressions,clicks,inline_link_clicks,actions,action_values')
  url.searchParams.set('limit', '500')
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    return jsonResponse({ ok: false, error: `meta ${res.status}: ${errBody.slice(0, 300)}` }, 502)
  }
  const json = await res.json()
  const rows: InsightsRow[] = json?.data ?? []

  let upserted = 0
  for (const r of rows) {
    if (!r.campaign_id || !r.date_start) continue
    const conversions = sumActions(r.actions, ['purchase', 'offsite_conversion.fb_pixel_purchase'])
    const conversionValue = sumActions(r.action_values, ['purchase', 'offsite_conversion.fb_pixel_purchase'])

    const { error } = await admin.from('ad_insights_daily').upsert({
      brand: body.brand,
      fb_campaign_id: r.campaign_id,
      fb_adset_id: r.adset_id ?? null,
      campaign_id: campaignIdByFb.get(r.campaign_id) ?? null,
      date: r.date_start,
      spend_pence: toPence(r.spend),
      impressions: toInt(r.impressions),
      clicks: toInt(r.clicks),
      link_clicks: toInt(r.inline_link_clicks),
      conversions: Math.round(conversions),
      conversion_value_pence: Math.round(conversionValue * 100),
      metadata: { actions: r.actions ?? [], action_values: r.action_values ?? [] },
    }, { onConflict: 'brand,fb_campaign_id,fb_adset_id,date' })
    if (!error) upserted += 1
    else console.warn('[pull-fb-insights] upsert failed', error)
  }

  return jsonResponse({
    ok: true,
    brand: body.brand,
    ad_account_id: adAccount,
    rows_upserted: upserted,
    days: { since, until },
  })
})


function isoDateAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function toInt(s: string | undefined): number {
  if (!s) return 0
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : 0
}

function toPence(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

function sumActions(actions: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!actions) return 0
  let total = 0
  for (const a of actions) {
    if (types.includes(a.action_type)) {
      const v = parseFloat(a.value)
      if (Number.isFinite(v)) total += v
    }
  }
  return total
}
