import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { PreviewPanel } from '../../components/PreviewPanel'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'
import {
  TEMPLATE_ORDER,
  UPSELL_TEMPLATES,
  resolveTemplate,
  type UpsellTemplateId,
} from '../../../lib/upsellTemplates'
import { PEPTIDES } from '../../../data/peptides'

interface OfferRow {
  id: string
  product_id: string
  discount_pct: number
  timer_seconds: number
  headline: string | null
  subheadline: string | null
  cta: string | null
  active: boolean
  sort_order: number
  template: UpsellTemplateId
  months: number
  addon_product_id: string | null
}

interface Draft {
  template: UpsellTemplateId
  product_id: string
  addon_product_id: string
  months: number
  discount_pct: number
  timer_seconds: number
  headline: string
  subheadline: string
  cta: string
  active: boolean
  sort_order: number
}

const BLANK: Draft = {
  template: 'three_month_supply',
  product_id: '',
  addon_product_id: '',
  months: 3,
  discount_pct: 20,
  timer_seconds: 600,
  headline: '',
  subheadline: '',
  cta: '',
  active: false,
  sort_order: 100,
}

function draftFromTemplate(id: UpsellTemplateId, current: Draft): Draft {
  const tpl = UPSELL_TEMPLATES[id]
  return {
    ...current,
    template: id,
    months: tpl.months,
    discount_pct: tpl.defaultDiscountPct,
    timer_seconds: tpl.defaultTimerSeconds,
    // Reset copy fields so the live page falls back to the template
    // presets — admin can still type custom copy here.
    headline: '',
    subheadline: '',
    cta: '',
    // Stack template needs a sensible default addon if the admin
    // hasn't picked one yet.
    addon_product_id: id === 'stack_complement'
      ? (current.addon_product_id || (PEPTIDES.find(p => p.id !== current.product_id)?.id ?? ''))
      : '',
    // Newly created offers should always be staged inactive.
    active: false,
  }
}

