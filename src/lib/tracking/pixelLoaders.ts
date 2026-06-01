/**
 * Pixel script injection. Each loader is idempotent: calling it twice
 * with the same ID is a no-op. The tracking config (read from site_config)
 * decides which loaders fire at runtime.
 *
 * All loaders run client-side only; they bail out cleanly on SSR.
 */
import type { Brand } from '../config/brand'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown }
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    ttq?: { load?: (id: string) => void; page?: () => void; track?: (event: string, props?: unknown) => void }
    snaptr?: ((...args: unknown[]) => void) & { queue?: unknown[]; handleRequest?: unknown }
    twq?: ((...args: unknown[]) => void) & { version?: string; queue?: unknown[] }
  }
}

/**
 * Hard-coded fallback Meta pixel IDs per brand. Used when `site_config`
 * has an empty pixel_id (e.g. fresh DB, admin cleared the field). The
 * admin panel value in /admin → Site Config → Tracking always wins when
 * it's a non-empty string.
 */
export const BRAND_META_PIXEL_DEFAULTS: Record<Brand, string> = {
  vitalabs: '1009611958106175',
  peptiva: '1360736692779319',
}

const LOADED = new Set<string>()

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function loadMetaPixel(pixelId: string): void {
  if (!isBrowser() || !pixelId) return
  const key = `meta:${pixelId}`
  if (LOADED.has(key)) return
  LOADED.add(key)

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      // @ts-expect-error - dynamic fbq.callMethod pattern from Meta snippet
      if (fbq.callMethod) fbq.callMethod.apply(fbq, args)
      else fbq.queue!.push(args)
    } as NonNullable<Window['fbq']>
    fbq.queue = []
    fbq.loaded = true
    fbq.version = '2.0'
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }

  const fbq = window.fbq
  if (!fbq) return
  fbq('init', pixelId)
  fbq('track', 'PageView')
}

export function trackMetaPageView(): void {
  if (!isBrowser() || !window.fbq) return
  window.fbq('track', 'PageView')
}

/**
 * Resolves once `window.fbq` is callable, or after `timeoutMs` if the pixel
 * never loads. Needed because `useTracking` injects the pixel only after
 * `ConfigProvider` resolves its async fetch — fires on the order-complete
 * page (cold landing via Uprails return_url) race that boot, so callers
 * must wait or the Purchase event silently no-ops.
 *
 * Returns true if fbq became available, false on timeout. Callers should
 * still fall back to CAPI on the server when this returns false.
 */
export function waitForFbq(timeoutMs = 5000): Promise<boolean> {
  if (!isBrowser()) return Promise.resolve(false)
  if (typeof window.fbq === 'function') return Promise.resolve(true)
  return new Promise<boolean>(resolve => {
    const start = Date.now()
    const interval = window.setInterval(() => {
      if (typeof window.fbq === 'function') {
        window.clearInterval(interval)
        resolve(true)
      } else if (Date.now() - start >= timeoutMs) {
        window.clearInterval(interval)
        resolve(false)
      }
    }, 50)
  })
}

export function loadGoogleTag(tagId: string): void {
  if (!isBrowser() || !tagId) return
  const key = `gtag:${tagId}`
  if (LOADED.has(key)) return
  LOADED.add(key)

  window.dataLayer = window.dataLayer || []
  const gtag: typeof window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag = gtag
  gtag('js' as unknown as Date, new Date())
  gtag('config', tagId)

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`
  document.head.appendChild(script)
}

export function trackGoogleTagPageView(tagId: string): void {
  if (!isBrowser() || !window.gtag || !tagId) return
  window.gtag('config', tagId, { page_path: window.location.pathname + window.location.search })
}

export function loadTikTokPixel(pixelId: string): void {
  if (!isBrowser() || !pixelId) return
  const key = `tt:${pixelId}`
  if (LOADED.has(key)) return
  LOADED.add(key)

  // TikTok bootstrap snippet, condensed.
  ;(function (w: Window, d: Document, t: string) {
    // @ts-expect-error - dynamic ttq init
    w.TiktokAnalyticsObject = t
    // @ts-expect-error - dynamic ttq
    const ttq = (w[t] = w[t] || [])
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
    ttq.setAndDefer = function (this: { [k: string]: unknown }, target: { [k: string]: unknown }, method: string) {
      target[method] = function (...args: unknown[]) {
        // @ts-expect-error - pushing dynamic call
        target.push([method].concat(Array.prototype.slice.call(args, 0)))
      }
    }
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
    ttq.instance = function (id: string) {
      const e = ttq._i[id] || []
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n])
      return e
    }
    ttq.load = function (e: string, n?: unknown) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js'
      ttq._i = ttq._i || {}
      ttq._i[e] = []
      ttq._i[e]._u = i
      ttq._t = ttq._t || {}
      ttq._t[e] = +new Date()
      ttq._o = ttq._o || {}
      ttq._o[e] = n || {}
      const o = d.createElement('script') as HTMLScriptElement
      o.type = 'text/javascript'
      o.async = true
      o.src = i + '?sdkid=' + e + '&lib=' + t
      const a = d.getElementsByTagName('script')[0]
      a.parentNode!.insertBefore(o, a)
    }
    ttq.load(pixelId)
    ttq.page()
  })(window, document, 'ttq')
}

export function trackTikTokPageView(): void {
  if (!isBrowser() || !window.ttq?.page) return
  window.ttq.page()
}

export function loadSnapPixel(pixelId: string): void {
  if (!isBrowser() || !pixelId) return
  const key = `snap:${pixelId}`
  if (LOADED.has(key)) return
  LOADED.add(key)

  ;(function (e: Window, t: Document, n: string) {
    if (e.snaptr) return
    const a = (e.snaptr = function (...args: unknown[]) {
      // @ts-expect-error - dynamic snaptr.handleRequest
      a.handleRequest ? a.handleRequest.apply(a, args) : a.queue!.push(args)
    }) as Window['snaptr']
    // @ts-expect-error - extending function object
    a.queue = []
    const r = 'script'
    const s = t.createElement(r)
    s.async = true
    s.src = n
    const u = t.getElementsByTagName(r)[0]
    u.parentNode!.insertBefore(s, u)
  })(window, document, 'https://sc-static.net/scevent.min.js')

  window.snaptr!('init', pixelId, {})
  window.snaptr!('track', 'PAGE_VIEW')
}

export function trackSnapPageView(): void {
  if (!isBrowser() || !window.snaptr) return
  window.snaptr('track', 'PAGE_VIEW')
}

export function loadTwitterPixel(pixelId: string): void {
  if (!isBrowser() || !pixelId) return
  const key = `twq:${pixelId}`
  if (LOADED.has(key)) return
  LOADED.add(key)

  ;(function (e: Window, t: Document, n: string, s: string) {
    if (e.twq) return
    const u = (e.twq = function (...args: unknown[]) {
      // @ts-expect-error - extending function
      u.exe ? u.exe.apply(u, args) : u.queue!.push(args)
    }) as Window['twq']
    // @ts-expect-error - extending function object
    u.version = '1.1'
    // @ts-expect-error - extending function object
    u.queue = []
    const i = t.createElement(n) as HTMLScriptElement
    i.async = true
    i.src = s
    const o = t.getElementsByTagName(n)[0]
    o.parentNode!.insertBefore(i, o)
  })(window, document, 'script', 'https://static.ads-twitter.com/uwt.js')

  window.twq!('config', pixelId)
}

export function trackTwitterPageView(pixelId: string): void {
  if (!isBrowser() || !window.twq || !pixelId) return
  window.twq('event', 'tw-PageView', {})
}
