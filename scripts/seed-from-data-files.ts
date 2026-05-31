/**
 * Idempotent seed script: takes the current TS data files (peptides,
 * productContent, plus inline FAQ/review constants) and writes them
 * into Supabase so the admin has real data to manage from day one.
 *
 * Usage:
 *
 *   # 1) Make sure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   # 2) Pick which brand to seed. Defaults to running both.
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   BRAND=vitalabs|peptiva|all (default: all)
 *   npx tsx scripts/seed-from-data-files.ts
 *
 * Safe to re-run: every upsert key includes (brand, id) or equivalent.
 */
import { createClient } from '@supabase/supabase-js'
import { PEPTIDES } from '../src/data/peptides'
import { getProductContent } from '../src/data/productContent'

type Brand = 'vitalabs' | 'peptiva'
const ALL_BRANDS: Brand[] = ['vitalabs', 'peptiva']

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function brandsFromArg(): Brand[] {
  const arg = (process.env.BRAND ?? 'all').toLowerCase()
  if (arg === 'all') return ALL_BRANDS
  if (arg === 'vitalabs' || arg === 'peptiva') return [arg]
  console.error(`Invalid BRAND='${arg}'. Use vitalabs | peptiva | all.`)
  process.exit(1)
}

async function seedProducts(brand: Brand) {
  console.log(`[${brand}] seeding products (${PEPTIDES.length} rows)…`)
  const rows = PEPTIDES.map((p, i) => {
    const extra = getProductContent(p.id)
    return {
      id: p.id,
      brand,
      sku: p.sku,
      slug: p.id,
      compound: p.compound,
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      mechanism: extra.howItWorks,
      benefits: extra.benefits,
      ideal_for: extra.idealFor,
      protocol: extra.whatToExpect,
      image_url: p.image,
      catalog_url: p.catalogUrl,
      badge: null,
      tags: p.tags,
      doses: p.doses,
      status: 'active',
      sort_order: 100 + i,
    }
  })
  const { error } = await supabase.from('products').upsert(rows, { onConflict: 'brand,id' })
  if (error) throw error
}

interface FaqSeed { page: string; question: string; answer: string }

const FAQ_SEEDS: FaqSeed[] = [
  {
    page: 'results',
    question: 'Is this medication safe?',
    answer:
      'Yes. All products in our catalogue are pharmaceutical-grade and supplied by verified UK partners. They are sold for research purposes only and should not be administered without consulting a licensed practitioner.',
  },
  {
    page: 'results',
    question: 'How quickly will I see results?',
    answer:
      'Most users report appetite changes within the first 1–2 weeks and visible weight loss by week 3–4. Individual results vary based on dose, lifestyle, and starting metabolic state.',
  },
  {
    page: 'results',
    question: 'What if it does not work for me?',
    answer:
      'Our results-based guarantee gives you peace of mind. If you do not see progress within 90 days of consistent use, contact support.',
  },
  {
    page: 'tsl',
    question: 'How is this different from other suppliers?',
    answer:
      'Every batch is sourced from licensed UK facilities, comes with a Certificate of Analysis, and is dispatched discreetly within 24 hours. Standard suppliers often skip purity testing and use grey-market sources.',
  },
  {
    page: 'tsl',
    question: 'Can I cancel later?',
    answer:
      'Yes. You can pause or cancel any time directly from the members area or by emailing support.',
  },
  {
    page: 'product',
    question: 'How do I store this?',
    answer:
      'Keep refrigerated at 2–8°C. Once reconstituted, use within 30 days. Do not freeze.',
  },
  {
    page: 'product',
    question: 'Is shipping discreet?',
    answer:
      'Yes. All orders ship in plain packaging with no branding visible from the outside.',
  },
]

async function seedFaqs(brand: Brand) {
  console.log(`[${brand}] seeding faqs (${FAQ_SEEDS.length} rows)…`)
  // Reset existing seeds for these pages then insert. Faqs is brand+page+question keyed,
  // but no unique index — we use a "delete + insert with same brand/page" pattern.
  for (const page of new Set(FAQ_SEEDS.map(f => f.page))) {
    const { error: delError } = await supabase
      .from('faqs')
      .delete()
      .eq('brand', brand)
      .eq('page', page)
    if (delError) throw delError
  }
  const rows = FAQ_SEEDS.map((f, i) => ({
    brand,
    page: f.page,
    question: f.question,
    answer: f.answer,
    sort_order: 10 + i,
  }))
  const { error } = await supabase.from('faqs').insert(rows)
  if (error) throw error
}

