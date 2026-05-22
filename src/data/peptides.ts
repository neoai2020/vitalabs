/** Full Apex Pharma supply catalog — 21 SKUs across 5 pillars. */
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
      'Retaklik (Retatrutide) is a triple agonist targeting the GLP-1, GIP, and glucagon receptors, designed to support effortless weight control and improve glucose balance. By activating these key metabolic pathways, it recalibrates appetite, enhances energy output, and boosts overall metabolic efficiency for a smoother, more empowered transformation experience.',
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
      'KLIKJARO (tirzepatide) is a dual agonist targeting the GLP-1 and GIP receptors, formulated to support effective weight management and improved glucose regulation. By activating these complementary metabolic pathways, it helps modulate appetite, enhance insulin sensitivity, and optimize energy utilization — delivering a balanced, controlled, and sustainable metabolic support experience.',
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
      'KLIKTIDE is a long-acting amylin analogue developed to support appetite regulation and satiety control. By mimicking the action of amylin-related pathways involved in fullness signalling, it helps reduce food intake and supports structured weight-management strategies. Its mechanism complements metabolic regulation rather than growth or performance pathways, making it well suited for individuals focused on appetite control and body-composition management.',
    image:
      'https://admin.apexpharma.io/uploads/products/18/Kliktide_a05e7e7467a2.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'appetite', 'satiation', 'gentle', 'new'],
    doses: [
      { label: '4mg', mg: '4', price: 79.99 },
    ],
  },
  {
    id: '3',
    sku: 'KLIKZEMPIC',
    compound: 'Semaglutide (GLP-1 agonist)',
    category: 'Weight management',
    tagline: 'GLP-1 agonist for appetite regulation and glycemic balance.',
    description:
      'KLIKZEMPIC (semaglutide) is a GLP-1 receptor agonist developed to support appetite regulation and glycemic balance. By influencing satiety signaling and metabolic control pathways, it helps reduce caloric intake, stabilize blood glucose levels, and improve metabolic efficiency — offering a refined and controlled approach to weight management support.',
    image:
      'https://admin.apexpharma.io/uploads/products/3/Image_1765185765257_a53541c878b8.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'glp', 'appetite', 'semaglutide', 'glucose'],
    doses: [
      { label: '2mg', mg: '2', price: 99.99 },
    ],
  },
  {
    id: '1',
    sku: 'KLIKFRAG',
    compound: 'HGH Fragment 176-191',
    category: 'Weight management',
    tagline: 'Targeted fat metabolism without growth-related effects.',
    description:
      'KLIKFRAG is a specialised peptide derived from the fat-burning region of the human growth hormone molecule — without the growth-related effects of full HGH. This fragment is designed specifically to target stubborn fat, improve metabolism, and support body composition goals, making it a popular choice for individuals focused on weight management and lean conditioning.',
    image:
      'https://admin.apexpharma.io/uploads/products/1/Image_1765185755538_557eabbc30a4.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'hgh', 'fat-loss', 'lean', 'body-composition'],
    doses: [
      { label: '5mg', mg: '5', price: 79.99 },
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
    id: '9',
    sku: 'KLIK-TB157',
    compound: 'BPC-157 + TB-500 (10mg)',
    category: 'Strength & recovery',
    tagline: 'Combined repair peptides — synergistic healing in a single pen.',
    description:
      'A research compound combining BPC-157 and TB-500 peptides, studied for their synergistic potential in tissue repair, healing processes, and cellular protection mechanisms.',
    image:
      'https://admin.apexpharma.io/uploads/products/9/Image_1765185741367_a3344544890e.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'synergy', 'inflammation', 'combined'],
    doses: [
      { label: '10mg', mg: '10', price: 79.99 },
    ],
  },
  {
    id: '20',
    sku: 'WOLVERINE',
    compound: 'BPC-157 + TB-500 (40mg)',
    category: 'Strength & recovery',
    tagline: 'High-dose synergistic repair stack — maximum recovery support.',
    description:
      'A research compound combining BPC-157 and TB-500 peptides, studied for their synergistic potential in tissue repair, healing processes, and cellular protection mechanisms. Supplied in pre-filled research devices for controlled laboratory and R&D use only. Delivered in sealed format to support formulation assessment, compound stability testing, and delivery system evaluation.',
    image:
      'https://admin.apexpharma.io/uploads/products/20/p9_080a60aa409866769d07_4b00e1eb2726.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['recovery', 'injury', 'synergy', 'inflammation', 'high-dose'],
    doses: [
      { label: '40mg', mg: '40', price: 119.99 },
    ],
  },
  {
    id: '11',
    sku: 'KLIK51MQ',
    compound: '5-Amino-1MQ (NNMT inhibitor)',
    category: 'Strength & recovery',
    tagline: 'Increase energy expenditure and support fat reduction at the cellular level.',
    description:
      'KLIK-51MQ features 5-Amino-1MQ, a powerful NNMT inhibitor known for its ability to increase energy expenditure at the cellular level. By reducing NNMT activity, this peptide helps your body burn more calories naturally — supporting fat loss, enhanced energy, and improved metabolic performance. Designed for individuals wanting a science-backed approach to weight management and metabolic enhancement.',
    image:
      'https://admin.apexpharma.io/uploads/products/11/Image_1765185749172_612e3c1417f1.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['metabolic', 'energy', 'fat-loss', 'nnmt', 'performance'],
    doses: [
      { label: '100mg', mg: '100', price: 89.99 },
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
      'KLIKGLOW is a precision-engineered regenerative blend combining BPC-157, TB-500, and GHK-Cu, designed to support tissue repair, recovery, and cellular resilience. By promoting repair signaling, collagen synthesis, and cellular regeneration pathways, it helps accelerate recovery, enhance structural integrity, and support overall physical rejuvenation.',
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
      'GHK-Cu is a naturally occurring copper peptide known for its powerful ability to support skin regeneration, improve firmness, and promote a more youthful, radiant appearance. Our enhanced formulation helps restore skin vitality from the inside out.',
    image:
      'https://admin.apexpharma.io/uploads/products/4/Klik-GHK_7c99071e3415.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['skin_aging', 'collagen', 'visible'],
    doses: [
      { label: '100mg', mg: '100', price: 99.99 },
    ],
  },
  {
    id: '5',
    sku: 'KLIKCAR',
    compound: 'AICAR (AMPK activator)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Activate your cellular energy switch for endurance and fat metabolism.',
    description:
      'KLIKCAR contains AICAR, a peptide known for its ability to activate AMPK — one of the body\'s primary metabolic regulators. Often referred to as the "cellular energy switch," AMPK supports endurance, fat metabolism, and overall energy balance. KLIKCAR is ideal for individuals wanting enhanced performance, better stamina, and improved metabolic function.',
    image:
      'https://admin.apexpharma.io/uploads/products/5/Image_1765185743499_e1eeb039d8ec.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['cellular', 'ampk', 'endurance', 'energy', 'metabolism'],
    doses: [
      { label: '50mg', mg: '50', price: 109.99 },
    ],
  },
  {
    id: '19',
    sku: 'KLIKMOTS-C',
    compound: 'MOTS-C (mitochondrial peptide)',
    category: 'Cellular repair & anti-aging',
    tagline: 'Mitochondrial peptide for real, sustained cellular energy.',
    description:
      'MOTS-C is a mitochondrial-derived peptide involved in cellular energy regulation and metabolic signalling. It has been studied for its role in supporting glucose utilisation, energy balance, and metabolic resilience at the cellular level. By influencing pathways linked to mitochondrial function, MOTS-C is associated with improved metabolic efficiency.',
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

  /* ═══ GROWTH HORMONE RESEARCH ═══ */
  {
    id: '12',
    sku: 'KLIKCJC-1295',
    compound: 'CJC-1295 (GHRH analogue)',
    category: 'Growth hormone research',
    tagline: 'Extended half-life GHRH analog for sustained growth hormone support.',
    description:
      'CJC-1295 is a growth hormone-releasing hormone analog with an extended half-life, studied for sustained effects on growth hormone secretion patterns. Its prolonged action makes it suitable for research into consistent GH elevation without frequent dosing.',
    image:
      'https://admin.apexpharma.io/uploads/products/15/Image_1765185772166_5e2c3b2b80cd.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['growth-hormone', 'ghrh', 'sustained', 'secretion'],
    doses: [
      { label: '5mg', mg: '5', price: 79.99 },
    ],
  },
  {
    id: '13',
    sku: 'KLIKGHRP-6',
    compound: 'GHRP-6 (growth hormone releasing peptide)',
    category: 'Growth hormone research',
    tagline: 'GH secretion support with metabolic influence.',
    description:
      'GHRP-6 is a growth hormone-releasing peptide studied for its effects on GH secretion and potential metabolic influences in research models. It stimulates the pituitary gland to release growth hormone, making it a valuable tool for GH-related research.',
    image:
      'https://admin.apexpharma.io/uploads/products/14/Image_1765185747363_5b17ee11a816.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['growth-hormone', 'ghrp', 'pituitary', 'metabolic'],
    doses: [
      { label: '10mg', mg: '10', price: 79.99 },
    ],
  },
  {
    id: '14',
    sku: 'KLIKPAM',
    compound: 'Ipamorelin (selective GH secretagogue)',
    category: 'Growth hormone research',
    tagline: 'Selective GH release without cortisol or prolactin interference.',
    description:
      'Ipamorelin is a growth hormone secretagogue studied for its selective effects on GH release without affecting cortisol or prolactin levels in research settings. Its targeted action makes it one of the cleanest GH-releasing peptides available for research.',
    image:
      'https://admin.apexpharma.io/uploads/products/14/Image_1765185747363_5b17ee11a816.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['growth-hormone', 'selective', 'clean', 'secretagogue'],
    doses: [
      { label: '10mg', mg: '10', price: 89.99 },
    ],
  },
  {
    id: '15',
    sku: 'KLIKSERM',
    compound: 'Sermorelin (GHRH analog)',
    category: 'Growth hormone research',
    tagline: 'Natural GH secretion support via pituitary stimulation.',
    description:
      'Sermorelin is a growth hormone-releasing hormone (GHRH) analog investigated for its effects on pituitary function and natural growth hormone secretion patterns in research models. It supports the body\'s own GH production pathways.',
    image:
      'https://admin.apexpharma.io/uploads/products/15/Image_1765185772166_5e2c3b2b80cd.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['growth-hormone', 'ghrh', 'pituitary', 'natural'],
    doses: [
      { label: '5mg', mg: '5', price: 79.99 },
    ],
  },

  /* ═══ MELANOCORTIN RESEARCH ═══ */
  {
    id: '16',
    sku: 'KLIKMEL II',
    compound: 'Melanotan II',
    category: 'Melanocortin research',
    tagline: 'Melanocortin receptor research — pigmentation and physiological response.',
    description:
      'Melanotan II is a synthetic analog of alpha-melanocyte stimulating hormone, researched for its effects on melanocortin receptors and various physiological responses including skin pigmentation pathways.',
    image:
      'https://admin.apexpharma.io/uploads/products/19/Klikmots-c_618d197e22cf.jpg',
    catalogUrl: PRODUCTS_BASE,
    tags: ['melanocortin', 'pigmentation', 'msh', 'receptor'],
    doses: [
      { label: '10mg', mg: '10', price: 69.99 },
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
