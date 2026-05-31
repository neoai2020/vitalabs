/**
 * Frontend ad-type catalog. Mirrors the field SCHEMA of the backend
 * registry in supabase/functions/_shared/adTypes.ts but deliberately
 * contains ZERO prompt text — the operator only sees friendly questions
 * and the underlying prompts stay server-side.
 *
 * If you add a new field here, mirror it in the backend builder so the
 * extra config actually shapes the output.
 */

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'
export type CreativeKind = 'image' | 'video'

export type AdTypeId =
  | 'ugc_selfie'
  | 'drama_transform'
  | 'lifestyle_moment'
  | 'hero_studio'
  | 'clinical_authority'
  | 'cinema_motion'
  | 'energy_reveal'
  | 'premium_closeup'

export interface AspectOption {
  id: AspectRatio
  label: string
  hint: string
}

export const ASPECT_RATIOS: AspectOption[] = [
  { id: '1:1', label: '1:1', hint: 'Feed square' },
  { id: '4:5', label: '4:5', hint: 'Feed portrait' },
  { id: '9:16', label: '9:16', hint: 'Reels / Stories' },
  { id: '16:9', label: '16:9', hint: 'Wide' },
]

export interface FieldOption {
  id: string
  label: string
  hint?: string
}

export interface FormField {
  id: string
  label: string
  hint?: string
  type: 'select' | 'textarea'
  options?: FieldOption[]
  placeholder?: string
  required?: boolean
  /** When set, the field renders as a visual chip grid instead of select. */
  layout?: 'chips' | 'select'
}

export interface AdType {
  id: AdTypeId
  label: string
  blurb: string
  kind: CreativeKind
  /** Short emoji/icon tag for the card. Kept simple — no engine names. */
  icon: string
  /** Aspect ratio chosen first when this type is picked. */
  defaultAspect: AspectRatio
  /** Available durations for video types. */
  durations_s?: number[]
  defaultDuration?: number
  /** Aspect ratios this type renders well — others are filtered out. */
  aspectAllowed?: AspectRatio[]
  fields: FormField[]
  /** Long-form description on the configure step — what they're about to get. */
  description: string
}

const COMMON_PERSON_FIELDS: FormField[] = [
  {
    id: 'gender',
    label: 'Person',
    type: 'select',
    layout: 'chips',
    required: true,
    options: [
      { id: 'woman', label: 'Woman' },
      { id: 'man', label: 'Man' },
    ],
  },
  {
    id: 'age_range',
    label: 'Age',
    type: 'select',
    layout: 'chips',
    required: true,
    options: [
      { id: '20s', label: '20s' },
      { id: '30s', label: '30s' },
      { id: '40s', label: '40s' },
      { id: '50plus', label: '50+' },
    ],
  },
  {
    id: 'ethnicity',
    label: 'Ethnicity',
    type: 'select',
    required: true,
    options: [
      { id: 'caucasian', label: 'Caucasian' },
      { id: 'east_asian', label: 'East Asian' },
      { id: 'south_asian', label: 'South Asian' },
      { id: 'black', label: 'Black' },
      { id: 'hispanic', label: 'Hispanic / Latino' },
      { id: 'middle_eastern', label: 'Middle Eastern' },
      { id: 'mixed', label: 'Mixed / Other' },
    ],
  },
]

