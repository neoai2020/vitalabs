/**
 * Single source of truth for the model + preset registry used by the Ad
 * Studio UI (and, later, by the publish pipeline when it labels creatives
 * with their generator). Curated lists — Higgsfield exposes ~30 video
 * models, we surface 6 to keep the picker honest. The rest stay reachable
 * via their own UI.
 *
 * Adding a new image model later: add an entry to IMAGE_MODELS and map it
 * to a generator id in the generate-ad-image Edge Function.
 *
 * Adding a new video model: add to VIDEO_MODELS and update the switch
 * statement in generate-ad-video.
 *
 * ABOUT THE PROMPTS:
 * Templates below are deliberately verbose, "pixel-by-pixel" briefs. They
 * bake in camera body / lens / aperture / light direction / colour
 * temperature / composition / palette / material detail / negative
 * directives so a non-designer operator gets editorial-grade output by
 * just picking a hook. Token placeholders ({{product_name}} etc.) are
 * filled server-side in the Edge Function against the canonical product
 * row — never trust client-supplied token values.
 */

export type CreativeKind = 'image' | 'video'

export interface ImageModel {
  id: 'gemini-nano-banana'
  label: string
  description: string
  /** Aspect ratios this model can render reliably. */
  aspect_ratios: AspectRatio[]
  /** True while we haven't shipped the Edge Function for this model yet. */
  comingSoon?: boolean
}

export interface VideoModel {
  id: VideoModelId
  label: string
  description: string
  /** Typical clip durations in seconds, in order of preference. */
  durations_s: number[]
  aspect_ratios: AspectRatio[]
  comingSoon?: boolean
}

export type VideoModelId =
  | 'veo3'
  | 'sora2-video'
  | 'kling3'
  | 'seedance2'
  | 'wan2-6'
  | 'higgsfield-dop'

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

export const ASPECT_RATIOS: { id: AspectRatio; label: string; hint: string }[] = [
  { id: '1:1', label: '1:1', hint: 'Feed' },
  { id: '4:5', label: '4:5', hint: 'Feed (portrait)' },
  { id: '9:16', label: '9:16', hint: 'Stories / Reels' },
  { id: '16:9', label: '16:9', hint: 'Wide' },
]

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'gemini-nano-banana',
    label: 'Gemini 2.5 Flash Image (Nano Banana)',
    description:
      'Google\'s fast image model. Best at preserving the product photo as a reference while restyling background, light, and copy.',
    aspect_ratios: ['1:1', '4:5', '9:16', '16:9'],
  },
]

/* Three Higgsfield image-to-video models are verified live and wired
 * to their actual API schemas:
 *   - higgsfield-dop  → /v1/image2video/dop      (camera moves)
 *   - kling3          → /v1/image2video/kling    (detailed close-ups)
 *   - seedance2       → /v1/image2video/seedance (energetic motion)
 *
 * Veo 3, Sora 2, and Wan 2.6 are advertised on higgsfield.ai/apps but
 * not exposed via the public API yet (all paths return 404). Keeping
 * them in the registry as roadmap entries so the moment Higgsfield
 * opens them up we just flip comingSoon and ship the endpoint config. */
export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'higgsfield-dop',
    label: 'Higgsfield DOP',
    description: 'Director-of-photography model. Cinematic camera moves on the product photo.',
    durations_s: [5, 10],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'kling3',
    label: 'Kling 2.1 Pro',
    description: 'Detailed close-ups, reliable product transformation. Image-to-video.',
    durations_s: [5, 10],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'seedance2',
    label: 'Seedance Pro',
    description: 'Energetic motion, good for transformation reels. Image-to-video.',
    durations_s: [5, 10],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'veo3',
    label: 'Veo 3',
    description: 'Google\'s flagship — not yet exposed via Higgsfield\'s public API.',
    durations_s: [8, 16],
    aspect_ratios: ['9:16', '1:1', '16:9'],
    comingSoon: true,
  },
  {
    id: 'sora2-video',
    label: 'Sora 2',
    description: 'OpenAI\'s creative video model — not yet exposed via Higgsfield\'s public API.',
    durations_s: [10, 20],
    aspect_ratios: ['9:16', '1:1', '16:9'],
    comingSoon: true,
  },
  {
    id: 'wan2-6',
    label: 'Wan 2.6',
    description: 'Talking-head UGC model — not yet exposed via Higgsfield\'s public API.',
    durations_s: [8, 16],
    aspect_ratios: ['9:16', '1:1'],
    comingSoon: true,
  },
]

/** Marketing presets the operator can pick from when they don't want to
 * micro-manage the model. Each preset suggests a model and a prompt
 * template. */
