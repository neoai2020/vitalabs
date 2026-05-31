/**
 * Server-side ad-type catalog. The operator picks a type + fills a few
 * structured fields in the UI; this module turns that into a hyper-detailed,
 * shot-by-shot prompt for the underlying generator.
 *
 * THE PROMPTS NEVER LEAVE THE BACKEND. The frontend only knows ad-type ids
 * and the field schema — never the prompt text. This is deliberate: prompts
 * are proprietary craft and we want full control over the quality bar.
 *
 * Each ad type also pins:
 *   - `kind`           : 'image' | 'video'
 *   - `model`          : the specific generator the type was tuned for
 *   - `defaultAspect`  : sensible default placement
 *   - `defaultDuration`: video clip length when not overridden
 *
 * Adding a new ad type: extend AD_TYPE_IDS, add a prompt builder + config
 * entry, and mirror the field schema in the frontend's creativeModels.ts.
 */

export type Brand = 'vitalabs' | 'peptiva'
export type CreativeKind = 'image' | 'video'
export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

export type AdTypeId =
  | 'ugc_selfie'
  | 'drama_transform'
  | 'lifestyle_moment'
  | 'hero_studio'
  | 'clinical_authority'
  | 'cinema_motion'
  | 'energy_reveal'
  | 'premium_closeup'

export interface AdTypeConfig {
  /** Free-form field bag the UI submits — we type-check per ad-type below. */
  [key: string]: string | number | boolean | null | undefined
}

export interface ProductContext {
  compound: string
  tagline: string | null
  description: string | null
  benefits: string[] | null
  image_url: string | null
}

export interface BuiltPrompt {
  /** Final prompt sent to the generator. */
  prompt: string
  /** Generator-specific model identifier (e.g. 'higgsfield-dop', 'kling3'). */
  model_id: string
  /** Hint for ad-copy generation. */
  angle: string
}

interface AdTypeEntry {
  kind: CreativeKind
  /** Underlying generator id. For image: 'gemini-nano-banana'. For video:
   *  the verified Higgsfield model. */
  model: string
  defaultAspect: AspectRatio
  defaultDuration?: number
  build: (config: AdTypeConfig, product: ProductContext, brand: Brand) => BuiltPrompt
}

const BRAND_NAMES: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}

/* ────────────────────────────────────────────────────────────────────────
 * Lookup tables for human-readable descriptors. We keep the actual text
 * here (rather than relying on the option ids) so frontend strings can
 * stay short while prompts stay vivid.
 * ──────────────────────────────────────────────────────────────────────── */

const AGE_DESC: Record<string, string> = {
  '20s': 'a 26-year-old',
  '30s': 'a 34-year-old',
  '40s': 'a 42-year-old',
  '50plus': 'a 56-year-old',
}

const ETHNICITY_DESC: Record<string, string> = {
  caucasian: 'Caucasian',
  east_asian: 'East Asian',
  south_asian: 'South Asian',
  black: 'Black',
  hispanic: 'Hispanic / Latina',
  middle_eastern: 'Middle Eastern',
  mixed: 'mixed-race',
}

const GENDER_DESC: Record<string, string> = {
  woman: 'woman',
  man: 'man',
}

const UGC_SETTING: Record<string, { name: string; details: string; light: string }> = {
  bedroom: {
    name: 'their bedroom',
    details: 'an unmade off-white linen bed visible behind, a soft pillow indent, a small ceramic mug on the nightstand, a sliver of morning sunlight on the wall',
    light: 'soft east-facing window light from camera-left at 4200K, slightly warm, single source',
  },
  bathroom: {
    name: 'their bathroom mirror',
    details: 'a brushed-nickel tap, a folded oatmeal hand towel, a soft beige tile wall, faint condensation on the glass implying a recent shower',
    light: 'soft north-facing window light from above-left at 5000K, diffused by frosted glass, single source',
  },
  kitchen: {
    name: 'their kitchen',
    details: 'a wooden countertop, a single ceramic mug of coffee, soft morning light pooling on the surface, a sprig of herbs in a small glass',
    light: 'soft window light from camera-right at 4400K, warm bounce off the wood, single source',
  },
  living_room: {
    name: 'their living room sofa',
    details: 'a beige bouclé sofa, a knitted throw, a single houseplant in the background, a paperback face-down beside them',
    light: 'soft afternoon window light from camera-left at 4500K, gentle ambient fill',
  },
  gym: {
    name: 'their home gym corner',
    details: 'a rolled-out yoga mat visible, a single kettlebell, a water bottle, a hint of mirror reflection',
    light: 'soft window light from camera-right at 5200K, brighter and cooler than morning',
  },
  car: {
    name: 'the driver\'s seat of their parked car',
    details: 'a hint of the steering wheel at the bottom of frame, leather seat, soft daylight through the windshield, faint dashboard texture',
    light: 'soft overhead daylight at 5800K, blue-sky bounce, slightly cool',
  },
  outdoor: {
    name: 'a quiet outdoor spot — a park bench or by their front door',
    details: 'soft greenery slightly out of focus behind them, faint dappled light, no other people in frame',
    light: 'overcast daylight at 6200K, perfectly diffused, no harsh shadows',
  },
}