export const AD_TYPES: AdType[] = [
  {
    id: 'ugc_selfie',
    label: 'UGC Selfie',
    blurb: 'Looks like a real person\'s phone selfie. The most-clicked ad style on Meta in 2026.',
    description: 'A candid front-facing iPhone selfie of a real person in their everyday space, casually holding the product. Reads as authentic content, not advertising.',
    kind: 'image',
    icon: '📱',
    defaultAspect: '4:5',
    aspectAllowed: ['4:5', '9:16', '1:1'],
    fields: [
      ...COMMON_PERSON_FIELDS,
      {
        id: 'setting',
        label: 'Where are they filming?',
        type: 'select',
        required: true,
        options: [
          { id: 'bedroom', label: 'Bedroom (morning light)' },
          { id: 'bathroom', label: 'Bathroom mirror' },
          { id: 'kitchen', label: 'Kitchen' },
          { id: 'living_room', label: 'Living room sofa' },
          { id: 'gym', label: 'Home gym corner' },
          { id: 'car', label: 'Car selfie (parked)' },
          { id: 'outdoor', label: 'Outdoors / park bench' },
        ],
      },
      {
        id: 'mood',
        label: 'Energy',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'excited', label: 'Excited' },
          { id: 'casual', label: 'Casual' },
          { id: 'honest', label: 'Honest' },
          { id: 'surprised', label: 'Surprised' },
        ],
      },
      {
        id: 'angle',
        label: 'Hook / pain point',
        type: 'textarea',
        hint: 'One short sentence. The system uses this to set the emotional tone — not text in the image.',
        placeholder: 'e.g. always tired in the afternoon, can\'t lose the last 10 lbs',
        required: true,
      },
    ],
  },

  {
    id: 'drama_transform',
    label: 'Drama Transformation',
    blurb: 'A two-panel emotional before / after. Pattern-interrupts the scroll.',
    description: 'A vertical split-frame image. Left panel shows the "before" emotional state, right panel shows the "after". Product sits on the seam, label readable.',
    kind: 'image',
    icon: '🎭',
    defaultAspect: '4:5',
    aspectAllowed: ['4:5', '9:16', '1:1'],
    fields: [
      {
        id: 'scenario',
        label: 'Scenario',
        type: 'select',
        required: true,
        options: [
          { id: 'low_energy', label: 'Low energy → energised' },
          { id: 'poor_sleep', label: 'Poor sleep → rested' },
          { id: 'weight_struggle', label: 'Weight struggle → confidence' },
          { id: 'brain_fog', label: 'Brain fog → sharp focus' },
          { id: 'inflammation', label: 'Pain / inflammation → ease' },
        ],
      },
      {
        id: 'person_present',
        label: 'Person on camera',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'no', label: 'Silhouette only' },
          { id: 'silhouette', label: 'Identity ambiguous' },
          { id: 'yes', label: 'Person visible (no face)' },
        ],
      },
      {
        id: 'mood',
        label: 'Mood',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'dramatic', label: 'Dramatic' },
          { id: 'hopeful', label: 'Hopeful' },
          { id: 'clean', label: 'Minimal / clean' },
          { id: 'editorial', label: 'Editorial' },
        ],
      },
    ],
  },

  {
    id: 'lifestyle_moment',
    label: 'Lifestyle Moment',
    blurb: 'Product in a real daily-life moment. Premium wellness catalogue feel.',
    description: 'The product staged naturally in an everyday context — morning coffee, post-workout, evening wind-down. Premium UK wellness aesthetic.',
    kind: 'image',
    icon: '☕',
    defaultAspect: '1:1',
    aspectAllowed: ['1:1', '4:5', '9:16'],
    fields: [
      {
        id: 'moment',
        label: 'Time / moment',
        type: 'select',
        required: true,
        options: [
          { id: 'morning_routine', label: 'Morning routine' },
          { id: 'post_workout', label: 'Post-workout' },
          { id: 'evening_wind_down', label: 'Evening wind-down' },
          { id: 'coffee_break', label: 'Midday coffee break' },
          { id: 'commute', label: 'Getting ready to head out' },
        ],
      },
      {
        id: 'setting',
        label: 'Where',
        type: 'select',
        required: true,
        options: [
          { id: 'kitchen', label: 'Kitchen counter' },
          { id: 'bathroom', label: 'Bathroom counter' },
          { id: 'bedroom', label: 'Bedroom nightstand' },
          { id: 'office', label: 'Home office desk' },
          { id: 'cafe', label: 'Quiet cafe table' },
          { id: 'outdoor', label: 'Sunlit garden table' },
        ],
      },
      {
        id: 'person_present',
        label: 'Human presence',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'no_person', label: 'No people' },
          { id: 'hands_only', label: 'Hands only' },
          { id: 'silhouette', label: 'Soft silhouette' },
        ],
      },
    ],
  },

  {
    id: 'hero_studio',
    label: 'Hero Studio Shot',
    blurb: 'The definitive product photograph. Magazine-cover quality.',
    description: 'A single hero shot of the product — the kind of image that anchors a brand campaign. Studio composition, print-grade quality.',
    kind: 'image',
    icon: '✨',
    defaultAspect: '1:1',
    aspectAllowed: ['1:1', '4:5', '16:9'],
    fields: [
      {
        id: 'mood',
        label: 'Mood',
        type: 'select',
        required: true,
        options: [
          { id: 'warm_organic', label: 'Warm organic (linen / oak)' },
          { id: 'clean_white', label: 'Clean white (editorial)' },
          { id: 'premium_dark', label: 'Premium dark (luxe)' },
          { id: 'cold_clinical', label: 'Cool clinical (scientific)' },
          { id: 'luxe_marble', label: 'Luxe marble (spa)' },
        ],
      },
      {
        id: 'accent_color',
        label: 'Accent colour',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'forest_green', label: 'Forest green' },
          { id: 'deep_blue', label: 'Deep blue' },
          { id: 'warm_amber', label: 'Warm amber' },
          { id: 'monochrome', label: 'Monochrome' },
        ],
      },
    ],
  },

  {
    id: 'clinical_authority',
    label: 'Clinical Authority',
    blurb: 'Pharma-grade composition. Builds trust through restraint.',
    description: 'A pharmaceutical-editorial photograph — the product staged with scientific authority but editorial restraint. Builds credibility.',
    kind: 'image',
    icon: '🧪',
    defaultAspect: '4:5',
    aspectAllowed: ['4:5', '1:1', '16:9'],
    fields: [
      {
        id: 'mood',
        label: 'Aesthetic',
        type: 'select',
        required: true,
        options: [
          { id: 'pharmaceutical', label: 'Pharmaceutical (white, pristine)' },
          { id: 'lab_research', label: 'Lab research (stainless surface)' },
          { id: 'scientific_authority', label: 'Authority (slate, hard light)' },
        ],
      },
      {
        id: 'include_data_visual',
        label: 'Include a subtle data anchor?',
        type: 'select',
        layout: 'chips',
        required: true,
        hint: 'A faint sparkline or molecular line behind the product — implies rigor without being a literal chart.',
        options: [
          { id: 'no', label: 'No' },
          { id: 'yes', label: 'Yes — subtle' },
        ],
      },
      {
        id: 'accent',
        label: 'Accent',
        type: 'select',
        layout: 'chips',
        required: true,
        options: [
          { id: 'clinical_blue', label: 'Clinical blue' },
          { id: 'charcoal', label: 'Charcoal' },
          { id: 'monochrome', label: 'Pure neutrals' },
        ],
      },
    ],
  },

  {
    id: 'cinema_motion',
    label: 'Cinematic Motion',
    blurb: 'A slow, premium camera move on the product. TV-spot quality.',
    description: 'A short cinematic video — a slow motorised camera move on the product. Print-grade lighting, magazine-cover composition in motion.',
    kind: 'video',
    icon: '🎬',
    defaultAspect: '9:16',
    aspectAllowed: ['9:16', '1:1', '16:9'],
    durations_s: [5, 10],
    defaultDuration: 5,
    fields: [
      {
        id: 'camera_move',
        label: 'Camera move',
        type: 'select',
        required: true,
        options: [
          { id: 'push_in', label: 'Slow push-in to label macro' },
          { id: 'orbit', label: 'Horizontal arc / orbit' },
          { id: 'pull_back', label: 'Pull-back reveal' },
          { id: 'lateral', label: 'Lateral dolly slide' },
        ],
      },
      {
        id: 'mood',
        label: 'Mood & grade',
        type: 'select',
        required: true,
        options: [
          { id: 'warm_premium', label: 'Warm premium (golden hour)' },
          { id: 'cool_clinical', label: 'Cool clinical (scientific)' },
          { id: 'dramatic_dark', label: 'Dramatic dark (luxe)' },
          { id: 'golden_hour', label: 'Golden hour (Apple TV+ feel)' },
        ],
      },
    ],
  },

  {
    id: 'energy_reveal',
    label: 'Energy Reveal',
    blurb: 'A vibrant, energetic reveal. Built for the scroll-stop moment.',
    description: 'A short energetic video — punchy pacing, vibrant colour, the product as the focal anchor. Scroll-stopping in feed and reels.',
    kind: 'video',
    icon: '⚡',
    defaultAspect: '9:16',
    aspectAllowed: ['9:16', '1:1', '16:9'],
    durations_s: [5, 10],
    defaultDuration: 5,
    fields: [
      {
        id: 'pace',
        label: 'Pacing',
        type: 'select',
        required: true,
        options: [
          { id: 'gentle_build', label: 'Gentle build (calm → energetic)' },
          { id: 'fast_cut', label: 'Fast cut (rhythmic punch)' },
          { id: 'pulse_drop', label: 'Pulse drop (slow burn → moment)' },
        ],
      },
      {
        id: 'mood',
        label: 'Palette',
        type: 'select',
        required: true,
        options: [
          { id: 'vibrant', label: 'Vibrant (orange / electric blue)' },
          { id: 'cool_blue', label: 'Cool electric blue' },
          { id: 'warm_sunset', label: 'Warm sunset (amber)' },
          { id: 'clean_white', label: 'Crisp clean white' },
        ],
      },
    ],
  },

  {
    id: 'premium_closeup',
    label: 'Premium Close-up',
    blurb: 'Watch-advertising-grade tactile macro. Luxury feel.',
    description: 'A slow, considered close-up reveal of the product — label detail, material texture, paper grain. Watch-advertising pace.',
    kind: 'video',
    icon: '💎',
    defaultAspect: '1:1',
    aspectAllowed: ['1:1', '9:16', '16:9'],
    durations_s: [5, 10],
    defaultDuration: 5,
    fields: [
      {
        id: 'focus',
        label: 'Focus',
        type: 'select',
        required: true,
        options: [
          { id: 'label_detail', label: 'Label detail (tight macro)' },
          { id: 'liquid_pour', label: 'Liquid pour (slow-mo)' },
          { id: 'texture_reveal', label: 'Texture reveal (across surface)' },
          { id: 'box_open', label: 'Box open (first-person reveal)' },
        ],
      },
      {
        id: 'mood',
        label: 'Surface & mood',
        type: 'select',
        required: true,
        options: [
          { id: 'luxe_dark', label: 'Luxe dark (black walnut)' },
          { id: 'oak_warm', label: 'Warm oak' },
          { id: 'marble_cool', label: 'Cool marble (spa)' },
        ],
      },
    ],
  },
]

export function findAdType(id: AdTypeId | string): AdType | undefined {
  return AD_TYPES.find(t => t.id === id)
}

export function friendlyAdTypeLabel(id: string): string {
  return findAdType(id)?.label ?? 'Creative'
}
