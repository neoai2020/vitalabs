/** Real Apex Pharma supply catalog — 15 SKUs across 3 pillars. */
export interface PeptideDose {
  label: string
  mg: string
  price: number
}

export interface Peptide {
  id: string
  sku: string
  compound: string
  category: string
  tagline: string
  description: string
  image: string | null
  catalogUrl: string
  tags: string[]
  /** Multiple dose options (Reta, Tirzepatide); single-entry for everything else */
  doses: PeptideDose[]
}

const PRODUCTS_BASE = 'https://www.apexpharma.io/products'

export const PEPTIDES: Peptide[] = [
  /* ═══ WEIGHT MANAGEMENT ═══ */
  {
    id: '17',
    sku: 'Reta',
    compound: 'Retatrutide (triple agonist)',
    category: 'Weight management',
    tagline: 'Triple-pathway metabolic support — appetite, energy, and glucose in one.',
    description:
      'Retatrutide activates GLP-1, GIP, and glucagon receptors simultaneously. The most aggressive metabolic compound available — for users who need maximum intervention.',
    image:
      'https://admin.apexpharma.io/uploads/products/17/mmexport1764074055151_b066e6863290.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'triple', 'glp', 'maximum', 'advanced'],
    doses: [
      { label: '20mg', mg: '20mg', price: 129.99 },
      { label: '40mg', mg: '40mg', price: 179.99 },
      { label: '60mg', mg: '60mg', price: 209.99 },
    ],
  },
  {
    id: '21',
    sku: 'Reta 2.0',
    compound: 'Retatrutide (enhanced formulation)',
    category: 'Weight management',
    tagline: 'Next-generation retatrutide — enhanced bioavailability for maximum impact.',
    description:
      'An advanced retatrutide formulation with improved bioavailability. Designed for experienced users who want the strongest possible metabolic response from the triple-agonist pathway.',
    image:
      'https://admin.apexpharma.io/uploads/products/17/mmexport1764074055151_b066e6863290.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'triple', 'glp', 'maximum', 'advanced', 'enhanced'],
    doses: [
      { label: '45mg', mg: '45mg', price: 199.99 },
    ],
  },
  {
    id: '2',
    sku: 'Tirzepatide',
    compound: 'Tirzepatide (dual agonist)',
    category: 'Weight management',
    tagline: 'Dual GLP-1 + GIP signalling — strong, structured appetite control.',
    description:
      'Tirzepatide targets GLP-1 and GIP pathways to support satiety, insulin sensitivity, and steady energy use. The most popular balanced option for weight management.',
    image:
      'https://admin.apexpharma.io/uploads/products/2/KlikJARO_20mg_e0a5899f1cca.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'dual', 'glp', 'balanced', 'appetite'],
    doses: [
      { label: '20mg', mg: '20mg', price: 129.99 },
      { label: '40mg', mg: '40mg', price: 179.99 },
      { label: '60mg', mg: '60mg', price: 209.99 },
    ],
  },
  {
    id: '18',
    sku: 'Cagrilintide',
    compound: 'Cagrilintide (amylin analogue)',
    category: 'Weight management',
    tagline: 'Satiety-first support — feel genuinely full after eating.',
    description:
      'Cagrilintide amplifies fullness signalling rather than suppressing appetite. The gentlest entry point for weight management — ideal when hunger is the hardest variable to control.',
    image:
      'https://admin.apexpharma.io/uploads/products/18/Kliktide_a05e7e7467a2.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'appetite', 'satiation', 'gentle', 'new'],
    doses: [
      { label: '4mg', mg: '4mg', price: 79.99 },
    ],
  },

  /* ═══ STRENGTH & RECOVERY ═══ */
  {
    id: '8',
    sku: 'BPC157',
    compound: 'BPC-157',
    category: 'Strength & recovery',
    tagline: 'Tissue-focused repair signalling for nagging setbacks.',
    description:
      'BPC-157 is the most studied tissue-repair compound. Promotes angiogenesis, reduces inflammation, and accelerates healing in tendons, ligaments, gut lining, and muscle tissue.',
    image:
      'https://admin.apexpharma.io/uploads/products/8/Klik157_62fbea9efea6.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'inflammation', 'tissue'],
    doses: [
      { label: '5mg', mg: '5mg', price: 79.99 },
    ],
  },
  {
    id: '10',
    sku: 'TB500',
    compound: 'TB-500 (Thymosin Beta-4 fragment)',
    category: 'Strength & recovery',
    tagline: 'Cellular migration & repair — bounce back faster from training.',
    description:
      'TB-500 promotes cell migration to damaged tissue, supports angiogenesis, and modulates inflammation. The training-recovery compound for athletes and active people.',
    image:
      'https://admin.apexpharma.io/uploads/products/10/klik500_ee38724fe327.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'training', 'repair'],
    doses: [
      { label: '5mg', mg: '5mg', price: 79.99 },
    ],
  },
  {
    id: '20',
    sku: 'Wolverine',
    compound: 'BPC-157 + TB-500',
    category: 'Strength & recovery',
    tagline: 'Synergistic repair stack — both angles covered in one protocol.',
    description:
      'Combines BPC-157 and TB-500 for overlapping repair pathways — localised tissue healing plus systemic recovery. For stubborn issues or high training loads.',
    image:
      'https://admin.apexpharma.io/uploads/products/20/p9_080a60aa409866769d07_4b00e1eb2726.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'synergy', 'inflammation'],
    doses: [
      { label: '10mg', mg: '10mg', price: 119.99 },
    ],
  },

  /* ═══ CELLULAR REPAIR & ANTI-AGING ═══ */
  {
    id: '6',
    sku: 'Glow',
    compound: 'BPC-157 + TB-500 + GHK-Cu',
    category: 'Cellular repair & anti-aging',
    tagline: 'Full regenerative blend — repair + recovery + collagen renewal.',
    description:
      'Glow stacks tissue repair peptides with GHK-Cu for structural renewal, elasticity, and recovery in one protocol. The all-in-one option when you want to look and feel better.',
    image:
      'https://admin.apexpharma.io/uploads/products/6/KlikGlow_9541073eb8d1.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['skin_aging', 'recovery', 'collagen', 'full_stack'],
    doses: [
      { label: '15mg', mg: '15mg', price: 129.99 },
    ],
  },
  {
    id: '4',
    sku: 'GHKCU',
    compound: 'GHK-Cu (copper peptide)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Copper peptide classic for skin firmness and visible renewal.',
    description:
      'GHK-Cu activates collagen and elastin production, promotes wound healing, and improves extracellular matrix quality. The "visible results" peptide for skin texture and tone.',
    image:
      'https://admin.apexpharma.io/uploads/products/4/Klik-GHK_7c99071e3415.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['skin_aging', 'collagen', 'visible'],
    doses: [
      { label: '5mg', mg: '5mg', price: 99.99 },
    ],
  },
  {
    id: '19',
    sku: 'MOTC',
    compound: 'MOTS-C (mitochondrial peptide)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Mitochondrial peptide for real, sustained cellular energy.',
    description:
      'MOTS-C improves glucose utilisation, metabolic signalling, and cellular energy production. Real energy at the cellular level — not a stimulant.',
    image:
      'https://admin.apexpharma.io/uploads/products/19/Klikmots-c_618d197e22cf.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['cellular', 'mitochondrial', 'metabolic_cell'],
    doses: [
      { label: '10mg', mg: '10mg', price: 89.99 },
    ],
  },
  {
    id: '7',
    sku: 'NAD 1000mg',
    compound: 'NAD+ (2x 500mg pen box)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Coenzyme support for energy systems, DNA repair, and aging.',
    description:
      'NAD+ sits at the centre of redox balance and cellular energy. Declining levels are linked to aging, fatigue, and poor recovery. Direct supplementation restores the foundational deficit.',
    image:
      'https://admin.apexpharma.io/uploads/products/7/Image_1765185762662_caaa5d252020.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['cellular', 'nad', 'energy_systems'],
    doses: [
      { label: '1000mg (2x 500mg)', mg: '1000mg', price: 199.99 },
    ],
  },
]

export function getPeptideById(id: string): Peptide | undefined {
  return PEPTIDES.find((p) => p.id === id)
}

/** Default price for a peptide (lowest dose or single dose). */
export function getBasePrice(p: Peptide): number {
  return p.doses[0]?.price ?? 99.99
}

/** Recommended dose index based on experience level. */
export function recommendedDoseIndex(p: Peptide, level: 'beginner' | 'intermediate' | 'advanced'): number {
  if (p.doses.length <= 1) return 0
  switch (level) {
    case 'beginner': return 0
    case 'intermediate': return Math.min(1, p.doses.length - 1)
    case 'advanced': return p.doses.length - 1
  }
}