const UGC_MOOD: Record<string, { expression: string; angle_hint: string }> = {
  excited: {
    expression: 'a small surprised smile, eyebrows slightly raised, eyes wide and engaged',
    angle_hint: 'unexpected positive result moment',
  },
  casual: {
    expression: 'a relaxed half-smile, eyes calm, body language at ease',
    angle_hint: 'this just fits my life',
  },
  honest: {
    expression: 'a thoughtful, measured expression — slight furrow between the brows, a soft closed-lip smile',
    angle_hint: 'honest skeptic-turned-believer',
  },
  surprised: {
    expression: 'eyebrows lifted, eyes wide, lips slightly parted in a small "huh!" expression',
    angle_hint: 'the I-can\'t-believe-this-worked moment',
  },
}

const DRAMA_SCENARIO: Record<string, { before: string; after: string }> = {
  low_energy: {
    before: 'slumped at the edge of a bed at dawn, body language heavy, head in hands, the room desaturated and cool',
    after: 'standing at a sunlit window with a settled, awake posture, shoulders back, a soft warm light catching their face',
  },
  poor_sleep: {
    before: 'lying awake, eyes open, staring at the ceiling at 3am, blue-grey moonlit room, exhaustion visible',
    after: 'waking naturally to a sunlit room, a soft stretch, the kind of rested calm that reads as a full night\'s sleep',
  },
  weight_struggle: {
    before: 'sitting on the edge of a sofa, soft frustration visible, a discarded measuring tape nearby, cool flat indoor light',
    after: 'standing tall in athletic wear in a sunlit kitchen, confident posture, no measuring tape — just composed presence',
  },
  brain_fog: {
    before: 'at a desk under a cold lamp, head propped on one hand, staring at a laptop, the screen glow harsh and clinical',
    after: 'at the same desk in golden afternoon window light, sat upright, focused, a hot tea, calm engaged eyes',
  },
  inflammation: {
    before: 'sitting carefully, one hand resting on a knee, visible tension in the posture, cool desaturated palette',
    after: 'walking comfortably through a sunlit hallway, posture loose and easy, no visible guarding',
  },
}

const DRAMA_MOOD: Record<string, string> = {
  dramatic: 'high-contrast cinema mode — deep shadows, bold key-fill ratio of 5:1, ARRI Alexa look with anamorphic flares',
  hopeful: 'soft cinematic warmth — gentle 3:1 key-fill, lifted blacks, milky highlights, an Apple TV+ aesthetic',
  clean: 'minimalist editorial — even soft light, low contrast, 2:1 key-fill ratio, Aesop or Le Labo catalogue aesthetic',
  editorial: 'fashion-editorial — warm rim light, controlled deep shadows, magazine-cover composition, Vogue Beauty aesthetic',
}

const LIFESTYLE_MOMENT: Record<string, string> = {
  morning_routine: '8:30am morning routine — soft east window light, a half-drunk mug of coffee, a folded linen towel',
  post_workout: 'immediately after a workout — a rolled yoga mat, a glass of cold water with condensation, soft daytime light',
  evening_wind_down: 'unwinding at 9pm — a single warm lamp, a half-finished paperback, soft amber light',
  coffee_break: 'a midday pause — fresh coffee, a notebook open, soft natural daylight, calm focused energy',
  commute: 'getting ready to head out — a tote bag, keys, a coat slung over a chair, brisk morning light',
}

const LIFESTYLE_SETTING: Record<string, string> = {
  kitchen: 'a modern UK kitchen counter — oak wood, brushed brass tap, a single ceramic mug, herbs in a small glass',
  bathroom: 'a sunlit bathroom counter — travertine surface, brushed nickel tap, a folded oatmeal towel, eucalyptus sprig',
  bedroom: 'a calm bedroom nightstand — linen bedding, a paperback, a small ceramic dish, soft window light',
  office: 'a minimal home office desk — light oak, a notebook, reading glasses, a single houseplant',
  cafe: 'a quiet corner of a sunlit cafe — marble tabletop, a flat white, a notebook, soft window light from the side',
  outdoor: 'a sunlit garden table — pale wood, a glass jug of water, dappled light through leaves',
}

