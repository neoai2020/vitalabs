import { supabase } from './supabase'
import { getBrand } from './config/brand'
import { PEPTIDES, type Peptide, type PeptideDose } from '../data/peptides'
import { getProductContent, type ProductContent } from '../data/productContent'

export interface CataloguePeptide extends Peptide {
  benefits: string[]
  idealFor: string[]
  whatToExpect: ProductContent['whatToExpect']
  howItWorks: string
}

function fallbackList(): CataloguePeptide[] {
  return PEPTIDES.map(p => {
    const c = getProductContent(p.id)
    return { ...p, benefits: c.benefits, idealFor: c.idealFor, whatToExpect: c.whatToExpect, howItWorks: c.howItWorks }
  })
}

function fallbackById(id: string): CataloguePeptide | undefined {
  const found = fallbackList().find(p => p.id === id)
  return found
}

interface DbProductRow {
  id: string
  sku: string | null
  compound: string
  category: string | null
  tagline: string | null
  description: string | null
  mechanism: string | null
  benefits: string[] | null
  ideal_for: string[] | null
  protocol: ProductContent['whatToExpect'] | null
  image_url: string | null
  catalog_url: string | null
  tags: string[] | null
  doses: PeptideDose[] | null
  sort_order: number | null
}

function rowToPeptide(row: DbProductRow): CataloguePeptide {
  return {
    id: row.id,
    sku: row.sku ?? '',
    compound: row.compound,
    category: row.category ?? '',
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    image: row.image_url,
    catalogUrl: row.catalog_url ?? '',
    tags: row.tags ?? [],
    doses: row.doses ?? [],
    benefits: row.benefits ?? [],
    idealFor: row.ideal_for ?? [],
    whatToExpect: row.protocol ?? [],
    howItWorks: row.mechanism ?? '',
  }
}

/**
 * Reads active products for the current brand from Supabase.
 * Falls back to the static src/data/peptides.ts list if the DB has
 * no rows yet (pre-migration, or before the seed script has run).
 */
export async function fetchPeptides(): Promise<CataloguePeptide[]> {
  const brand = getBrand()
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, compound, category, tagline, description, mechanism, benefits, ideal_for, protocol, image_url, catalog_url, tags, doses, sort_order')
    .eq('brand', brand)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
  if (error || !data || data.length === 0) {
    return fallbackList()
  }
  return (data as DbProductRow[]).map(rowToPeptide)
}

export async function fetchPeptideById(id: string): Promise<CataloguePeptide | undefined> {
  const brand = getBrand()
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, compound, category, tagline, description, mechanism, benefits, ideal_for, protocol, image_url, catalog_url, tags, doses, sort_order')
    .eq('brand', brand)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return fallbackById(id)
  return rowToPeptide(data as DbProductRow)
}
