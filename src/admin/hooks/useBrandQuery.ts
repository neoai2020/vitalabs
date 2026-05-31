import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useAdminBrand } from '../context/AdminBrandContext'
import { supabase } from '../../lib/supabase'
import { recordAudit, type AuditAction } from '../lib/auditLog'

interface ListOptions {
  table: string
  select?: string
  orderBy?: { column: string; ascending?: boolean }
}

/** Cached, brand-scoped read of a table. */
export function useBrandList<Row>({ table, select = '*', orderBy }: ListOptions): UseQueryResult<Row[]> {
  const { brand } = useAdminBrand()
  return useQuery({
    queryKey: [table, brand, orderBy?.column, orderBy?.ascending],
    queryFn: async () => {
      let q = supabase.from(table).select(select).eq('brand', brand)
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })
}

interface MutationOptions {
  table: string
  invalidateKey?: string
}

/** Brand-aware insert/update/delete with audit logging + cache invalidation. */
export function useBrandMutation({ table, invalidateKey }: MutationOptions) {
  const { brand } = useAdminBrand()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [invalidateKey ?? table, brand] })
  }

  const upsert = useMutation({
    mutationFn: async ({ row, onConflict }: { row: Record<string, unknown>; onConflict?: string }) => {
      const action: AuditAction = row.id ? 'update' : 'insert'
      const { data, error } = await supabase.from(table).upsert({ ...row, brand }, { onConflict }).select().maybeSingle()
      if (error) throw error
      await recordAudit({ brand, tableName: table, rowId: String(row.id ?? data?.id ?? ''), action, diff: { after: data ?? row } })
      return data
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async ({ id, matchKey = 'id' }: { id: string | number; matchKey?: string }) => {
      const { error } = await supabase.from(table).delete().eq('brand', brand).eq(matchKey, id)
      if (error) throw error
      await recordAudit({ brand, tableName: table, rowId: String(id), action: 'delete' })
    },
    onSuccess: invalidate,
  })

  return { upsert, remove, invalidate }
}