const HERO_MOOD: Record<string, string> = {
  premium_dark: 'rich dramatic darkness — black walnut or charcoal slate background, single hard rim light from behind-right, deep blacks, a dramatic soft beam catching the product profile',
  clean_white: 'pristine editorial white — seamless white paper background, a soft top-key from a 1.5m softbox, gentle floor shadow grounding the product, calm and confident',
  warm_organic: 'warm organic surface — unbleached linen or raw oak background, soft window light from camera-left at 4200K, a faint warm shadow, premium UK wellness aesthetic',
  cold_clinical: 'cool clinical authority — pale grey laminate background, single soft top-key, slight blue cast at 5800K, the product reads as scientific and precise',
  luxe_marble: 'polished travertine or honed marble — soft directional sidelight at 4800K, gentle reflection in the stone, premium spa-luxury aesthetic',
}

const CINEMA_MOVE: Record<string, string> = {
  push_in: 'slow cinematic push-in over the full duration, camera starts framing the full product and ends in a tight macro on the label, smooth motorized dolly motion, no shake',
  orbit: 'a slow horizontal arc around the product, 30-degree sweep, locked on the product, camera moves left-to-right at a steady pace, gimbal-smooth',
  pull_back: 'a slow pull-back reveal, camera starts on a macro detail of the product and pulls back to show it on its surface, smooth dolly motion',
  lateral: 'a smooth lateral dolly slide from right to left, camera locked on the product, parallax revealing the depth of the surface',
}

const CINEMA_MOOD: Record<string, string> = {
  warm_premium: 'warm cinematic premium — golden hour ambient at 3500K, soft directional rim, deep but lifted blacks, ARRI Alexa look',
  cool_clinical: 'cool scientific authority — pale 5800K ambient, single hard top-key, clean micro-contrast, no flares',
  dramatic_dark: 'high-contrast dramatic — deep blacks, single hard rim from camera-right, milky soft falloff, anamorphic flare on the rim',
  golden_hour: 'late afternoon warmth — 3200K low directional light, long soft shadows, golden particulate in the air, Apple TV+ commercial aesthetic',
}

const ENERGY_PACE: Record<string, string> = {
  gentle_build: 'a gradual energy build — starts calm and steady, motion gently accelerating across the clip',
  fast_cut: 'rhythmic punchy pacing — sharp transitions implied through quick reframes, locked to an implicit electronic pulse',
  pulse_drop: 'a slow burn into a sudden energetic moment — first 60% steady, then a punchy motion shift at the drop',
}

const ENERGY_MOOD: Record<string, string> = {
  vibrant: 'saturated vibrant palette — punchy oranges and electric blues, glossy product highlights, energetic feel',
  cool_blue: 'cool electric energy — deep blues, chrome highlights, athletic energy aesthetic',
  warm_sunset: 'sunset warmth — amber and coral, soft golden particulate, warm punchy energy',
  clean_white: 'crisp clean energy — bright whites, soft cyan accent, modern sportswear advertising aesthetic',
}

const PREMIUM_FOCUS: Record<string, string> = {
  label_detail: 'tight macro on the product label, slow lateral move revealing the typography, fine paper texture visible',
  liquid_pour: 'slow-motion close-up of liquid being poured or dispensed, glass-on-liquid refraction, micro-droplets caught in light',
  texture_reveal: 'a slow camera move across the product surface revealing its material texture — paper grain, glass refraction, metallic finish',
  box_open: 'a slow first-person reveal of the product being lifted from packaging, fingers entering from below, tactile micro-detail',
}

const PREMIUM_MOOD: Record<string, string> = {
  luxe_dark: 'luxe dark — black walnut surface, single dramatic rim light, deep premium blacks, watch-advertising aesthetic',
  oak_warm: 'warm oak — pale wood surface, soft window light at 4200K, calm premium warmth',
  marble_cool: 'cool marble — polished honed marble, soft directional sidelight at 5000K, spa-luxury aesthetic',
}

/* ────────────────────────────────────────────────────────────────────────
 * Shared building blocks. Negative-prompt blocks especially — these are
 * the same craft notes every ad type benefits from.
 * ──────────────────────────────────────────────────────────────────────── */

