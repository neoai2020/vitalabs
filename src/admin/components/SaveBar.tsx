import { Button } from './ui/Button'

interface Props {
  saving: boolean
  dirty: boolean
  error: string | null
  savedAt: Date | null
  onSave: () => void
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function SaveBar({ saving, dirty, error, savedAt, onSave }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[12px] text-[var(--color-admin-muted)]">
        {error ? (
          <span className="text-[var(--color-admin-danger)]">{error}</span>
        ) : dirty ? (
          <span className="admin-mono text-[var(--color-admin-muted)]">Unsaved changes</span>
        ) : savedAt ? (
          <span className="admin-mono">Saved {formatTime(savedAt)}</span>
        ) : (
          <span>Changes go live the moment you save.</span>
        )}
      </div>
      <Button onClick={onSave} disabled={!dirty || saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  )
}
