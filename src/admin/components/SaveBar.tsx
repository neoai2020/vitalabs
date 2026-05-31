import { Button } from './ui/Button'

interface Props {
  saving: boolean
  dirty: boolean
  error: string | null
  savedAt: Date | null
  onSave: () => void
}

export function SaveBar({ saving, dirty, error, savedAt, onSave }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-[var(--color-admin-muted)]">
        {error ? (
          <span className="text-[var(--color-admin-danger)]">{error}</span>
        ) : savedAt ? (
          <>Saved {savedAt.toLocaleTimeString()}</>
        ) : (
          <>Changes are saved to Supabase and applied to the live site.</>
        )}
      </div>
      <Button onClick={onSave} disabled={!dirty || saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  )
}
