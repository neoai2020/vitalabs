import { supabase } from '../../lib/supabase'
import type { Brand } from '../../lib/config/brand'

export type AuditAction = 'insert' | 'update' | 'delete'

interface AuditPayload {
  brand: Brand
  tableName: string
  rowId?: string
  action: AuditAction
  diff?: { before?: unknown; after?: unknown }
}

/**
 * Best-effort write to admin_audit_log. Failures are swallowed so they
 * never block the originating admin action; they're logged to console
 * so we notice them during development.
 */
export async function recordAudit({ brand, tableName, rowId, action, diff }: AuditPayload): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      brand,
      table_name: tableName,
      row_id: rowId ?? null,
      action,
      diff: diff ?? null,
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[audit] insert failed:', error.message)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[audit] unexpected error:', err)
  }
}