export interface MarketingPreset {
  id: PresetId
  label: string
  blurb: string
  /** Default video model when the operator hits "suggest model". */
  suggested_model: VideoModelId
  /** Token-templated prompt; tokens get filled at submit time:
   *  {{product_name}}, {{product_tagline}}, {{primary_benefit}}, {{brand_name}}. */
  prompt_template: string
}

export type PresetId =
  | 'ugc'
  | 'unboxing'
  | 'product_review'
  | 'tv_spot'
  | 'hyper_motion'

/* Video prompts are deliberately under 1000 chars — Higgsfield's prompt
 * field truncates beyond ~1k. Density over length: every sentence must
 * earn its place. */
export const PRESETS: MarketingPreset[] = [
  {
    id: 'ugc',
    label: 'UGC',
    blurb: 'Phone-camera testimonial, looks shot at home.',
    suggested_model: 'wan2-6',
    prompt_template:
      '9:16 vertical phone selfie, iPhone 15 Pro front camera, 1080p 30fps, subtle handheld jitter — feels real, not produced. A 32-year-old British woman, no makeup, slightly messy bun, soft grey hoodie, sitting on an unmade bed at 9am. Morning light through gauzy white curtains, 4200K. She speaks directly to camera in a warm conversational, slightly stumbling tone — not scripted — about how {{product_name}} fits her routine and specifically the {{primary_benefit}} she has noticed. At 5s she lifts {{product_name}} into frame; the label is clearly readable for 3 full seconds. Audio: room tone only, faint birdsong outside, no music, no overlays, no captions, no jump cuts. Skin shows pores and slight morning redness, eyes track naturally between camera and product. Ends on a calm unposed smile. Feels like an Instagram Reel, not an ad. Photoreal, hyper-realistic skin and lighting, no plastic AI faces, no extra fingers, no warped product label, no medical imagery.',
  },
  {
    id: 'unboxing',
    label: 'Unboxing',
    blurb: 'First-person close-up of opening the box.',
    suggested_model: 'kling3',
    prompt_template:
      'First-person POV unboxing, 9:16 vertical 4K 30fps, gentle handheld, fingers entering frame from below. Off-white melamine desk, one matte ceramic mug of tea on the left edge for warmth. Tactile sequence: 0-2s peel the perforated cardboard tab, audible separation; 2-4s lift the lid revealing {{product_name}} nestled in custom moulded eco-foam; 4-7s extract the product with a slow half-rotation, the label readable; 7-10s tight macro of label text including the tagline "{{product_tagline}}". Real soft window light from camera right, 4500K, gentle highlight along the bottle edge. ASMR-style sound design: crisp cardboard separation, soft thunk of lid, faint exhale, no music, no voiceover, no captions, no overlays. Visible fingertip detail — natural nail texture, no plastic skin, no extra fingers — accurate cardboard grain, fine dust particles in the light beam. Photoreal, no AI artefacts, no warped text, no medical imagery.',
  },
  {
    id: 'product_review',
    label: 'Product Review',
    blurb: 'Reviewer-on-camera with product cutaways.',
    suggested_model: 'wan2-6',
    prompt_template:
      'Studio talking-head review, 9:16 vertical 1080p, locked camera, 50mm equivalent at f/2.8. Soft beauty-dish key light camera-left at 45 degrees, subtle rim from a strip light camera-right. A confident 35-year-old British presenter in a tailored neutral knit on a stone-coloured backdrop. Magazine-host delivery, calm, no overselling. Beats: 0-3s pattern interrupt — "Most of these promise the world." 3-8s introduces {{product_name}}, says the tagline "{{product_tagline}}". 8-13s explains {{primary_benefit}} in plain English. 13-22s cuts to product B-roll: hero shot on stone, slow dolly-in, label readable, then back to presenter. 22-30s soft close. Audio: clean lavalier voice, room-tone bed, no music, no captions. Photoreal natural skin with real pores and stubble where appropriate, eyes connect with camera, no plastic AI face, no warped product label, no medical imagery.',
  },
  {
    id: 'tv_spot',
    label: 'TV Spot',
    blurb: 'Cinematic 15s brand spot.',
    suggested_model: 'veo3',
    prompt_template:
      'Cinematic 15-second brand spot for {{brand_name}}. ARRI Alexa look, anamorphic flares, 2.39:1 framing inside a 9:16 safe area. Beats: 0-3s slow push-in on a UK coastal sunrise, golden 3500K light, faint sea mist; 3-7s abstract macro of textures of being well — skin pores in soft light, wool weave, a slow exhale on a window; never a full face; 7-11s slow track across a stone shelf where {{product_name}} catches a directional sunbeam, the label readable, soft floor shadow; 11-15s product hero on stone slab, a single beam of light, then end-card with the {{brand_name}} wordmark in deep charcoal on cream. Sound: a low ambient pad, faint coastal wind, one soft chime on the end-card. No dialogue, no voiceover. Filmic 35mm grain, micro-contrast preserved. Photoreal, no AI plastic look, no warped surfaces, no medical imagery.',
  },
  {
    id: 'hyper_motion',
    label: 'Hyper Motion',
    blurb: 'Fast-cut transformation reel.',
    suggested_model: 'seedance2',
    prompt_template:
      '12-second hyper-cut reel, 9:16 vertical, 60fps, rhythmic cuts at ~1.2s intervals locked to a driving electronic pulse. Shots: 0-1.2s flash-cut of a runner silhouette breaking dawn light on a UK road; 1.2-2.4s macro of dewdrops on grass at 240fps; 2.4-3.6s {{product_name}} dropping onto a clean white card, slow-mo 240fps, no spill, label readable; 3.6-4.8s cymatics-style ripple on water suggesting energy; 4.8-6s product label tight macro, sharp; 6-8.4s alternating beats — lacing up trainers / a heart-rate watch / a kettle pour; 8.4-10.8s sprint motion low-angle, soft focus background; 10.8-12s final product card on clean white, {{brand_name}} wordmark fades in. Sound: single driving pulse, no vocals. Real shallow depth-of-field, no AI plastic, no warped product label, no medical imagery.',
  },
]

