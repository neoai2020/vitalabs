import { useEffect, useState } from 'react'
import { fetchPeptideById, fetchPeptides, type CataloguePeptide } from './catalogue'

interface ListState {
  peptides: CataloguePeptide[]
  loading: boolean
  error: string | null
}

export function usePeptides(): ListState {
  const [peptides, setPeptides] = useState<CataloguePeptide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPeptides()
      .then(list => { if (!cancelled) { setPeptides(list); setError(null) } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { peptides, loading, error }
}

interface SingleState {
  peptide: CataloguePeptide | undefined
  loading: boolean
  error: string | null
}

export function usePeptide(id: string | undefined): SingleState {
  const [peptide, setPeptide] = useState<CataloguePeptide | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPeptideById(id)
      .then(p => { if (!cancelled) { setPeptide(p); setError(null) } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load product') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { peptide, loading, error }
}
