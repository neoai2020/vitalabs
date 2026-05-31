/**
 * Shape of every site_config row's `value` JSONB, keyed by the `key`
 * column. Defaults are kept in sync with the seed in
 * supabase/migrations/0002_site_config.sql so the frontend can render
 * sensibly even if a row hasn't been seeded yet.
 */

export interface PixelEntry {
  enabled: boolean
  pixel_id?: string
  tag_id?: string
}

export interface TrackingConfig {
  meta: PixelEntry
  google_tag: PixelEntry
  tiktok: PixelEntry
  snap: PixelEntry
  twitter: PixelEntry
}

export interface BrandInfoConfig {
  name: string
  support_email: string
  tagline: string
}

export interface WhatsAppConfig {
  enabled: boolean
  phone: string
  hidden_routes: string[]
  default_message: string
}

export interface SeoDefaultsConfig {
  title: string
  description: string
  og_image: string
}

export interface FeatureFlagsConfig {
  whatsapp_enabled: boolean
  theme_toggle_enabled: boolean
  maintenance_mode: boolean
  [key: string]: boolean | undefined
}

export interface ThemeConfig {
  primary_color: string
  accent_color: string
}

export interface SiteConfig {
  tracking: TrackingConfig
  brand_info: BrandInfoConfig
  whatsapp: WhatsAppConfig
  seo_defaults: SeoDefaultsConfig
  feature_flags: FeatureFlagsConfig
  theme: ThemeConfig
}

export type SiteConfigKey = keyof SiteConfig

export const DEFAULT_TRACKING: TrackingConfig = {
  meta: { enabled: false, pixel_id: '' },
  google_tag: { enabled: false, tag_id: '' },
  tiktok: { enabled: false, pixel_id: '' },
  snap: { enabled: false, pixel_id: '' },
  twitter: { enabled: false, pixel_id: '' },
}

export const DEFAULT_BRAND_INFO: BrandInfoConfig = {
  name: 'Vita Labs',
  support_email: 'support@vitalabs.io',
  tagline: '',
}

export const DEFAULT_WHATSAPP: WhatsAppConfig = {
  enabled: true,
  phone: '447440153510',
  hidden_routes: ['/checkout'],
  default_message: 'I need some help',
}

export const DEFAULT_SEO: SeoDefaultsConfig = {
  title: 'Vita Labs',
  description: '',
  og_image: '',
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagsConfig = {
  whatsapp_enabled: true,
  theme_toggle_enabled: true,
  maintenance_mode: false,
}

export const DEFAULT_THEME: ThemeConfig = {
  primary_color: '#143F66',
  accent_color: '#5E89A4',
}

export const DEFAULT_CONFIG: SiteConfig = {
  tracking: DEFAULT_TRACKING,
  brand_info: DEFAULT_BRAND_INFO,
  whatsapp: DEFAULT_WHATSAPP,
  seo_defaults: DEFAULT_SEO,
  feature_flags: DEFAULT_FEATURE_FLAGS,
  theme: DEFAULT_THEME,
}
