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

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'veo3',
    label: 'Veo 3',
    description: 'Google\'s flagship for cinematic motion and natural human performances.',
    durations_s: [8, 16],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'sora2-video',
    label: 'Sora 2',
    description: 'Strong creative control, good for surreal / lifestyle ads.',
    durations_s: [10, 20],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'kling3',
    label: 'Kling 3.0',
    description: 'Detailed product close-ups; reliable for unboxing-style shots.',
    durations_s: [5, 10],
    aspect_ratios: ['9:16', '1:1', '16:9'],
  },
  {
    id: 'seedance2',
    label: 'Seedance 2.0',
    description: 'Energetic motion, good for hyper-cuts and transformation ads.',
    durations_s: [6, 12],
    aspect_ratios: ['9:16', '1:1'],
  },
  {
    id: 'wan2-6',
    label: 'Wan 2.6',
    description: 'Realistic human talking-heads; the workhorse for UGC.',
    durations_s: [8, 16],
    aspect_ratios: ['9:16', '1:1'],
  },
  {
    id: 'higgsfield-dop',
    label: 'Higgsfield DOP',
    description: 'Director-of-photography model; camera moves on a product still.',
    durations_s: [5, 10],
    aspect_ratios: ['9:16', '1:1', '16:9'],
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

export const PRESETS: MarketingPreset[] = [
  {
    id: 'ugc',
    label: 'UGC',
    blurb: 'Phone-camera testimonial, looks shot at home.',
    suggested_model: 'wan2-6',
    prompt_template:
      'A 30-something person filming a vertical phone selfie at home, talking honestly about how {{product_name}} ({{primary_benefit}}) changed their routine. Natural light, slightly handheld, no music. They hold the product up to camera near the end.',
  },
  {
    id: 'unboxing',
    label: 'Unboxing',
    blurb: 'First-person close-up of opening the box.',
    suggested_model: 'kling3',
    prompt_template:
      'First-person POV of someone unboxing {{product_name}} on a clean white desk. Tactile close-ups: peeling tape, lifting the lid, revealing the vial nestled in foam. Soft natural light, satisfying micro-sounds, ends on the product hero shot.',
  },
  {
    id: 'product_review',
    label: 'Product Review',
    blurb: 'Reviewer-on-camera with product cutaways.',
    suggested_model: 'wan2-6',
    prompt_template:
      'A confident reviewer talking to camera about why {{product_name}} is different from the rest of the market. {{primary_benefit}}. Cut to clean product cutaways at 5s and 12s. Studio-style lighting, single camera, 30s narrative arc.',
  },
  {
    id: 'tv_spot',
    label: 'TV Spot',
    blurb: 'Cinematic 15s brand spot.',
    suggested_model: 'veo3',
    prompt_template:
      'A cinematic 15-second {{brand_name}} brand spot for {{product_name}}. Mood: confident, modern, scientific. Hero shot of the product in the final 3 seconds. No dialogue, optional ambient music bed.',
  },
  {
    id: 'hyper_motion',
    label: 'Hyper Motion',
    blurb: 'Fast-cut transformation reel.',
    suggested_model: 'seedance2',
    prompt_template:
      'A hyper-edited 12-second motion reel showing a transformation arc tied to {{primary_benefit}}. Quick cuts (8-12 shots), rhythmic motion, product appears on a clean white card every 4 seconds. Bold, gym-floor energy.',
  },
]

export function findVideoModel(id: VideoModelId | string): VideoModel | undefined {
  return VIDEO_MODELS.find(m => m.id === id)
}

export function findPreset(id: PresetId | string): MarketingPreset | undefined {
  return PRESETS.find(p => p.id === id)
}

/** Hook templates for static images (Phase 2). The Studio renders these
 * as a 2x2 grid so the operator can pick the angle. */
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
    prompt_template:
      'A square testimonial card featuring {{product_name}} on a soft, premium background. Large quoted testimonial copy positioned top-left: "{{testimonial_quote}}" - {{testimonial_author}}. Product photo bottom-right. {{brand_name}} wordmark bottom-left. Designed like a high-end magazine ad. Studio lighting, no people.',
  },
  {
    id: 'before_after',
    label: 'Before / After',
    blurb: 'Split-frame outcome comparison.',
    prompt_template:
      'A split-frame ad: left side desaturated "before" mood (tired, low-energy figure silhouette), right side vibrant "after" mood (confident posture, full colour). {{product_name}} centred between them. Bold headline: "{{primary_benefit}}". {{brand_name}} mark in corner. No medical claims, no people\'s faces.',
  },
  {
    id: 'problem_solution',
    label: 'Problem / Solution',
    blurb: 'Problem framed, product as resolution.',
    prompt_template:
      'A scroll-stopping ad. Top half asks a problem question in big bold serif: "{{problem_question}}". Bottom half resolves with {{product_name}} hero shot and tagline. Clean editorial layout, generous whitespace, {{brand_name}} brand colours.',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    blurb: 'In-context shot of the product in use.',
    prompt_template:
      'A lifestyle ad shot in a sunlit modern bathroom or bedside table. {{product_name}} placed casually next to a coffee, a journal, a watch. Warm morning light. No people. The product label is clearly readable. {{brand_name}} brand mark in lower right.',
  },
]
