import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useConfig } from '../../lib/config/ConfigProvider'
import { useAdminBrand } from '../context/AdminBrandContext'
import { recordAudit } from '../lib/auditLog'
import { type SiteConfig, type SiteConfigKey } from '../../lib/config/types'

interface State<K extends SiteConfigKey> {
  value: SiteConfig[K]
  setValue: React.Dispatch<React.SetStateAction<SiteConfig[K]>>
  save: () => Promise<void>
  saving: boolean
  error: string | null
  savedAt: Date | null
  dirty: boolean
}

/**
 * Generic editor hook for a single site_config row keyed by (current
 * admin brand, given key). Reads initial value from ConfigProvider so
 * the cache stays warm; saves via upsert + records an audit row.
 */
export function useSiteConfigEditor<K extends SiteConfigKey>(key: K): State<K> {
  const { brand } = useAdminBrand()
  const { config, refresh } = useConfig()
  const initial = config[key]
  const [value, setValue] = useState<SiteConfig[K]>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [baseline, setBaseline] = useState<SiteConfig[K]>(initial)

  // Reset when the config refresh or brand switch produces a new value.
  useEffect(() => {
    setValue(config[key])
    setBaseline(config[key])
  }, [config, key])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { error: dbError } = await supabase
        .from('site_config')
        .upsert({ brand, key, value }, { onConflict: 'brand,key' })
      if (dbError) throw dbError
      await recordAudit({
        brand,
        tableName: 'site_config',
        rowId: key,
        action: 'update',
        diff: { before: baseline, after: value },
      })
      setBaseline(value)
      setSavedAt(new Date())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const dirty = JSON.stringify(value) !== JSON.stringify(baseline)

  return { value, setValue, save, saving, error, savedAt, dirty }
}
