export interface ProductContent {
  benefits: string[]
  whatToExpect: { week: string; description: string }[]
  idealFor: string[]
  howItWorks: string
}

const content: Record<string, ProductContent> = {
  '17': {
    benefits: [
      'Activates three metabolic pathways simultaneously (GLP-1, GIP, Glucagon)',
      'Significantly reduces appetite and food cravings within days',
      'Improves insulin sensitivity and glucose regulation',
      'Increases basal metabolic rate and energy expenditure',
      'Supports sustainable fat loss without muscle wasting',
      'Once-weekly dosing for maximum convenience',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Appetite noticeably decreases. Most users report feeling satisfied with smaller meals and reduced cravings, particularly for sugar and processed foods.' },
      { week: 'Week 3–4', description: 'Visible weight loss begins (typically 2–4kg). Energy levels stabilise. Bloating reduces as metabolic efficiency improves.' },
      { week: 'Week 5–8', description: 'Consistent weight loss of 1.5–2kg per week. Clothes fit differently. Blood glucose markers typically improve significantly.' },
      { week: 'Week 9–12', description: 'Compound effects accelerate. Most users report 10–15kg total loss by this point. Body composition visibly improved.' },
    ],
    idealFor: [
      'Those who have plateaued on other weight loss methods',
      'People with significant weight to lose (15kg+)',
      'Users wanting the most aggressive metabolic intervention available',
      'Those with insulin resistance or metabolic syndrome markers',
    ],
    howItWorks: 'Retatrutide is a triple-agonist compound that simultaneously activates GLP-1, GIP, and glucagon receptors. This three-pronged approach targets appetite suppression, insulin regulation, and direct fat oxidation — making it the most comprehensive metabolic compound currently available. Unlike single-pathway treatments, it addresses the root cause of metabolic dysfunction from multiple angles.',
  },
  '21': {
    benefits: [
      'Enhanced bioavailability formula for superior absorption',
      'Maximum metabolic response from triple-agonist pathway',
      'Designed for users with prior peptide experience',
      'Optimised formulation reduces injection site reactions',
      'Stronger and more sustained appetite suppression',
      'Pre-filled delivery system for precise dosing',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Rapid onset of appetite suppression due to enhanced bioavailability. Most experienced users notice stronger effects than standard Retatrutide within the first 48 hours.' },
      { week: 'Week 3–4', description: 'Accelerated fat loss — typically 3–5kg. Metabolic rate elevation is sustained throughout the week between doses.' },
      { week: 'Week 5–8', description: 'Significant body recomposition. Users switching from standard Reta often report breaking through previous plateaus.' },
      { week: 'Week 9–12', description: 'Maximum results phase. Strong metabolic adaptation with 12–18kg total loss common among compliant users.' },
    ],
    idealFor: [
      'Experienced users who have used standard Retatrutide before',
      'Those who plateaued on other GLP-1 compounds',
      'Users seeking the strongest possible metabolic response',
      'People comfortable with advanced peptide protocols',
    ],
    howItWorks: 'Retatrutide 2.0 uses an enhanced formulation with improved bioavailability, meaning more of the active compound reaches target receptors. The advanced delivery mechanism ensures sustained release throughout the dosing period, providing stronger and more consistent metabolic activation than the standard formulation.',
  },
  '2': {
    benefits: [
      'Dual-pathway activation (GLP-1 + GIP) for balanced weight management',
      'Clinically proven in large-scale trials (SURMOUNT program)',
      'Reduces appetite without the harshness of triple-agonist compounds',
      'Improves insulin sensitivity and HbA1c markers',
      'Steady, predictable weight loss trajectory',
      'Well-tolerated with manageable side effect profile',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Gradual appetite reduction begins. Most users feel comfortably full after smaller portions. Mild nausea possible but typically resolves within days.' },
      { week: 'Week 3–4', description: 'Appetite control becomes consistent. Weight loss of 2–3kg typical. Food noise significantly decreases — less thinking about food between meals.' },
      { week: 'Week 5–8', description: 'Steady loss of 1–1.5kg per week. Energy levels improve as metabolic function optimises. Cravings for sugary/processed foods substantially reduced.' },
      { week: 'Week 9–12', description: 'Cumulative loss of 8–12kg for most users. Improved body composition visible. Metabolic markers (fasting glucose, HbA1c) typically improved.' },
    ],
    idealFor: [
      'First-time peptide users wanting a proven, balanced approach',
      'Those with 10–25kg to lose',
      'People who prefer a gentler start with room to increase dose',
      'Users with type 2 diabetes or prediabetes markers',
    ],
    howItWorks: 'Tirzepatide activates both GLP-1 and GIP receptors simultaneously. GLP-1 reduces appetite and slows gastric emptying, while GIP enhances insulin secretion and improves fat metabolism. Together, they create a synergistic effect that produces greater weight loss than either pathway alone, with a more balanced side effect profile than triple-agonist compounds.',
  },
  '18': {
    benefits: [
      'Works through satiety signalling — feel genuinely full, not deprived',
      'Gentlest entry point for weight management peptides',
      'Minimal side effects compared to GLP-1 agonists',
      'Can be combined with other compounds for enhanced effect',
      'Natural-feeling appetite regulation',
      'Ideal bridge for those not ready for stronger compounds',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Subtle shift in satiety signals. Meals feel more satisfying. You may notice you stop eating sooner without conscious effort.' },
      { week: 'Week 3–4', description: 'Consistent fullness after meals. Portion sizes naturally decrease. 1–2kg weight loss typical.' },
      { week: 'Week 5–8', description: 'New eating patterns feel habitual. Steady loss of 0.5–1kg per week. Snacking urges significantly reduced.' },
      { week: 'Week 9–12', description: 'Sustainable habits established. Total loss of 4–8kg. Body composition gradually improving.' },
    ],
    idealFor: [
      'Those who struggle primarily with hunger and portion control',
      'Users wanting the gentlest possible introduction to peptide therapy',
      'People who have had side effects from stronger GLP-1 compounds',
      'Those who prefer a gradual, sustainable approach over rapid results',
    ],
    howItWorks: 'Cagrilintide is a long-acting amylin analogue that amplifies your body\'s natural fullness signals. Rather than suppressing appetite artificially, it enhances the signalling that tells your brain "I\'ve had enough." This creates a more natural, comfortable relationship with food — you eat less because you genuinely feel satisfied, not because hunger is being chemically blocked.',
  },
  '8': {
    benefits: [
      'Most extensively studied tissue-repair peptide',
      'Accelerates healing in tendons, ligaments, and muscle',
      'Reduces inflammation at the injury site',
      'Promotes angiogenesis (new blood vessel formation)',
      'Supports gut lining repair and digestive health',
      'Neuroprotective properties documented in research',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Inflammation at injury sites begins to reduce. Many users report decreased pain and improved mobility within the first week.' },
      { week: 'Week 3–4', description: 'Active healing acceleration. Chronic injuries that have lingered for months often show significant improvement. Joint stiffness decreases.' },
      { week: 'Week 5–8', description: 'Structural repair continues. Range of motion improves. Many users can resume activities that were previously painful.' },
      { week: 'Week 9–12', description: 'Near-complete resolution for most soft tissue injuries. Ongoing tissue remodelling and strengthening.' },
    ],
    idealFor: [
      'Those with chronic tendon or ligament injuries',
      'People recovering from sports injuries or surgery',
      'Users with gut issues (leaky gut, IBS symptoms)',
      'Anyone with nagging pain that hasn\'t responded to conventional treatment',
    ],
    howItWorks: 'BPC-157 (Body Protection Compound) is a pentadecapeptide that promotes tissue repair through multiple mechanisms: it increases growth factor expression, stimulates new blood vessel formation, modulates nitric oxide systems, and accelerates fibroblast activity. It directs the body\'s healing resources to damaged tissue with remarkable specificity.',
  },
  '10': {
    benefits: [
      'Promotes cellular migration to damaged areas',
      'Reduces recovery time between training sessions',
      'Modulates inflammatory response systemically',
      'Supports angiogenesis for improved tissue nutrition',
      'Enhances flexibility and reduces stiffness',
      'Complementary to BPC-157 for comprehensive repair',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Reduced post-training soreness. Faster bounce-back between sessions. General feeling of reduced stiffness, particularly in the mornings.' },
      { week: 'Week 3–4', description: 'Noticeable improvement in recovery capacity. Training volume can typically increase. Chronic aches begin resolving.' },
      { week: 'Week 5–8', description: 'Systemic recovery significantly improved. Athletes often report being able to train harder with less downtime.' },
      { week: 'Week 9–12', description: 'Full recovery optimisation achieved. Baseline inflammation reduced. Ongoing tissue maintenance and repair.' },
    ],
    idealFor: [
      'Athletes dealing with overtraining or high training loads',
      'Those wanting faster recovery between workouts',
      'People with chronic muscle tightness or stiffness',
      'Anyone seeking systemic (whole-body) recovery support',
    ],
    howItWorks: 'TB-500 is a synthetic fragment of Thymosin Beta-4, a protein that plays a key role in tissue repair throughout the body. It promotes cell migration — guiding repair cells to damaged areas — while modulating inflammation and supporting the formation of new blood vessels. Unlike targeted treatments, TB-500 works systemically to improve overall recovery capacity.',
  },
  '20': {
    benefits: [
      'Combines localised and systemic repair in one protocol',
      'Synergistic effect — greater than either compound alone',
      'Addresses both acute injuries and chronic recovery needs',
      'Comprehensive anti-inflammatory action',
      'Accelerated tissue remodelling and strengthening',
      'Single protocol simplicity — no need to manage two separate compounds',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Rapid reduction in pain and inflammation. The dual-compound approach means both local and systemic healing begins simultaneously.' },
      { week: 'Week 3–4', description: 'Significant improvement in mobility and pain levels. Stubborn injuries that haven\'t responded to single compounds often break through.' },
      { week: 'Week 5–8', description: 'Active tissue remodelling. Strength returns to previously injured areas. Training can typically resume at increased intensity.' },
      { week: 'Week 9–12', description: 'Near-complete resolution for most injuries. Ongoing structural strengthening and prevention of re-injury.' },
    ],
    idealFor: [
      'Those with stubborn injuries that haven\'t responded to single compounds',
      'Users with multiple injury sites needing simultaneous treatment',
      'Athletes under high training loads needing comprehensive support',
      'Anyone wanting the most thorough repair protocol available',
    ],
    howItWorks: 'The Wolverine stack combines BPC-157\'s targeted tissue repair with TB-500\'s systemic recovery activation. BPC-157 directs healing resources to specific injury sites while TB-500 promotes cell migration and reduces whole-body inflammation. Together, they create overlapping repair pathways that address injuries from both local and systemic angles simultaneously.',
  },
  '6': {
    benefits: [
      'Triple-compound regenerative formula (BPC-157 + TB-500 + GHK-Cu)',
      'Supports tissue repair AND visible skin improvement',
      'Stimulates collagen and elastin synthesis',
      'Improves skin texture, firmness, and hydration',
      'Accelerates wound healing and scar reduction',
      'All-in-one protocol — look better AND recover faster',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Internal healing processes activate. Skin hydration begins improving. Any existing injuries start showing reduced inflammation.' },
      { week: 'Week 3–4', description: 'Visible improvement in skin texture and tone. Fine lines appear softer. Recovery from exercise noticeably faster.' },
      { week: 'Week 5–8', description: 'Significant skin firmness improvement. Collagen synthesis in full effect. Overall complexion appears brighter and more youthful.' },
      { week: 'Week 9–12', description: 'Full regenerative effect. Skin looks visibly younger. Tissue repair complete. Ongoing collagen renewal maintains results.' },
    ],
    idealFor: [
      'Those wanting visible anti-aging results alongside injury recovery',
      'Users seeking an all-in-one regenerative protocol',
      'People concerned with skin quality, elasticity, and firmness',
      'Anyone wanting to look and feel younger simultaneously',
    ],
    howItWorks: 'Glow combines three complementary peptides: BPC-157 for targeted tissue repair, TB-500 for systemic recovery, and GHK-Cu for collagen stimulation and skin renewal. The copper peptide (GHK-Cu) specifically activates genes responsible for collagen production, wound healing, and antioxidant protection — while the repair peptides ensure internal recovery matches the visible external improvement.',
  },
  '4': {
    benefits: [
      'Directly stimulates collagen and elastin production',
      'Visible improvement in skin firmness and texture',
      'Promotes wound healing and scar reduction',
      'Powerful antioxidant protection at cellular level',
      'Improves hair growth density and thickness',
      'Remodels damaged extracellular matrix',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Cellular-level changes begin. Skin may feel slightly more hydrated. Collagen synthesis pathways activate.' },
      { week: 'Week 3–4', description: 'Visible improvement in skin texture. Complexion appears brighter. Fine lines begin softening. Skin feels firmer to touch.' },
      { week: 'Week 5–8', description: 'Significant improvement in skin elasticity and tone. Scars and marks begin fading. Hair may appear thicker.' },
      { week: 'Week 9–12', description: 'Full collagen renewal effect visible. Skin looks noticeably younger. Extracellular matrix quality significantly improved.' },
    ],
    idealFor: [
      'Those wanting visible anti-aging results for skin',
      'People concerned with skin laxity, fine lines, or texture',
      'Users recovering from scarring or skin damage',
      'Anyone seeking the most proven skin-rejuvenation peptide',
    ],
    howItWorks: 'GHK-Cu is a naturally occurring copper peptide that activates over 4,000 genes involved in tissue remodelling. It stimulates collagen I, III, and V production, increases elastin synthesis, promotes glycosaminoglycan formation, and activates antioxidant pathways. Essentially, it signals your cells to behave like younger cells — producing the structural proteins that keep skin firm, smooth, and resilient.',
  },
  '19': {
    benefits: [
      'Genuine cellular energy — not a stimulant or caffeine alternative',
      'Improves mitochondrial function and efficiency',
      'Enhances glucose utilisation and metabolic flexibility',
      'Supports exercise performance and endurance',
      'May protect against age-related metabolic decline',
      'Anti-inflammatory properties at cellular level',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Subtle improvement in baseline energy. Less reliance on caffeine. Afternoon energy dips become less severe.' },
      { week: 'Week 3–4', description: 'Consistent all-day energy. Exercise performance improves. Mental clarity and focus noticeably better.' },
      { week: 'Week 5–8', description: 'Metabolic flexibility improves — body burns fuel more efficiently. Endurance capacity increases. Recovery from exercise faster.' },
      { week: 'Week 9–12', description: 'Full mitochondrial optimisation. Sustained energy without crashes. Metabolic markers typically improved.' },
    ],
    idealFor: [
      'Those experiencing chronic fatigue not explained by other conditions',
      'People wanting genuine energy improvement without stimulants',
      'Users concerned about age-related metabolic decline',
      'Athletes seeking improved endurance and metabolic efficiency',
    ],
    howItWorks: 'MOTS-C is a mitochondrial-derived peptide that activates AMPK — the master metabolic regulator. It improves how efficiently your mitochondria produce energy (ATP), enhances glucose uptake in muscle tissue, and promotes metabolic flexibility. Unlike stimulants that mask fatigue, MOTS-C addresses the root cause by optimising the cellular machinery that produces your energy.',
  },
  '7': {
    benefits: [
      'Central coenzyme for 500+ cellular reactions',
      'Supports DNA repair and cellular maintenance',
      'Improves energy production at mitochondrial level',
      'May slow biological aging markers',
      'Supports cognitive function and mental clarity',
      'Enhances recovery capacity and resilience',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Improved sleep quality and mental clarity are often the first noticeable effects. Subtle increase in baseline energy.' },
      { week: 'Week 3–4', description: 'Energy levels consistently improved. Cognitive function sharper. Recovery from physical activity noticeably faster.' },
      { week: 'Week 5–8', description: 'Full NAD+ restoration effects. Skin appearance improved. Exercise capacity increased. "Feeling younger" commonly reported.' },
      { week: 'Week 9–12', description: 'Sustained anti-aging benefits. Biological age markers may improve. Ongoing cellular maintenance and DNA repair support.' },
    ],
    idealFor: [
      'Those over 35 experiencing age-related energy decline',
      'People wanting foundational anti-aging support',
      'Users concerned with cognitive decline or brain fog',
      'Anyone seeking to optimise cellular health and longevity',
    ],
    howItWorks: 'NAD+ (Nicotinamide Adenine Dinucleotide) is a coenzyme present in every cell, essential for energy production, DNA repair, and cellular signalling. Levels decline approximately 50% between ages 40–60. Direct supplementation restores this foundational molecule, reactivating sirtuins (longevity genes), improving mitochondrial function, and supporting the cellular maintenance processes that keep you biologically young.',
  },
}

export function getProductContent(id: string): ProductContent {
  return content[id] || {
    benefits: [
      'Pharmaceutical-grade purity verified at 98%+',
      'Third-party independently lab tested',
      'Full certificate of analysis included',
      'Batch-traceable for complete transparency',
      'Ships within 24 hours from UK facility',
      'Detailed protocol guide included',
    ],
    whatToExpect: [
      { week: 'Week 1–2', description: 'Initial compound uptake. Subtle changes begin as the peptide integrates with biological pathways.' },
      { week: 'Week 3–4', description: 'Noticeable effects begin. Most users report measurable changes by this point.' },
      { week: 'Week 5–8', description: 'Full efficacy window. Primary benefits become clearly apparent.' },
      { week: 'Week 9–12', description: 'Optimal results achieved. Sustained benefits with continued protocol adherence.' },
    ],
    idealFor: [
      'Those seeking targeted, research-backed health optimisation',
      'Users wanting verified-purity pharmaceutical-grade compounds',
      'People who value transparency and third-party testing',
    ],
    howItWorks: 'This compound works through specific biological pathways to deliver targeted results. Each batch is independently verified for purity and potency to ensure consistent, reliable outcomes.',
  }
}