export function findVideoModel(id: VideoModelId | string): VideoModel | undefined {
  return VIDEO_MODELS.find(m => m.id === id)
}

export function findPreset(id: PresetId | string): MarketingPreset | undefined {
  return PRESETS.find(p => p.id === id)
}

/** Hook templates for static images (Phase 2). The Studio renders these
 * as a 2x2 grid so the operator can pick the angle. Prompts are dense
 * photography briefs — Nano Banana respects long prompts well. */
export interface ImageHookTemplate {
  id: ImageHookId
  label: string
  blurb: string
  prompt_template: string
}

export type ImageHookId =
  | 'testimonial_card'
  | 'before_after'
  | 'problem_solution'
  | 'lifestyle'

export const IMAGE_HOOKS: ImageHookTemplate[] = [
  {
    id: 'testimonial_card',
    label: 'Testimonial card',
    blurb: 'Quote overlay on a clean product hero.',
    prompt_template: [
      'ULTRA-PHOTOREALISTIC magazine-grade testimonial advertisement.',
      '',
      'SCENE & COMPOSITION: studio still-life of {{product_name}} placed in the lower-third on a smooth matte concrete or unbleached linen surface. Subtle architectural shadow under the product. A pull-quote occupies the upper two-thirds, set in a high-end neutral serif (Söhne, Pangram Sans, GT Sectra): "{{testimonial_quote}}" — {{testimonial_author}}. {{brand_name}} wordmark bottom-left at small scale, in charcoal grey. Strict rule-of-thirds. Product label fully readable, parallel to the image plane.',
      '',
      'CAMERA & LIGHT: shot on a Phase One IQ4 medium format with an 80mm prime at f/4, ISO 100, 1/125s. Single soft key from camera-left at 35 degrees (1.2m softbox), gentle fill from a 1m white V-flat camera-right. Background falls off to a deeper tone in the upper-right. Colour temperature 5200K. Soft wrap on the product, no harsh specular hotspots.',
      '',
      'PALETTE & TONE: bone white, oat, warm taupe, with one quiet accent of muted moss or forest green. Premium UK wellness aesthetic — Aesop, Necessaire, Le Labo. Confident, calm, scientific.',
      '',
      'MATERIAL DETAIL: render real glass-on-label refraction, accurate weight, faint airborne dust in the light beam, sub-millimetre wear on the surface. Paper grain visible on the product label.',
      '',
      'NEGATIVES: no people, no faces, no hands, no medical iconography, no needles, no syringes, no stock-photo gloss, no painted style, no plastic over-rendered look, no duplicate packaging, no fake or warped text, no AI watermark, no chromatic aberration, no over-sharpening halos. Editorial photograph only. 8K, ultra-sharp focus on the product, micro-contrast preserved.',
    ].join('\n'),
  },
  {
    id: 'before_after',
    label: 'Before / After',
    blurb: 'Split-frame outcome comparison.',
    prompt_template: [
      'ULTRA-PHOTOREALISTIC editorial split-frame transformation advertisement.',
      '',
      'SCENE & COMPOSITION: a vertical 50/50 split with a hairline neutral divider. LEFT panel ("BEFORE"): an abstract human silhouette rendered only via shadow on a stone-grey wash, posture slouched, low-energy. Cool desaturated tones, soft blue-grey gradient. RIGHT panel ("AFTER"): same silhouette upright, shoulders open, posture confident. Warm tones, soft amber gradient. {{product_name}} centred on the seam, slightly elevated, label facing camera. Headline along the top in a bold modern sans (Inter, Suisse Int\'l): "{{primary_benefit}}". {{brand_name}} wordmark in the lower-right at small scale.',
      '',
      'CAMERA & LIGHT: conceptual studio composite, shot on a Sony A7R V with a 35mm GM at f/5.6, ISO 200. LEFT side: north-window light, 6000K, low contrast, soft fill. RIGHT side: golden-hour west light, 3200K, slightly higher key, gentle rim. Motivated lighting — both panels read as one continuous moment of contrast, not two separate photos.',
      '',
      'PALETTE & TONE: LEFT — granite grey, ash blue, fog. RIGHT — bone white, honey amber, warm oat. The saturation jump halts cleanly at the centre seam so the product reads neutral.',
      '',
      'MATERIAL & DEPTH: product is razor-sharp; silhouettes softly defocused to push the product forward. Tiny dust motes in the AFTER beam. Both panels share a 1mm matte concrete floor for continuity.',
      '',
      'COMPLIANCE & NEGATIVES: no medical claims, no before/after weight numbers, no scales, no body-comparison stats. No literal faces, no recognisable features. No needles, no syringes, no pill bottles, no other branded packaging. No painterly look, no AI smear, no warped or gibberish text. Editorial photograph, 8K, ultra-sharp.',
    ].join('\n'),
  },
  {
    id: 'problem_solution',
    label: 'Problem / Solution',
    blurb: 'Problem framed, product as resolution.',
    prompt_template: [
      'ULTRA-PHOTOREALISTIC editorial scroll-stopper with a question-led headline.',
      '',
      'SCENE & COMPOSITION: vertical poster split horizontally. TOP HALF (roughly 60% of canvas): a heavy editorial serif headline in charcoal on textured cream paper — "{{problem_question}}". Set tight, large, centre-aligned, generous upper margin. A small pencil-style underline draws attention to the key word. BOTTOM HALF: clean studio hero of {{product_name}} sitting on a polished travertine slab, label perfectly readable, one-line tagline beneath in a smaller neutral sans: "{{product_tagline}}". {{brand_name}} wordmark bottom-right.',
      '',
      'CAMERA & LIGHT: shot on a Hasselblad X2D 100C with a 65mm at f/5.6, ISO 64, 1/100s. Single 90cm softbox top-front, key-fill ratio ~3:1, subtle rim from a strip light camera-right that catches the bottle edge. Colour temperature 4800K.',
      '',
      'PALETTE & TONE: cream, warm white, soft sand, with one muted forest-green accent for type emphasis. Editorial-magazine palette — Cereal, Kinfolk, MagCulture.',
      '',
      'MATERIAL DETAIL: real paper grain on the cream wash; a subtle warm shadow grounding the product on travertine. Glass / plastic of the product shows correct refraction and a soft floor reflection.',
      '',
      'NEGATIVES: no people, no body parts, no medical iconography, no needles, no syringes, no other product mockups, no fake or warped text, no chromatic aberration, no AI plastic look, no over-sharpening halos. Editorial photograph, 8K, micro-contrast preserved.',
    ].join('\n'),
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    blurb: 'In-context shot of the product in use.',
    prompt_template: [
      'ULTRA-PHOTOREALISTIC editorial lifestyle still-life — the product in real morning context.',
      '',
      'SCENE & COMPOSITION: sunlit modern bathroom counter at 8:30am, UK weekend morning. {{product_name}} sits in the lower-right third (rule of thirds), label readable, parallel to image plane. Lived-in props chosen for calm not staging: a folded oatmeal-linen face towel, a brass tray holding a single tumbler of cold water (condensation droplets visible), one small eucalyptus sprig, slim wire-frame reading glasses. Background: out-of-focus oak vanity, brushed nickel tap, soft beige wall.',
      '',
      'CAMERA & LIGHT: shot on a Canon EOS R5 with the RF 50mm f/1.2L at f/2.8, ISO 100, 1/160s. East-facing window light from camera-left at 45 degrees through a sheer linen curtain — soft, directional, warm 4200K. Subtle fill bounce from a marble counter on the right. No artificial light. Real photons.',
      '',
      'PALETTE & TONE: oat, cream, sage, soft sand, with one accent of muted moss green. Premium UK wellness aesthetic — Aesop, Necessaire, Loewe Home Scents.',
      '',
      'MATERIAL & DEPTH: real water condensation on the tumbler, fine grain on the linen towel, subtle catchlight on the bottle cap, soft floor shadow grounding the product. Creamy natural bokeh, never exaggerated.',
      '',
      'NEGATIVES: no people, no faces, no hands, no medical iconography, no needles, no syringes, no overlay graphics, no fake or warped text, no busy props, no plastic AI look, no over-saturation, no HDR, no warped surfaces. Editorial photograph, 8K, ultra-sharp on the product, micro-contrast preserved.',
    ].join('\n'),
  },
]
