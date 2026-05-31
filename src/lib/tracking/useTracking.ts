import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useConfig } from '../config/ConfigProvider'
import {
  loadGoogleTag,
  loadMetaPixel,
  loadSnapPixel,
  loadTikTokPixel,
  loadTwitterPixel,
  trackGoogleTagPageView,
  trackMetaPageView,
  trackSnapPageView,
  trackTikTokPageView,
  trackTwitterPageView,
} from './pixelLoaders'

/**
 * Loads any enabled pixels once the config is available, and fires a
 * PageView on every route change.
 *
 * This replaces the inline <!-- Meta Pixel Code --> block that previously
 * lived in index.html. The benefit is twofold:
 *  - Pixel IDs are managed in /admin (no code edits, no redeploys)
 *  - SPA route changes correctly fire PageView (pre-existing bug fix)
 */
export function useTracking() {
  const { config, loading } = useConfig()
  const { pathname } = useLocation()

  // Initial load: inject script tags for each enabled pixel and fire the
  // first PageView via that pixel's bootstrap call.
  useEffect(() => {
    if (loading) return
    const { tracking } = config
    if (tracking.meta.enabled && tracking.meta.pixel_id) loadMetaPixel(tracking.meta.pixel_id)
    if (tracking.google_tag.enabled && tracking.google_tag.tag_id) loadGoogleTag(tracking.google_tag.tag_id)
    if (tracking.tiktok.enabled && tracking.tiktok.pixel_id) loadTikTokPixel(tracking.tiktok.pixel_id)
    if (tracking.snap.enabled && tracking.snap.pixel_id) loadSnapPixel(tracking.snap.pixel_id)
    if (tracking.twitter.enabled && tracking.twitter.pixel_id) loadTwitterPixel(tracking.twitter.pixel_id)
  }, [loading, config])

  // SPA route-change PageView (skipped on first render since the loaders
  // above already fired the initial PageView).
  useEffect(() => {
    if (loading) return
    const { tracking } = config
    if (tracking.meta.enabled) trackMetaPageView()
    if (tracking.google_tag.enabled && tracking.google_tag.tag_id) trackGoogleTagPageView(tracking.google_tag.tag_id)
    if (tracking.tiktok.enabled) trackTikTokPageView()
    if (tracking.snap.enabled) trackSnapPageView()
    if (tracking.twitter.enabled && tracking.twitter.pixel_id) trackTwitterPageView(tracking.twitter.pixel_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
}
