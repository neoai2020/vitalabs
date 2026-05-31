/**
 * Generates Facebook ad copy (primary text, 3 headlines, description, CTA)
 * using Gemini 2.0 Flash with a strict JSON response schema.
 *
 * Used by both generate-ad-image (per variant) and poll-ad-jobs (when a
 * video finalises). The copy is stored on ad_creatives.metadata.ad_copy
 * so the Studio library can render copy-to-clipboard buttons next to
 * each creative.
 *
 * Hard constraints:
 *  - UK English. The brands ship in the UK.
 *  - No medical or therapeutic claims. We sell consumer-research compounds.
 *  - Character ceilings match what Meta accepts in the ad form:
 *      primary_text  ≤ 200 chars (Meta truncates at ~125 in feed)
 *      headline      ≤ 40 chars  (each — we generate three)
 *      description   ≤ 60 chars
 *  - CTA must be one of Meta's enum values.
 *
 * Failure model: copy generation is best-effort. If Gemini fails or
 * returns invalid JSON we return null and the creative is still saved
 * with no copy — the operator can hit "Regenerate copy" from the library.
 */

export type AdCta =
  | 'SHOP_NOW'
  | 'LEARN_MORE'
  | 'GET_OFFER'
  | 'ORDER_NOW'
  | 'SIGN_UP'
  | 'SUBSCRIBE'

export interface AdCopy {
  primary_text: string
  headlines: string[]
  description: string
  cta: AdCta
  hook_angle: string
  compliance_note: string
}

export interface AdCopyContext {
  brand_name: string
  product_name: string
  product_tagline: string
  primary_benefit: string
  /** 'lifestyle' | 'problem_solution' | 'ugc' etc. — used to bias tone. */
  creative_angle: string
  /** Long visual prompt that was sent to the image/video model — gives
   *  Gemini context about the visual mood so copy matches the image. */
  visual_prompt: string
  /** 'image' | 'video' — UGC video copy reads differently from static. */
  kind: 'image' | 'video'
}