const NEG_PHOTO_HUMAN = 'NEGATIVES: no plastic AI skin, no painted faces, no perfectly symmetric features, no extra fingers, no warped hands, no melted phone or product, no fake or gibberish text on the product label, no needles, no syringes, no medical iconography, no overlay graphics, no captions, no Instagram or TikTok UI elements, no chromatic aberration, no over-sharpening halos, no HDR look, no over-saturation, no studio fashion-photography lighting, no cinema LUT colour grade, no film emulation.'

const NEG_PHOTO_PRODUCT = 'NEGATIVES: no people, no faces, no hands, no body parts unless explicitly requested, no medical iconography, no needles, no syringes, no pill bottles other than the product itself, no other branded packaging, no stock-photo gloss, no painted or illustrated style, no plastic over-rendered look, no duplicate packaging, no fake or warped text, no AI watermark, no chromatic aberration, no over-sharpening halos, no HDR.'

const NEG_VIDEO_PRODUCT = 'AVOID: warping product, melting label, gibberish text, extra fingers, plastic AI surfaces, chromatic aberration, jump cuts, freeze frames, text overlays, captions, watermarks, medical iconography, needles, syringes.'

const PHOTO_FOOTER = '8K resolution, ultra-sharp focus on the hero subject, micro-contrast preserved, true-to-life colour science, real photons.'

/* ────────────────────────────────────────────────────────────────────────
 * Prompt builders. Each one assembles a long, layered prompt from the
 * lookup tables and the operator's config. We deliberately repeat key
 * craft anchors (lighting, camera, palette) so the model can't drift.
 * ──────────────────────────────────────────────────────────────────────── */

function buildUgcSelfie(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const gender = GENDER_DESC[String(config.gender ?? 'woman')] ?? 'person'
  const age = AGE_DESC[String(config.age_range ?? '30s')] ?? 'a 34-year-old'
  const eth = ETHNICITY_DESC[String(config.ethnicity ?? 'caucasian')] ?? 'Caucasian'
  const setting = UGC_SETTING[String(config.setting ?? 'bedroom')] ?? UGC_SETTING.bedroom
  const mood = UGC_MOOD[String(config.mood ?? 'casual')] ?? UGC_MOOD.casual
  const angle = String(config.angle ?? '').trim()

  const prompt = [
    'ULTRA-PHOTOREALISTIC user-generated content photograph — a single still that reads as a candid iPhone selfie. The image must feel like a real moment captured by a real person, NOT a professional photograph and NOT a styled lifestyle shot.',
    '',
    `SUBJECT: ${age} ${eth} ${gender}, in ${setting.name}. They are holding their iPhone at arm's length and capturing a casual selfie. Their other hand holds a bottle of ${product.compound} naturally in frame — not "displayed" or staged, just present as something they're using. The product label is clearly readable but is not the visual focus; the person is the focus.`,
    '',
    `EXPRESSION & ENERGY: ${mood.expression}. They look directly at the camera as if speaking to a friend. Body language matches the "${mood.angle_hint}" angle.`,
    '',
    'PHYSICAL DETAIL: natural appearance — light makeup or no makeup at all, subtle skin texture with visible pores, faint freckles or sunspots where age-appropriate, slight asymmetry around the eyes, hair that looks lived-in (slightly imperfect, not styled for photography). Wardrobe: comfortable everyday clothing appropriate to the setting — soft hoodie, fitted tee, casual sweater. Nothing branded.',
    '',
    `SETTING DETAIL: ${setting.details}. Background slightly out of focus (selfie-camera shallow depth) but recognisable. Lived-in props imply a real moment, not a styled set.`,
    '',
    `LIGHTING: ${setting.light}. NO studio strobes, NO ring light, NO professional fill. The light source is a real window or real ambient daylight only. Subtle catchlight in the eyes from the implied window.`,
    '',
    'CAMERA & CAPTURE: shot from the perspective of a front-facing iPhone 15 Pro selfie camera at arm\'s length (approximately 50cm from face). Slight wide-angle distortion typical of a phone selfie camera. Camera held slightly above eye level. Tight vertical framing. Apple iOS native color science — warm natural skin tones, slight orange-teal cast, NOT a cinematic LUT, NOT film emulation, NOT a Capture One profile. Looks like the photo could have come straight off an iPhone camera roll.',
    '',
    `PALETTE: muted natural daylight palette dominated by skin tones, with the muted hues of ${setting.name}. Saturation is true-to-life, NOT punched. Product label colours read accurately.`,
    '',
    angle ? `IMPLICATION (visual mood, not text in image): the photograph carries the emotional truth of "${angle}". Body language and expression should hint at this without any caption or overlay.` : '',
    '',
    NEG_PHOTO_HUMAN,
    '',
    `${PHOTO_FOOTER} EXIF-style realism — looks like an iPhone Camera Roll photograph for ${BRAND_NAMES[brand]}.`,
  ].filter(Boolean).join('\n')

  return { prompt, model_id: 'gemini-nano-banana', angle: `UGC selfie — ${mood.angle_hint}` }
}

