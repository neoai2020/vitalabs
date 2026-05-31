import { useTracking } from './useTracking'

/**
 * Mountpoint for tracking side-effects. Rendered once inside the public
 * route tree; emits nothing visible. Lives in its own component so the
 * useTracking() hook runs inside Router and ConfigProvider context.
 */
export function TrackingBoot() {
  useTracking()
  return null
}
