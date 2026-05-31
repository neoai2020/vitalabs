import { useEffect, useState } from 'react'
import { fetchActiveBanner, type Banner as BannerData } from '../lib/marketing'

/**
 * Public-facing site-wide banner. Rendered above the nav on every
 * public page. Reads the current brand's active banner from Supabase
 * (filtered by start_at/end_at + active). Renders nothing if there's
 * no eligible banner — zero impact when the marketing tab is unused.
 */
export default function Banner() {
  const [banner, setBanner] = useState<BannerData | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchActiveBanner().then(b => { if (!cancelled) setBanner(b) })
    return () => { cancelled = true }
  }, [])

  if (!banner) return null

  const content = (
    <div
      className="site-banner"
      style={{
        background: banner.background_color || '#143F66',
        color: banner.text_color || '#ffffff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {banner.message}
    </div>
  )

  if (banner.link) {
    return (
      <a href={banner.link} style={{ textDecoration: 'none' }}>{content}</a>
    )
  }
  return content
}