interface ReviewSeed { author: string; rating: number; text: string; source?: string; featured?: boolean }

const REVIEW_SEEDS: ReviewSeed[] = [
  { author: 'Sarah M.', rating: 5, text: 'Down 14kg in 12 weeks. Appetite control is unlike anything I have tried before.', source: 'Trustpilot', featured: true },
  { author: 'James K.', rating: 5, text: 'Discreet packaging, fast shipping, results that speak for themselves. Highly recommend.', source: 'Trustpilot', featured: true },
  { author: 'Priya R.', rating: 4, text: 'Took a couple of weeks to feel the effects but I am now consistently losing 1.5kg/week.', source: 'Trustpilot' },
  { author: 'Tom S.', rating: 5, text: 'Customer support team is responsive and the product arrived next day. No complaints.', source: 'Site' },
]

async function seedReviews(brand: Brand) {
  console.log(`[${brand}] seeding reviews (${REVIEW_SEEDS.length} rows)…`)
  const { error: delError } = await supabase
    .from('reviews')
    .delete()
    .eq('brand', brand)
    .is('product_id', null)
  if (delError) throw delError
  const rows = REVIEW_SEEDS.map(r => ({
    brand,
    product_id: null,
    author: r.author,
    rating: r.rating,
    text: r.text,
    source: r.source ?? null,
    featured: r.featured ?? false,
    posted_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('reviews').insert(rows)
  if (error) throw error
}

interface LegalSeed { slug: string; title: string }
const LEGAL_SEEDS: LegalSeed[] = [
  { slug: 'terms', title: 'Terms of Service' },
  { slug: 'privacy', title: 'Privacy Policy' },
  { slug: 'refund', title: 'Refund Policy' },
  { slug: 'disclaimer', title: 'Disclaimer' },
  { slug: 'shipping', title: 'Shipping Information' },
]

async function seedLegalPages(brand: Brand) {
  console.log(`[${brand}] seeding legal pages (${LEGAL_SEEDS.length} stubs)…`)
  const rows = LEGAL_SEEDS.map(l => ({
    brand,
    slug: l.slug,
    title: l.title,
    body_md: `# ${l.title}\n\n_This page has not yet been migrated to the admin. Edit it in /admin/content/legal._`,
  }))
  const { error } = await supabase.from('legal_pages').upsert(rows, { onConflict: 'brand,slug' })
  if (error) throw error
}

interface ContentBlockSeed { key: string; value: Record<string, unknown> }
const CONTENT_BLOCK_SEEDS: ContentBlockSeed[] = [
  {
    key: 'landing_hero',
    value: {
      headline: 'Find the right peptide for your body',
      subheadline: 'Three-minute quiz. Personalised match. Verified UK supply.',
      cta: 'Start the quiz →',
    },
  },
  {
    key: 'results_guarantee',
    value: {
      title: '90-day results guarantee',
      body: 'If you follow the protocol and do not see meaningful change in 90 days, contact support.',
    },
  },
  {
    key: 'footer_blurb',
    value: {
      body: 'Research-only products. Not for human consumption. Sold by Vita Labs Ltd, UK.',
    },
  },
]

async function seedContentBlocks(brand: Brand) {
  console.log(`[${brand}] seeding content blocks (${CONTENT_BLOCK_SEEDS.length} rows)…`)
  const rows = CONTENT_BLOCK_SEEDS.map(b => ({ brand, key: b.key, value: b.value }))
  const { error } = await supabase.from('content_blocks').upsert(rows, { onConflict: 'brand,key' })
  if (error) throw error
}

async function run() {
  const brands = brandsFromArg()
  for (const brand of brands) {
    console.log(`\n=== Seeding brand: ${brand} ===`)
    await seedProducts(brand)
    await seedFaqs(brand)
    await seedReviews(brand)
    await seedLegalPages(brand)
    await seedContentBlocks(brand)
  }
  console.log('\nDone.')
}

run().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
