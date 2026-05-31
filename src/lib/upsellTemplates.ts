/**
 * Upsell template registry.
 *
 * Each template represents a distinct "shape" of post-results upsell the
 * admin can pick from. The template controls:
 *   1. The default copy presets (headline / subheadline / CTA) the admin
 *      sees when creating an offer from this template.
 *   2. The cart-math mechanic the public `/upsell` page applies — quantity
 *      multiplier of the chosen primary, or pairing with an add-on
 *      product, with a percentage discount on top.
 *
 * The page layout itself is shared — templates differ in numbers and copy
 * rather than in page structure. That keeps the design system consistent
 * while still giving the admin meaningful campaign variety.
 */

export type UpsellTemplateId =
  | 'three_month_supply'
  | 'six_month_supply'
  | 'annual_vip'
  | 'stack_complement'

export interface UpsellTemplate {
  id: UpsellTemplateId
  label: string
  /** Short description shown to admins on the template-picker cards. */
  summary: string
  /** Longer copy explaining when to use this template. */
  rationale: string
  /** How many months of the primary product the customer ends up with. */
  months: number
  /** Default discount %. Admin can override per-offer. */
  defaultDiscountPct: number
  /** Default timer in seconds for the urgency banner. */
  defaultTimerSeconds: number
  /** Whether this template requires an add-on product id. */
  requiresAddon: boolean
  /** Headline preset. `{name}`, `{sku}`, `{months}`, `{discount}` get replaced at render time. */
  headlineTemplate: string
  /** Subheadline preset. Same token substitution. */
  subheadlineTemplate: string
  /** CTA preset. Same token substitution. `{price}` is also available. */
  ctaTemplate: string
  /** Big primary-card tag, e.g. "🏆 RECOMMENDED — BEST VALUE". */
  primaryTag: string
  /** Big primary-card title, e.g. "3-Month Supply". */
  primaryTitle: string
  /** Bullet points shown on the primary (upsell) plan card. */
  primaryBullets: string[]
  /** What the customer keeps on the "current order" card label. */
  baselineTitle: string
  /** Last-chance section copy. */
  finalNudge: string
}