function buildDramaTransform(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const scenario = DRAMA_SCENARIO[String(config.scenario ?? 'low_energy')] ?? DRAMA_SCENARIO.low_energy
  const mood = DRAMA_MOOD[String(config.mood ?? 'hopeful')] ?? DRAMA_MOOD.hopeful
  const personPresent = String(config.person_present ?? 'silhouette')
  const personDirective = personPresent === 'no'
    ? 'Render the human element ONLY as an abstract shadow or silhouette — no recognisable face, no specific features.'
    : personPresent === 'silhouette'
    ? 'Render the person from behind, from above, or as a soft profile — face never clearly visible, identity ambiguous.'
    : 'Render the person clearly but without showing a recognisable face — three-quarter from behind, or partially cropped at the eyeline.'

  const prompt = [
    'ULTRA-PHOTOREALISTIC editorial split-frame transformation advertisement. Two contrasting halves of a single emotional moment, separated by a hairline neutral divider.',
    '',
    `LEFT PANEL ("BEFORE"): ${scenario.before}. ${personDirective} Cool desaturated palette — granite grey, ash blue, soft fog tones. Low key-fill ratio (2:1), light source is a single soft north-facing window at 6000K. Composition has visible negative space and downward sightlines. Mood: heavy but not melodramatic.`,
    '',
    `RIGHT PANEL ("AFTER"): ${scenario.after}. ${personDirective} Warm palette — bone white, honey amber, soft oat. Slightly higher key (3:1 ratio), light source is golden afternoon window at 3200K from camera-left, with a soft rim catching the figure. Composition has upward sightlines and open posture. Mood: settled, confident, but never theatrical.`,
    '',
    `THE PRODUCT: a single bottle of ${product.compound} sits centred on the seam between the two panels, slightly elevated, label facing camera and clearly readable. The product is the visual bridge — colour reads neutral so both panels treat it equally. It is the only object that breaks the divider.`,
    '',
    `MOOD & STYLING: ${mood}.`,
    '',
    'COMPOSITION & TYPE: tall vertical format. A small bold modern sans (Inter or Suisse Int\'l) sets the line "Before / After" near the top in charcoal. The brand wordmark sits in the lower-right at small scale. NO numerical claims, NO weight statistics, NO scale graphics, NO medical bullets.',
    '',
    'CAMERA & CAPTURE: conceptual studio composite shot on a Sony A7R V with a 35mm GM lens at f/5.6, ISO 200. Motivated lighting — both panels read as one continuous moment of contrast rather than two separate photographs. Saturation jump halts cleanly at the centre seam so the product reads neutral.',
    '',
    NEG_PHOTO_PRODUCT + ' Additionally: no before/after weight numbers, no scales, no body-measurement stats, no recognisable celebrity faces.',
    '',
    `${PHOTO_FOOTER} Editorial-magazine quality for ${BRAND_NAMES[brand]}.`,
  ].filter(Boolean).join('\n')

  return { prompt, model_id: 'gemini-nano-banana', angle: 'Before-and-after emotional transformation' }
}

