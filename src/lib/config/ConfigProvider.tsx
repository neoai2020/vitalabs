import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { getBrand, type Brand } from './brand'
import { DEFAULT_CONFIG, type SiteConfig, type SiteConfigKey } from './types'

interface ConfigContextType {
  brand: Brand
  config: SiteConfig
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ConfigContext = createContext<ConfigContextType | null>(null)

interface ConfigProviderProps {
  /** Overrides the env-derived brand. Useful for the admin UI which can
   * switch which brand it is managing. */
  brand?: Brand
  children: ReactNode
}

async function fetchConfigForBrand(brand: Brand): Promise<SiteConfig> {
  const { data, error } = await supabase
    .from('site_config')
    .select('key, value')
    .eq('brand', brand)
  if (error) throw error
  const merged: SiteConfig = { ...DEFAULT_CONFIG }
  const mergedAsRecord = merged as unknown as Record<string, unknown>
  for (const row of data ?? []) {
    const key = row.key as SiteConfigKey
    if (key in merged) {
      // Merge in any keys present in the DB row, falling back to defaults
      // for unknown sub-keys. JSONB shape may drift over time; defaults
      // shield the frontend from undefined access bugs.
      mergedAsRecord[key] = {
        ...(merged[key] as object),
        ...(row.value as object),
      }
    }
  }
  return merged
}

export function ConfigProvider({ brand: brandOverride, children }: ConfigProviderProps) {
  const resolvedBrand = brandOverride ?? getBrand()
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchConfigForBrand(resolvedBrand)
      setConfig(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load config'
      setError(message)
      // Keep defaults so the app still renders if the DB call fails
      // (e.g. network blip or missing rows).
      setConfig(DEFAULT_CONFIG)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBrand])

  const value = useMemo<ConfigContextType>(() => ({
    brand: resolvedBrand,
    config,
    loading,
    error,
    refresh: load,
  }), [resolvedBrand, config, loading, error])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider')
  return ctx
}