const GEMINI_TEXT_MODEL = 'gemini-2.0-flash'
const GEMINI_TEXT_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_TEXT_MODEL}:generateContent`

/** Produces the copywriter system prompt + structured output schema and
 *  calls Gemini. Returns null on any failure (caller must handle absence). */
export async function generateAdCopy(
  apiKey: string,
  ctx: AdCopyContext,
): Promise<AdCopy | null> {
  const briefing = buildBriefing(ctx)
  const responseSchema = {
    type: 'object',
    properties: {
      primary_text: { type: 'string' },
      headlines: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
      description: { type: 'string' },
      cta: {
        type: 'string',
        enum: ['SHOP_NOW', 'LEARN_MORE', 'GET_OFFER', 'ORDER_NOW', 'SIGN_UP', 'SUBSCRIBE'],
      },
      hook_angle: { type: 'string' },
      compliance_note: { type: 'string' },
    },
    required: ['primary_text', 'headlines', 'description', 'cta', 'hook_angle', 'compliance_note'],
  }

  let res: Response
  try {
    res = await fetch(GEMINI_TEXT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: briefing }] }],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    })
  } catch (err) {
    console.warn('[adCopy] gemini text request threw', err)
    return null
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn('[adCopy] gemini text failed', res.status, body.slice(0, 200))
    return null
  }

  const json = await res.json().catch(() => null) as
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    | null
  if (!json) return null

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    console.warn('[adCopy] gemini returned non-JSON', err, text.slice(0, 200))
    return null
  }

  const copy = normaliseAdCopy(parsed)
  if (!copy) return null
  return clampAdCopy(copy)
}


/** Builds the copywriter brief sent to Gemini. Kept verbose deliberately —
 *  Facebook copy that converts has a specific shape (pattern interrupt
 *  opener, plain-English benefit, soft CTA) and we want the model to
 *  reproduce that shape without the operator having to teach it. */
function buildBriefing(ctx: AdCopyContext): string {
  const angleHint = ANGLE_HINTS[ctx.creative_angle] ?? ANGLE_HINTS.default
  const kindHint = ctx.kind === 'video'
    ? 'This copy will run alongside a vertical video creative. Lead with a curiosity hook that pairs with motion.'
    : 'This copy will run alongside a static image creative. Lead with a high-contrast statement that survives a thumb-stop.'

  return [
    'You are a senior direct-response Facebook ad copywriter for a premium UK wellness brand.',
    'Write copy that matches the visual concept below. Output strictly valid JSON matching the supplied schema.',
    '',
    `BRAND: ${ctx.brand_name}`,
    `PRODUCT: ${ctx.product_name}`,
    `TAGLINE: ${ctx.product_tagline || '—'}`,
    `PRIMARY BENEFIT: ${ctx.primary_benefit}`,
    `CREATIVE ANGLE: ${ctx.creative_angle} — ${angleHint}`,
    `FORMAT: ${ctx.kind}. ${kindHint}`,
    '',
    'VISUAL PROMPT FOR CONTEXT (do not quote verbatim, use it to match tone):',
    ctx.visual_prompt.slice(0, 800),
    '',
    'HARD RULES:',
    '- UK English spelling (colour, recognise, optimise).',
    '- NO medical, therapeutic, or before/after weight claims.',
    '- NO mention of needles, injections, syringes, prescription drugs.',
    '- NO emojis. NO hashtags. NO ALL-CAPS shouting.',
    '- Tone: confident, calm, scientific, conversational. Never hype.',
    '- Comply with Meta\'s advertising policy for health and wellness.',
    '',
    'OUTPUT REQUIREMENTS:',
    '- primary_text: 120-180 characters. Open with a one-line pattern interrupt that earns the next sentence. Plain-English benefit. End with a soft CTA.',
    '- headlines: array of exactly 3 short headlines, each ≤ 40 characters, each angled differently (1: curiosity, 2: social proof, 3: direct benefit). Headlines must NOT be variations of the same phrase.',
    '- description: ≤ 60 characters news-feed description that reinforces the headline.',
    '- cta: one of SHOP_NOW, LEARN_MORE, GET_OFFER, ORDER_NOW, SIGN_UP, SUBSCRIBE. Pick the most natural for the angle.',
    '- hook_angle: one short sentence summarising the strategic angle, for the operator.',
    '- compliance_note: one short sentence flagging anything Meta might catch (or "none — copy reads policy-safe").',
  ].join('\n')
}


const ANGLE_HINTS: Record<string, string> = {
  testimonial_card: 'Lean on social proof, real-person voice, specific noticed change.',
  before_after: 'Frame the contrast in lifestyle terms, never body-shaming.',
  problem_solution: 'Open with the problem in the reader\'s own words, then resolve.',
  lifestyle: 'Drop the reader into a calm morning where the product fits.',
  ugc: 'Casual, slightly stumbling, friend-recommending-friend voice. Specific noticed change.',
  unboxing: 'Tactile language — first impression, feel in the hand, label detail.',
  product_review: 'Confident magazine-host tone. Honest, low-hype, decisive.',
  tv_spot: 'Cinematic, restrained, evocative. Headline-first, body sparse.',
  hyper_motion: 'Energy, momentum, short rhythmic sentences.',
  default: 'Direct, calm, confident.',
}


/** Coerces an unknown JSON shape into a strict AdCopy, returning null
 *  if the model deviated from the schema. */
function normaliseAdCopy(raw: unknown): AdCopy | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.primary_text !== 'string') return null
  if (!Array.isArray(r.headlines)) return null
  const headlines = r.headlines.filter((h): h is string => typeof h === 'string' && h.length > 0)
  if (headlines.length < 1) return null
  if (typeof r.description !== 'string') return null
  if (typeof r.cta !== 'string') return null
  const allowedCta: AdCta[] = ['SHOP_NOW', 'LEARN_MORE', 'GET_OFFER', 'ORDER_NOW', 'SIGN_UP', 'SUBSCRIBE']
  const cta = allowedCta.includes(r.cta as AdCta) ? (r.cta as AdCta) : 'SHOP_NOW'
  return {
    primary_text: r.primary_text,
    headlines,
    description: r.description,
    cta,
    hook_angle: typeof r.hook_angle === 'string' ? r.hook_angle : '',
    compliance_note: typeof r.compliance_note === 'string' ? r.compliance_note : '',
  }
}


/** Last-mile safety net: trims any field that exceeds Meta's limits. */
function clampAdCopy(c: AdCopy): AdCopy {
  return {
    ...c,
    primary_text: trim(c.primary_text, 200),
    headlines: c.headlines.slice(0, 3).map(h => trim(h, 40)),
    description: trim(c.description, 60),
  }
}

function trim(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