function buildLifestyleMoment(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const moment = LIFESTYLE_MOMENT[String(config.moment ?? 'morning_routine')] ?? LIFESTYLE_MOMENT.morning_routine
  const setting = LIFESTYLE_SETTING[String(config.setting ?? 'kitchen')] ?? LIFESTYLE_SETTING.kitchen
  const personPresent = String(config.person_present ?? 'no_person')

  const personDirective = personPresent === 'hands_only'
    ? 'A single pair of hands is visible reaching for or holding the product — natural skin, no jewelry, no manicure, age-ambiguous. Hands enter from the lower-right of frame. NO face, NO arm visible above the wrist.'
    : personPresent === 'silhouette'
    ? 'A soft out-of-focus human silhouette is visible in the deep background — suggesting presence without identity. No face, no recognisable features.'
    : 'No people in frame. The scene reads as a quiet moment captured just before or just after someone was there — a coffee still steaming, a paperback face-down, soft inhabited stillness.'

  const prompt = [
    'ULTRA-PHOTOREALISTIC editorial lifestyle still-life — the product in genuine daily context, captured as if for a premium wellness catalogue.',
    '',
    `SCENE & COMPOSITION: ${moment}. Setting: ${setting}. The bottle of ${product.compound} sits in the lower-right third (rule of thirds), label parallel to image plane and clearly readable.`,
    '',
    `HUMAN ELEMENT: ${personDirective}`,
    '',
    'CAMERA & LIGHT: shot on a Canon EOS R5 with the RF 50mm f/1.2L at f/2.8, ISO 100, 1/160s. East-facing window light from camera-left at 45 degrees through a sheer linen curtain — soft, directional, warm 4200K. Subtle fill bounce from the counter surface on the right. NO artificial light, NO ring light, NO studio strobes. Real photons only.',
    '',
    'PALETTE & TONE: oat, cream, soft sage, warm sand, with one quiet accent of muted moss green. Premium UK wellness aesthetic — visual references: Aesop, Necessaire, Loewe Home Scents, Le Labo. Saturation gentle, never punched.',
    '',
    'MATERIAL & DEPTH: real water condensation on glass where present, fine grain on linen towels, subtle catchlight on the bottle cap, soft floor shadow grounding the product. Creamy natural bokeh — never exaggerated. Tiny dust motes catch in the light beam.',
    '',
    NEG_PHOTO_PRODUCT + ' Additionally: no busy props, no over-decorated surfaces, no fashion-magazine staging that looks "set up".',
    '',
    `${PHOTO_FOOTER} Editorial photograph quality for ${BRAND_NAMES[brand]}.`,
  ].join('\n')

  return { prompt, model_id: 'gemini-nano-banana', angle: 'Lifestyle in-context moment' }
}

function buildHeroStudio(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const mood = HERO_MOOD[String(config.mood ?? 'warm_organic')] ?? HERO_MOOD.warm_organic
  const accent = String(config.accent_color ?? 'forest_green')
  const accentDesc: Record<string, string> = {
    forest_green: 'muted forest green',
    deep_blue: 'deep navy blue',
    warm_amber: 'warm amber',
    monochrome: 'restrained neutrals only — no accent colour',
  }

  const prompt = [
    'ULTRA-PHOTOREALISTIC magazine-cover product hero photograph — the definitive studio shot of the product, the kind of image that anchors a brand campaign.',
    '',
    `SUBJECT: a single bottle of ${product.compound} occupying the centre of the frame, label perfectly readable, parallel to the image plane. The product is the entire visual story.`,
    '',
    `STYLING & MOOD: ${mood}.`,
    '',
    `PALETTE: dominant tones from the staging surface, with one ${accentDesc[accent] ?? accentDesc.forest_green} accent — only if it can appear naturally (a sprig of plant, a thread in the linen, a faint colour gel in the rim light). NO graphic accents, NO type overlays, NO illustrated elements.`,
    '',
    'CAMERA & CAPTURE: shot on a Phase One IQ4 medium format with an 80mm Schneider Blue Ring prime at f/4, ISO 50, 1/125s. Composition rule of thirds — product slightly off-centre, with breathing room above and a deliberate negative-space block. Crisp tack-sharp focus on the label, gentle falloff on the bottle neck and base.',
    '',
    'MATERIAL DETAIL: render real glass-on-label refraction, accurate weight of the product, sub-millimetre wear or texture on the staging surface, faint dust particles caught in the directional light beam. Paper grain visible on the label. Bottle cap shows accurate micro-texture (matte plastic / metallic finish as appropriate).',
    '',
    NEG_PHOTO_PRODUCT,
    '',
    `${PHOTO_FOOTER} Editorial magazine-cover quality. Print-grade. For ${BRAND_NAMES[brand]}.`,
  ].join('\n')

  return { prompt, model_id: 'gemini-nano-banana', angle: 'Hero studio product photograph' }
}

