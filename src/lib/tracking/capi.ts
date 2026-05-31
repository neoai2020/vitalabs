import { supabase } from '../supabase'
import { getBrand } from '../config/brand'

/**
 * Fires a Facebook Conversions API event server-side. Pair this with the
 * browser-side `fbq('track', name, props, { eventID })` call using the
 * SAME event_id so Meta deduplicates the pair into one conversion.
 *
 * Returns immediately if the page isn't running in a browser. Failures
 * are logged but never throw — CAPI is a backup signal, not a hard
 * dependency for the user flow.
 */

interface FireCapiOpts {
  eventId: string
  eventName: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  country?: string
  customData?: Record<string, unknown>
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

export async function fireCapiEvent(opts: FireCapiOpts): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const fbp = readCookie('_fbp')
    const fbc = readCookie('_fbc')
    const { error } = await supabase.functions.invoke('fb-capi-event', {
      body: {
        brand: getBrand(),
        event_name: opts.eventName,
        event_id: opts.eventId,
        event_source_url: window.location.href,
        user_data: {
          email: opts.email,
          phone: opts.phone,
          first_name: opts.firstName,
          last_name: opts.lastName,
          country: opts.country,
          fbp,
          fbc,
        },
        custom_data: opts.customData,
      },
    })
    if (error) console.warn('[capi] forward failed:', error.message)
  } catch (err) {
    console.warn('[capi] uncaught:', err)
  }
}

/**
 * Generates a stable event id for browser/server dedupe. Format:
 * `<event>.<timestamp>.<random>`. Caller must use the SAME id for the
 * browser `fbq` call AND the `fireCapiEvent` call.
 */
export function newEventId(eventName: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${eventName.toLowerCase()}.${Date.now()}.${rand}`
}