export const UPSELL_TEMPLATES: Record<UpsellTemplateId, UpsellTemplate> = {
  three_month_supply: {
    id: 'three_month_supply',
    label: '3-Month Supply',
    summary: 'Quantity upgrade — 3× the primary peptide at a discount.',
    rationale:
      'Best for first-time customers who selected a 1-month dose. Frames the 3-month commitment as the protocol-correct choice and the cheaper per-month option.',
    months: 3,
    defaultDiscountPct: 20,
    defaultTimerSeconds: 600,
    requiresAddon: false,
    headlineTemplate:
      '{name}, lock in 3 months of {sku} and save an extra {discount}%',
    subheadlineTemplate:
      "You already chose the right compound. Now choose the smart commitment. Most customers who see results at 30 days wish they'd ordered the 3-month supply from the start.",
    ctaTemplate: 'Yes — Upgrade to 3 Months for £{price} →',
    primaryTag: '🏆 RECOMMENDED — BEST VALUE',
    primaryTitle: '3-Month Supply',
    primaryBullets: [
      '3 vials of {compound}',
      'Full 90-day protocol',
      'Free priority UK shipping',
      'Price locked — no increases',
      'No supply gaps, no re-ordering',
      'Extended dosing guide included',
    ],
    baselineTitle: '1-Month Supply',
    finalNudge:
      "The {discount}% three-month discount is only available right now, right here. If you come back tomorrow, you'll pay full price — or it won't be available at all.",
  },

  six_month_supply: {
    id: 'six_month_supply',
    label: '6-Month Protocol',
    summary: 'Half-year commitment — 6× the primary peptide, deepest discount.',
    rationale:
      'For confident customers ready to commit. Frames 6 months as the full clinical protocol cycle with the biggest per-unit savings.',
    months: 6,
    defaultDiscountPct: 30,
    defaultTimerSeconds: 600,
    requiresAddon: false,
    headlineTemplate:
      '{name}, the full 6-month protocol — locked at {discount}% off',
    subheadlineTemplate:
      'Real clinical results compound over 6 months, not 30 days. Lock in your full cycle today at our best per-vial price and never worry about re-ordering for the next six months.',
    ctaTemplate: 'Yes — Lock In 6 Months for £{price} →',
    primaryTag: '💎 BEST VALUE — 6 MONTHS',
    primaryTitle: '6-Month Protocol',
    primaryBullets: [
      '6 vials of {compound}',
      'Full 180-day protocol — clinical cycle',
      'Free priority UK shipping every batch',
      'Price locked for 6 months',
      'Personalised dosing escalation plan',
      'Priority support — same-day reply',
    ],
    baselineTitle: '1-Month Supply',
    finalNudge:
      'The 6-month protocol price is only available on this page. After you leave, the next time you order will be at full retail — and supply on long-cycle SKUs is limited.',
  },

  annual_vip: {
    id: 'annual_vip',
    label: 'Annual VIP',
    summary: 'Full-year supply with VIP framing — 12×, biggest discount.',
    rationale:
      "Premium option for serious customers. Positions the year-long supply as a VIP membership with the steepest price break — best for high-AOV brands.",
    months: 12,
    defaultDiscountPct: 40,
    defaultTimerSeconds: 900,
    requiresAddon: false,
    headlineTemplate:
      '{name}, go VIP — your full year of {sku} at {discount}% off',
    subheadlineTemplate:
      "VIP customers get an entire year of supply, locked at the best price we offer, with priority shipping every quarter and a dedicated peptide specialist on call. Less than 5% of customers see this page.",
    ctaTemplate: 'Yes — Become a VIP for £{price} →',
    primaryTag: '👑 VIP — ANNUAL SUPPLY',
    primaryTitle: 'Annual VIP Membership',
    primaryBullets: [
      '12 vials of {compound} — full year',
      'Quarterly priority shipping (4 drops)',
      'Dedicated peptide specialist line',
      'Annual lab review & protocol refresh',
      'Price frozen for 12 months — guaranteed',
      'First access to new compounds',
    ],
    baselineTitle: '1-Month Supply',
    finalNudge:
      'VIP allocation is capped each month. Once the slots are filled the annual price reverts to retail — typically a £400+ swing on a year of supply.',
  },

  stack_complement: {
    id: 'stack_complement',
    label: 'Complementary Stack',
    summary: 'Pair the order with a SECOND peptide at a bundle price.',
    rationale:
      'For when the recommended peptide pairs well with a recovery or longevity compound (e.g. Retatrutide + BPC-157). Admin picks the add-on product; customer gets both for the bundle discount.',
    months: 1,
    defaultDiscountPct: 25,
    defaultTimerSeconds: 600,
    requiresAddon: true,
    headlineTemplate:
      '{name}, stack {sku} with the perfect complement — save {discount}% on the pair',
    subheadlineTemplate:
      "Single peptides work. Stacks work better. Adding the right second compound multiplies your results without doubling your spend — and we'll only ever recommend a pairing we'd run ourselves.",
    ctaTemplate: 'Yes — Add the Stack for £{price} →',
    primaryTag: '⚡ SMART STACK — PAIRED PROTOCOL',
    primaryTitle: 'Complete Stack',
    primaryBullets: [
      '1 vial of {compound} (your primary)',
      '1 vial of the recommended complement',
      'Stack-specific dosing protocol',
      'Free priority UK shipping',
      "Shipped together — won't ship without both",
      'Email check-in at day 14',
    ],
    baselineTitle: 'Single peptide',
    finalNudge:
      "Stack pricing is only offered at this step. If you add the complement later, you'll pay the full second-vial price.",
  },
}

export const TEMPLATE_ORDER: UpsellTemplateId[] = [
  'three_month_supply',
  'six_month_supply',
  'annual_vip',
  'stack_complement',
]

/** Returns the template for an id, falling back to 3-month supply (the legacy default). */
export function resolveTemplate(id: string | null | undefined): UpsellTemplate {
  if (id && id in UPSELL_TEMPLATES) {
    return UPSELL_TEMPLATES[id as UpsellTemplateId]
  }
  return UPSELL_TEMPLATES.three_month_supply
}

interface TokenContext {
  name?: string
  sku?: string
  compound?: string
  months?: number
  discount?: number
  price?: number
}

/** Replaces `{name}`, `{sku}`, `{compound}`, `{months}`, `{discount}`, `{price}` tokens. */
export function fillTokens(text: string, ctx: TokenContext): string {
  return text
    .replace(/\{name\}/g, ctx.name ?? 'there')
    .replace(/\{sku\}/g, ctx.sku ?? '')
    .replace(/\{compound\}/g, ctx.compound ?? '')
    .replace(/\{months\}/g, String(ctx.months ?? ''))
    .replace(/\{discount\}/g, String(ctx.discount ?? ''))
    .replace(/\{price\}/g, String(ctx.price ?? ''))
}