export default function UpsellOffersPage() {
  const { data: offers = [], isLoading } = useBrandList<OfferRow>({
    table: 'upsell_offers',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { upsert, remove } = useBrandMutation({ table: 'upsell_offers' })
  const [draft, setDraft] = useState<Draft>(BLANK)
  const [error, setError] = useState<string | null>(null)

  const template = useMemo(() => resolveTemplate(draft.template), [draft.template])
  const needsAddon = template.requiresAddon

  const handleAdd = async () => {
    setError(null)
    if (!draft.product_id) { setError('Product ID is required'); return }
    if (needsAddon && !draft.addon_product_id) {
      setError('This template needs an add-on product ID'); return
    }
    try {
      await upsert.mutateAsync({
        row: {
          template: draft.template,
          product_id: draft.product_id,
          addon_product_id: needsAddon ? draft.addon_product_id : null,
          months: draft.months,
          discount_pct: draft.discount_pct,
          timer_seconds: draft.timer_seconds,
          headline: draft.headline || null,
          subheadline: draft.subheadline || null,
          cta: draft.cta || null,
          active: draft.active,
          sort_order: draft.sort_order,
        },
      })
      setDraft(BLANK)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const previewUrl = useMemo(() => {
    const offer = {
      id: 'preview',
      product_id: draft.product_id || '17',
      addon_product_id: draft.addon_product_id || null,
      template: draft.template,
      months: draft.months,
      discount_pct: draft.discount_pct,
      timer_seconds: draft.timer_seconds,
      headline: draft.headline || null,
      subheadline: draft.subheadline || null,
      cta: draft.cta || null,
      active: true,
      sort_order: draft.sort_order,
    }
    const encoded = encodeURIComponent(btoa(JSON.stringify(offer)))
    return `/upsell?preview=1&offer=${encoded}`
  }, [draft])

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Upsell offers"
        description="Pick a template, customise the copy, activate when ready. By default no upsell is shown — customers go straight from results to checkout. Activating one offer routes the funnel through /upsell."
      />

      {/* TEMPLATE PICKER */}
      <Card className="mb-6">
        <CardHeader
          title="Start from a template"
          description="Each template defines a different offer strategy. Pick one to prefill the form below."
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATE_ORDER.map(id => {
              const tpl = UPSELL_TEMPLATES[id]
              const active = draft.template === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft(d => draftFromTemplate(id, d))}
                  className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary-soft)] shadow-[0_0_0_1px_var(--color-admin-primary)_inset]'
                      : 'border-[var(--color-admin-border)] bg-[var(--color-admin-surface-elevated)] hover:border-[var(--color-admin-border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--color-admin-text-strong)]">{tpl.label}</span>
                    <span className="rounded-full bg-[var(--color-admin-bg-soft)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-admin-muted)]">
                      {tpl.months}× · {tpl.defaultDiscountPct}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--color-admin-muted)]">{tpl.summary}</p>
                  <p className="text-[11px] leading-relaxed text-[var(--color-admin-subtle)]">{tpl.rationale}</p>
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* PREVIEW */}
      <PreviewPanel
        className="mb-6"
        title={`Live preview · ${template.label}`}
        description="The actual /upsell page rendered with your draft values"
        defaultViewport="desktop"
      >
        {({ height }) => (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Upsell preview"
            style={{
              width: '100%',
              height: height + 80,
              border: 0,
              display: 'block',
              background: '#ffffff',
            }}
          />
        )}
      </PreviewPanel>

      {/* FORM */}
      <Card className="mb-4">
        <CardHeader
          title="Offer details"
          description={`Editing a "${template.label}" offer. Leave copy fields blank to use the template defaults.`}
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label hint="Primary peptide product ID (e.g. 17 for Retatrutide).">
            Primary product ID
            <Input value={draft.product_id} onChange={e => setDraft(d => ({ ...d, product_id: e.target.value }))} />
          </Label>

          {needsAddon ? (
            <Label hint="Second peptide that pairs with the primary. Will be shown together at the bundle discount.">
              Add-on product ID
              <Input value={draft.addon_product_id} onChange={e => setDraft(d => ({ ...d, addon_product_id: e.target.value }))} />
            </Label>
          ) : (
            <Label hint="Number of months of supply the upsell delivers.">
              Months of supply
              <Input
                type="number"
                min={1}
                value={draft.months}
                onChange={e => setDraft(d => ({ ...d, months: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </Label>
          )}

          <Label hint="Percentage off the regular multi-month price.">
            Discount %
            <Input type="number" step="0.01" value={draft.discount_pct} onChange={e => setDraft(d => ({ ...d, discount_pct: Number(e.target.value) }))} />
          </Label>
          <Label hint="Countdown duration in seconds. 600 = 10 minutes.">
            Timer seconds
            <Input type="number" value={draft.timer_seconds} onChange={e => setDraft(d => ({ ...d, timer_seconds: Number(e.target.value) }))} />
          </Label>

          <Label className="sm:col-span-2" hint={`Tokens: {name} {sku} {compound} {months} {discount} {price}. Default: "${template.headlineTemplate}"`}>
            Headline override
            <Input value={draft.headline} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} placeholder="Leave blank for template default" />
          </Label>
          <Label className="sm:col-span-2" hint="Same tokens supported as headline.">
            Sub-headline override
            <Input value={draft.subheadline} onChange={e => setDraft(d => ({ ...d, subheadline: e.target.value }))} placeholder="Leave blank for template default" />
          </Label>
          <Label hint={`Default: "${template.ctaTemplate}"`}>
            CTA override
            <Input value={draft.cta} onChange={e => setDraft(d => ({ ...d, cta: e.target.value }))} placeholder="Leave blank for template default" />
          </Label>
          <Label hint="Lower number = higher priority when multiple offers are active.">
            Sort order
            <Input type="number" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))} />
          </Label>

          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              checked={draft.active}
              onChange={active => setDraft(d => ({ ...d, active }))}
              label="Active"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[var(--color-admin-text)]">
                {draft.active ? 'Active — funnel detours through /upsell' : 'Staged — funnel skips upsell'}
              </span>
              <span className="text-xs text-[var(--color-admin-muted)]">
                Leave staged while reviewing copy. Toggle on when ready to ship.
              </span>
            </div>
          </div>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save offer'}
          </Button>
        </CardFooter>
      </Card>

      {/* LIST */}
      <Card>
        <CardHeader
          title={`${offers.length} ${offers.length === 1 ? 'offer' : 'offers'}`}
          description="At most one offer should be active per brand. The lowest sort_order wins if multiple are active."
        />
        {isLoading ? (
          <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div>
        ) : offers.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">
            No offers configured. Pick a template above and save — it will stay staged until you toggle it active.
          </div>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Template</Th>
                <Th>Primary</Th>
                <Th>Math</Th>
                <Th>Headline override</Th>
                <Th>Status</Th>
                <Th>Sort</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {offers.map(o => {
                const tpl = resolveTemplate(o.template)
                return (
                  <Tr key={o.id}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[var(--color-admin-text-strong)]">{tpl.label}</span>
                        <span className="font-mono text-[10px] text-[var(--color-admin-subtle)]">{o.template}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">
                      {o.product_id}
                      {o.addon_product_id ? <span className="text-[var(--color-admin-subtle)]"> + {o.addon_product_id}</span> : null}
                    </Td>
                    <Td className="text-sm">
                      {tpl.requiresAddon
                        ? <>pair · {o.discount_pct}% off</>
                        : <>{o.months}× · {o.discount_pct}% off</>}
                    </Td>
                    <Td className="max-w-xs truncate text-sm">{o.headline ?? <span className="text-[var(--color-admin-subtle)]">(template default)</span>}</Td>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.active ? 'bg-[var(--color-admin-success-soft)] text-[var(--color-admin-success)]' : 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-muted)]'}`}>
                        {o.active ? 'Active' : 'Staged'}
                      </span>
                    </Td>
                    <Td className="text-sm">{o.sort_order}</Td>
                    <Td className="text-right">
                      <button
                        className="text-sm text-[var(--color-admin-danger)] hover:underline"
                        onClick={() => { if (confirm('Delete this offer?')) void remove.mutate({ id: o.id }) }}
                      >
                        Delete
                      </button>
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  )
}
