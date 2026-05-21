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
    sku: 'RETAKLIK',
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
      { label: '20mg', mg: '20', price: 129.99 },
      { label: '40mg', mg: '40', price: 179.99 },
      { label: '60mg', mg: '60', price: 209.99 },
    ],
  },
  {
    id: '21',
    sku: 'RETATRUTIDE 2.0',
    compound: 'Retatrutide 2.0 (enhanced formulation)',
    category: 'Weight management',
    tagline: 'Next-generation retatrutide — enhanced bioavailability for maximum impact.',
    description:
      'RETAKLIK 2.0 is supplied in pre-filled research devices for controlled laboratory and R&D use only. Delivered in sealed format to support formulation assessment, compound stability testing, and delivery system evaluation.',
    image:
      'https://admin.apexpharma.io/uploads/products/17/mmexport1764074055151_b066e6863290.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'triple', 'glp', 'maximum', 'advanced', 'enhanced'],
    doses: [
      { label: '45mg', mg: '45', price: 199.99 },
    ],
  },
  {
    id: '2',
    sku: 'KLIKJARO',
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
      { label: '20mg', mg: '20', price: 129.99 },
      { label: '40mg', mg: '40', price: 179.99 },
      { label: '60mg', mg: '60', price: 209.99 },
    ],
  },
  {
    id: '18',
    sku: 'KLIKTIDE',
    compound: 'Cagrilintide (amylin analogue)',
    category: 'Weight management',
    tagline: 'Satiety-first support — feel genuinely full after eating.',
    description:
      'KLIKTIDE is a long-acting amylin analogue developed to support appetite regulation and satiety control. By mimicking the action of amylin-related pathways involved in fullness signalling, it helps reduce food intake and supports structured weight-management strategies.',
    image:
      'https://admin.apexpharma.io/uploads/products/18/Kliktide_a05e7e7467a2.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'appetite', 'satiation', 'gentle', 'new'],
    doses: [
      { label: '4mg', mg: '4', price: 79.99 },
    ],
  },

  /* ═══ STRENGTH & RECOVERY ═══ */
  {
    id: '8',
    sku: 'KLIK-157',
    compound: 'BPC-157',
    category: 'Strength & recovery',
    tagline: 'Tissue-focused repair signalling for nagging setbacks.',
    description:
      'BPC-157 is a pentadecapeptide derived from body protection compound research, investigated for potential effects on tissue healing, gastrointestinal protection, and inflammatory response.',
    image:
      'https://admin.apexpharma.io/uploads/products/8/Klik157_62fbea9efea6.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'inflammation', 'tissue'],
    doses: [
      { label: '10mg', mg: '10', price: 79.99 },
    ],
  },
  {
    id: '10',
    sku: 'KLIK500',
    compound: 'TB-500 (Thymosin Beta-4 fragment)',
    category: 'Strength & recovery',
    tagline: 'Cellular migration & repair — bounce back faster from training.',
    description:
      'TB-500 is a synthetic peptide fragment derived from Thymosin Beta-4, studied for its potential role in tissue repair, wound healing, and cellular regeneration. Research indicates it may influence inflammation modulation and angiogenesis.',
    image:
      'https://admin.apexpharma.io/uploads/products/10/klik500_ee38724fe327.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'training', 'repair'],
    doses: [
      { label: '10mg', mg: '10', price: 79.99 },
    ],
  },
  {
    id: '20',
    sku: 'WOLVERINE',
    compound: 'BPC-157 + TB-500',
    category: 'Strength & recovery',
    tagline: 'Synergistic repair stack — both angles covered in one protocol.',
    description:
      'A research compound combining BPC-157 and TB-500 peptides, studied for their synergistic potential in tissue repair, healing processes, and cellular protection mechanisms.',
    image:
      'https://admin.apexpharma.io/uploads/products/20/p9_080a60aa409866769d07_4b00e1eb2726.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'synergy', 'inflammation'],
    doses: [
      { label: '40mg', mg: '40', price: 119.99 },
    ],
  },

  /* ═══ CELLULAR REPAIR & ANTI-AGING ═══ */
  {
    id: '6',
    sku: 'KLIKGLOW',
    compound: 'BPC-157 + TB-500 + GHK-Cu',
    category: 'Cellular repair & anti-aging',
    tagline: 'Full regenerative blend — repair + recovery + collagen renewal.',
    description:
      'KLIKGLOW is a precision-engineered regenerative blend combining BPC-157, TB-500, and GHK-Cu, designed to support tissue repair, recovery, and cellular resilience.',
    image:
      'https://admin.apexpharma.io/uploads/products/6/KlikGlow_9541073eb8d1.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['skin_aging', 'recovery', 'collagen', 'full_stack'],
    doses: [
      { label: '70mg', mg: '70', price: 129.99 },
    ],
  },
  {
    id: '4',
    sku: 'KLIK-GHK',
    compound: 'GHK-Cu (copper peptide)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Copper peptide classic for skin firmness and visible renewal.',
    description:
      'GHK-Cu is a naturally occurring copper peptide known for its powerful ability to support skin regeneration, improve firmness, and promote a more youthful, radiant appearance.',
    image:
      'https://admin.apexpharma.io/uploads/products/4/Klik-GHK_7c99071e3415.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['skin_aging', 'collagen', 'visible'],
    doses: [
      { label: '100mg', mg: '100', price: 99.99 },
    ],
  },
  {
    id: '19',
    sku: 'KLIKMOTS-C',
    compound: 'MOTS-C (mitochondrial peptide)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Mitochondrial peptide for real, sustained cellular energy.',
    description:
      'MOTS-C is a mitochondrial-derived peptide involved in cellular energy regulation and metabolic signalling. It has been studied for its role in supporting glucose utilisation, energy balance, and metabolic resilience at the cellular level.',
    image:
      'https://admin.apexpharma.io/uploads/products/19/Klikmots-c_618d197e22cf.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['cellular', 'mitochondrial', 'metabolic_cell'],
    doses: [
      { label: '10mg', mg: '10', price: 89.99 },
    ],
  },
  {
    id: '7',
    sku: 'KLIKNAD+',
    compound: 'NAD+ (500mg pen)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Coenzyme support for energy systems, DNA repair, and aging.',
    description:
      'Nicotinamide Adenine Dinucleotide (NAD+) is a coenzyme investigated for its role in cellular metabolism, energy production, and aging research.',
    image:
      'https://admin.apexpharma.io/uploads/products/7/Image_1765185762662_caaa5d252020.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['cellular', 'nad', 'energy_systems'],
    doses: [
      { label: '500mg', mg: '500', price: 199.99 },
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