function buildClinicalAuthority(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const mood = String(config.mood ?? 'pharmaceutical')
  const includeData = String(config.include_data_visual ?? 'no') === 'yes'
  const accent = String(config.accent ?? 'clinical_blue')

  const moodDesc: Record<string, string> = {
    lab_research: 'a quiet research-lab aesthetic — a brushed stainless surface, a single ungloved hand absent from frame, the product presented as if mid-protocol',
    pharmaceutical: 'a pharmaceutical-grade aesthetic — pristine white surface, calm symmetry, soft directional top-light, the product reads as clinically dispensed',
    scientific_authority: 'a scientific-authority aesthetic — a slate-grey laminate surface, single hard rim light, sparse and intentional composition',
  }

  const accentDesc: Record<string, string> = {
    clinical_blue: 'a single muted clinical blue accent — possibly the cap, possibly a subtle gel on the rim light',
    charcoal: 'a single charcoal accent — possibly a thin line of type, possibly the surface',
    monochrome: 'no accent colour — purely neutral whites and greys',
  }

  const prompt = [
    'ULTRA-PHOTOREALISTIC editorial clinical product photograph — the product staged with the authority of a pharmaceutical brochure or a peer-reviewed paper, but with editorial restraint.',
    '',
    `SUBJECT: a single bottle of ${product.compound} centred, label perfectly readable, parallel to image plane. ${product.tagline ? `The product subtitle "${product.tagline}" reads as a quiet confidence below.` : ''}`,
    '',
    `STYLING & MOOD: ${moodDesc[mood] ?? moodDesc.pharmaceutical}. The palette uses ${accentDesc[accent] ?? accentDesc.clinical_blue}.`,
    '',
    includeData
      ? 'SECONDARY ELEMENT: a single subtle visual data anchor — a thin line graph etched faintly behind the product, OR a small molecular structure rendered in fine charcoal line, OR a single sparkline. This element is barely-there, NEVER dominant. It implies rigor without being a literal chart.'
      : 'NO secondary graphic elements — the product alone carries the authority of the image.',
    '',
    'CAMERA & CAPTURE: shot on a Hasselblad X2D 100C with a 65mm at f/5.6, ISO 64, 1/100s. Single 90cm softbox top-front at a 3:1 key-fill ratio. Subtle rim from a strip light camera-right catching the bottle edge. Colour temperature 5000K — neutral and precise. Crisp tack-sharp focus on the label.',
    '',
    'PALETTE & TONE: clinical neutrals only — bone white, soft warm grey, the accent above. Saturation low, contrast moderate. NEVER cold or sterile to the point of feeling lifeless — there is always a single warm note (a faint shadow, a paper texture).',
    '',
    'MATERIAL DETAIL: real label paper grain, accurate glass refraction, fine dust visible in the rim light, soft floor shadow grounding the product. Bottle cap micro-texture reads as pharmaceutical-grade.',
    '',
    NEG_PHOTO_PRODUCT + ' Additionally: NO explicit medical claims rendered as text, NO percentage numbers as overlay graphics, NO trial result statistics.',
    '',
    `${PHOTO_FOOTER} Print-grade pharmaceutical-editorial quality for ${BRAND_NAMES[brand]}.`,
  ].join('\n')

  return { prompt, model_id: 'gemini-nano-banana', angle: 'Clinical scientific authority' }
}

/* ── Video builders ───────────────────────────────────────────────────────
 * Higgsfield's prompt field is dense — keep these to roughly 1000 chars
 * each. Every line earns its place. */

function buildCinemaMotion(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const move = CINEMA_MOVE[String(config.camera_move ?? 'push_in')] ?? CINEMA_MOVE.push_in
  const mood = CINEMA_MOOD[String(config.mood ?? 'warm_premium')] ?? CINEMA_MOOD.warm_premium

  const prompt = [
    `Cinematic product motion clip for ${BRAND_NAMES[brand]} ${product.compound}.`,
    `Camera move: ${move}.`,
    `Mood and grade: ${mood}.`,
    `The product is staged on its surface with the label perfectly readable throughout the full duration. The label remains undistorted and legible from start to finish. Real material detail — glass refraction, soft floor shadow grounding the product, fine dust caught in the directional light. Smooth motorised motion, gimbal-stable, no handheld shake. ${product.tagline ? `The product subtitle "${product.tagline}" carries the brand voice.` : ''}`,
    NEG_VIDEO_PRODUCT,
  ].join(' ')

  return { prompt: prompt.slice(0, 950), model_id: 'higgsfield-dop', angle: 'Cinematic product spot' }
}

