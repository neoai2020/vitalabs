/**
 * First-party analytics — writes events into the public.analytics_events
 * table for the admin dashboard to roll up. Independent of third-party
 * pixels (Meta / Google / TikTok) so we always own the funnel data.
 *
 * Sessions are tracked client-side with a `sessionStorage` UUID. A
 * "visitor" in the dashboard is therefore a distinct session, which is
 * the cheapest meaningful proxy without needing cross-tab identity.
 *
 * Failures are silent on purpose — analytics must never block the user
 * flow or surface errors to the public site.
 */

import { supabase } from './supabase'
import { getBrand } from './config/brand'

const SESSION_KEY = 'vl-session-id'

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, fresh)
    return fresh
  } catch {
    // Private mode / cookies disabled — fall back to a non-persistent ID
    // so each call still emits an event without crashing the page.
    return 'anon-' + Math.random().toString(36).slice(2)
  }
}

export type AnalyticsEventName =
  | 'page_view'
  | 'quiz_started'
  | 'quiz_completed'
  | 'lead_captured'
  | 'results_viewed'
  | 'upsell_viewed'
  | 'upsell_accepted'
  | 'upsell_declined'
  | 'checkout_started'
  | 'checkout_completed'
  | 'promo_applied'

interface TrackOptions {
  path?: string
  props?: Record<string, unknown>
}

let queue: Array<{ event_name: string; path: string | null; props: Record<string, unknown> }> = []
let flushTimer: number | null = null

/**
 * Queue an event and flush in micro-batches. Batching avoids hammering
 * the API when several events fire on the same tick (e.g. on a redirect
 * page that emits a view + a funnel event).
 */
export function trackEvent(name: AnalyticsEventName, options: TrackOptions = {}): void {
  if (typeof window === 'undefined') return

  queue.push({
    event_name: name,
    path: options.path ?? window.location.pathname,
    props: options.props ?? {},
  })

  if (flushTimer !== null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flush()
  }, 250)
}

async function flush(): Promise<void> {
  if (queue.length === 0) return
  const batch = queue
  queue = []

  const session_id = getSessionId()
  const brand = getBrand()
  const rows = batch.map(b => ({
    brand,
    session_id,
    event_name: b.event_name,
    path: b.path,
    props: b.props,
  }))

  try {
    await supabase.from('analytics_events').insert(rows)
  } catch {
    // Silent — see file-header comment.
  }
}

/**
 * Convenience helper. Page views are the single most common event so
 * give it its own well-named entry point.
 */
export function trackPageView(path?: string): void {
  trackEvent('page_view', { path })
}
