import { useEffect, useState } from 'react'
import { fetchActiveBanner, type Banner as BannerData } from '../lib/marketing'

interface Props {
  /** When provided, skips the supabase fetch and renders these props
   * directly. Used by the admin live-preview pane to show how the
   * banner will look as the editor types. */
  override?: Partial<BannerData> & Pick<BannerData, 'message'>
}

/**
 * Public-facing site-wide banner. Rendered above the nav on every
 * public page. Reads the current brand's active banner from Supabase
 * (filtered by start_at/end_at + active). Renders nothing if there's
 * no eligible banner — zero impact when the marketing tab is unused.
 */
export default function Banner({ override }: Props = {}) {
  const [banner, setBanner] = useState<BannerData | null>(null)

  useEffect(() => {
    if (override) return
    let cancelled = false
    void fetchActiveBanner().then(b => { if (!cancelled) setBanner(b) })
    return () => { cancelled = true }
  }, [override])

  const source: BannerData | null = override
    ? {
        id: 'preview',
        message: override.message,
        link: override.link ?? null,
        background_color: override.background_color || '#143F66',
        text_color: override.text_color || '#ffffff',
        start_at: null,
        end_at: null,
        active: true,
      }
    : banner

  if (!source) return null
  const banner_data = source

  const content = (
    <div
      className="site-banner"
      style={{
        background: banner_data.background_color || '#143F66',
        color: banner_data.text_color || '#ffffff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {banner_data.message}
    </div>
  )

  if (banner_data.link && !override) {
    return (
      <a href={banner_data.link} style={{ textDecoration: 'none' }}>{content}</a>
    )
  }
  return content
}