function buildEnergyReveal(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const pace = ENERGY_PACE[String(config.pace ?? 'gentle_build')] ?? ENERGY_PACE.gentle_build
  const mood = ENERGY_MOOD[String(config.mood ?? 'vibrant')] ?? ENERGY_MOOD.vibrant

  const prompt = [
    `Energetic product reveal clip for ${BRAND_NAMES[brand]} ${product.compound}.`,
    `Pacing: ${pace}.`,
    `Mood and palette: ${mood}.`,
    `The product stays the focal anchor through the motion — label perfectly readable, undistorted. Camera motion implies energy through reframes and parallax, never wild shake. Real material detail — glass refraction, micro-droplets, dust particles in directional light. Smooth motorised motion. ${product.tagline ? `Subtitle: "${product.tagline}".` : ''}`,
    NEG_VIDEO_PRODUCT,
  ].join(' ')

  return { prompt: prompt.slice(0, 950), model_id: 'seedance2', angle: 'Energetic product reveal' }
}

function buildPremiumCloseup(config: AdTypeConfig, product: ProductContext, brand: Brand): BuiltPrompt {
  const focus = PREMIUM_FOCUS[String(config.focus ?? 'label_detail')] ?? PREMIUM_FOCUS.label_detail
  const mood = PREMIUM_MOOD[String(config.mood ?? 'oak_warm')] ?? PREMIUM_MOOD.oak_warm

  const prompt = [
    `Premium close-up tactile clip for ${BRAND_NAMES[brand]} ${product.compound}.`,
    `Focus and choreography: ${focus}.`,
    `Mood and surface: ${mood}.`,
    `Macro detail throughout — label paper grain, glass refraction, cap micro-texture, fine particulate in the directional light. Camera motion is slow, considered, watch-advertising pace. The product label stays perfectly readable and undistorted. ${product.tagline ? `Brand voice: "${product.tagline}".` : ''}`,
    NEG_VIDEO_PRODUCT,
  ].join(' ')

  return { prompt: prompt.slice(0, 950), model_id: 'kling3', angle: 'Premium close-up reveal' }
}

/* ────────────────────────────────────────────────────────────────────────
 * Registry — single map the edge functions look up.
 * ──────────────────────────────────────────────────────────────────────── */

const AD_TYPE_REGISTRY: Record<AdTypeId, AdTypeEntry> = {
  ugc_selfie: {
    kind: 'image',
    model: 'gemini-nano-banana',
    defaultAspect: '4:5',
    build: buildUgcSelfie,
  },
  drama_transform: {
    kind: 'image',
    model: 'gemini-nano-banana',
    defaultAspect: '4:5',
    build: buildDramaTransform,
  },
  lifestyle_moment: {
    kind: 'image',
    model: 'gemini-nano-banana',
    defaultAspect: '1:1',
    build: buildLifestyleMoment,
  },
  hero_studio: {
    kind: 'image',
    model: 'gemini-nano-banana',
    defaultAspect: '1:1',
    build: buildHeroStudio,
  },
  clinical_authority: {
    kind: 'image',
    model: 'gemini-nano-banana',
    defaultAspect: '4:5',
    build: buildClinicalAuthority,
  },
  cinema_motion: {
    kind: 'video',
    model: 'higgsfield-dop',
    defaultAspect: '9:16',
    defaultDuration: 5,
    build: buildCinemaMotion,
  },
  energy_reveal: {
    kind: 'video',
    model: 'seedance2',
    defaultAspect: '9:16',
    defaultDuration: 5,
    build: buildEnergyReveal,
  },
  premium_closeup: {
    kind: 'video',
    model: 'kling3',
    defaultAspect: '1:1',
    defaultDuration: 5,
    build: buildPremiumCloseup,
  },
}

export function getAdTypeEntry(id: string): AdTypeEntry | undefined {
  return AD_TYPE_REGISTRY[id as AdTypeId]
}

export function buildAdPrompt(
  id: string,
  config: AdTypeConfig,
  product: ProductContext,
  brand: Brand,
): BuiltPrompt | null {
  const entry = AD_TYPE_REGISTRY[id as AdTypeId]
  if (!entry) return null
  return entry.build(config, product, brand)
}

/** Friendly label for the library card, never exposing engine details. */
export function friendlyAdTypeLabel(id: string): string {
  switch (id as AdTypeId) {
    case 'ugc_selfie': return 'UGC Selfie'
    case 'drama_transform': return 'Drama Transformation'
    case 'lifestyle_moment': return 'Lifestyle Moment'
    case 'hero_studio': return 'Hero Studio Shot'
    case 'clinical_authority': return 'Clinical Authority'
    case 'cinema_motion': return 'Cinematic Motion'
    case 'energy_reveal': return 'Energy Reveal'
    case 'premium_closeup': return 'Premium Close-up'
    default: return 'Creative'
  }
}
