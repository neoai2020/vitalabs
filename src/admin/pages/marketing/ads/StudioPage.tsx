import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { useBrandList } from '../../../hooks/useBrandQuery'
import { useAdminBrand } from '../../../context/AdminBrandContext'
import { supabase } from '../../../../lib/supabase'
import { AdsTabBar } from './AdsTabBar'
import {
  AD_TYPES,
  ASPECT_RATIOS,
  findAdType,
  friendlyAdTypeLabel,
  type AdType,
  type AdTypeId,
  type AspectRatio,
  type CreativeKind,
  type FormField,
} from './creativeModels'

interface ProductRow {
  id: string
  compound: string
  tagline: string | null
  image_url: string | null
  status: 'draft' | 'active' | 'archived'
}

interface CreativeRow {
  id: string
  kind: CreativeKind
  generator: string
  preset: string | null
  prompt: string | null
  public_url: string
  thumbnail_url: string | null
  aspect_ratio: string
  status: 'ready' | 'failed' | 'archived'
  starred: boolean
  created_at: string
  product_id: string | null
  metadata: CreativeMetadata | null
}

interface CreativeMetadata {
  ad_type?: string
  config?: Record<string, string | number | boolean | null>
  variant_index?: number
  ad_copy?: AdCopy | null
  [key: string]: unknown
}

interface AdCopy {
  primary_text: string
  headlines: string[]
  description: string
  cta: string
  hook_angle: string
  compliance_note: string
}

interface JobRow {
  id: string
  kind: 'generate_image' | 'generate_video' | 'publish_draft'
  status: 'queued' | 'running' | 'done' | 'failed'
  external_id: string | null
  params: Record<string, unknown>
  error: string | null
  created_at: string
}


/** Supabase's functions.invoke() wraps non-2xx responses as a
 *  FunctionsHttpError with the generic "Edge Function returned a
 *  non-2xx status code" message and the actual Response object on
 *  `.context`. Pulling the JSON body off that Response gives us the
 *  real error to display to the operator. */
async function extractEdgeFnError(err: unknown): Promise<string> {
  const generic = err instanceof Error ? err.message : 'Edge Function failed'
  const ctx = (err as { context?: Response | { body?: unknown; error?: string } } | null)?.context
  if (!ctx) return generic
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json() as { error?: string; details?: unknown }
      if (typeof body?.error === 'string' && body.error) return body.error
      if (body?.details) return `${generic} — ${JSON.stringify(body.details).slice(0, 240)}`
    } catch {
      const text = await ctx.clone().text().catch(() => '')
      if (text) return text.slice(0, 240)
    }
    return generic
  }
  const obj = ctx as { body?: unknown; error?: string }
  if (typeof obj.error === 'string' && obj.error) return obj.error
  if (typeof obj.body === 'string' && obj.body) return obj.body.slice(0, 240)
  return generic
}

export default function StudioPage() {
  const { brand } = useAdminBrand()
  const queryClient = useQueryClient()
  const { data: products = [], isLoading: productsLoading } = useBrandList<ProductRow>({
    table: 'products',
    select: 'id,compound,tagline,image_url,status',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { data: creatives = [], isLoading: creativesLoading } = useBrandList<CreativeRow>({
    table: 'ad_creatives',
    orderBy: { column: 'created_at', ascending: false },
  })
  const { data: jobs = [] } = useBrandList<JobRow>({
    table: 'ad_jobs',
    orderBy: { column: 'created_at', ascending: false },
  })

  const activeProducts = useMemo(
    () => products.filter(p => p.status !== 'archived'),
    [products],
  )
  const runningVideoJobs = useMemo(
    () => jobs.filter(j => j.kind === 'generate_video' && j.status === 'running'),
    [jobs],
  )

  /* Auto-poll the video engine while there's at least one running job.
   * Each tick re-invalidates the jobs + creatives queries so the UI
   * surfaces completions without a manual refresh. */
  useEffect(() => {
    if (runningVideoJobs.length === 0) return
    const tick = async () => {
      try {
        await supabase.functions.invoke('poll-ad-jobs', { body: { brand } })
      } catch (err) {
        console.warn('[Studio] poll tick failed', err)
      } finally {
        queryClient.invalidateQueries({ queryKey: ['ad_jobs', brand] })
        queryClient.invalidateQueries({ queryKey: ['ad_creatives', brand] })
      }
    }
    void tick()
    const t = setInterval(tick, 10000)
    return () => clearInterval(t)
  }, [runningVideoJobs.length, brand, queryClient])

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Ad Studio"
        description="Choose a style, answer a few questions, and the studio crafts on-brand image and video ads ready to publish."
      />
      <AdsTabBar />

      <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
        <StudioWizard products={activeProducts} productsLoading={productsLoading} />
        <div className="flex flex-col gap-6">
          {runningVideoJobs.length > 0 ? (
            <RunningJobsPanel jobs={runningVideoJobs} products={activeProducts} />
          ) : null}
          <CreativeLibrary creatives={creatives} loading={creativesLoading} products={activeProducts} />
        </div>
      </div>
    </>
  )
}

function RunningJobsPanel({ jobs, products }: { jobs: JobRow[]; products: ProductRow[] }) {
  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  return (
    <Card>
      <CardHeader title={`${jobs.length} video${jobs.length === 1 ? '' : 's'} crafting`} description="Usually ready in 30-120 seconds. The library refreshes automatically." />
      <CardBody className="flex flex-col gap-2">
        {jobs.map(j => {
          const params = j.params as { product_id?: string; ad_type?: string }
          const product = params.product_id ? byId.get(params.product_id) : null
          const ageS = Math.round((Date.now() - new Date(j.created_at).getTime()) / 1000)
          const styleLabel = params.ad_type ? friendlyAdTypeLabel(params.ad_type) : 'Creative'
          return (
            <div key={j.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-admin-primary)]/30" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">
                  {product?.compound ?? '—'} · {styleLabel}
                </div>
                <div className="text-xs text-[var(--color-admin-muted)]">
                  crafting for {ageS}s
                </div>
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}

/* ────────────────────────────────────────────────────────────────────────
 * The Wizard.
 *
 * Five steps: Style → Product → Configure → Format → Generate.
 * State lives on the wizard itself; each step is a focused subcomponent
 * that only sees what it needs. Step transitions are gated on
 * `canAdvance(step)` so the operator can't skip past required fields.
 * ──────────────────────────────────────────────────────────────────────── */

type WizardStep = 1 | 2 | 3 | 4 | 5

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Style',
  2: 'Product',
  3: 'Details',
  4: 'Format',
  5: 'Craft',
}

interface WizardProps {
  products: ProductRow[]
  productsLoading: boolean
}

function StudioWizard({ products, productsLoading }: WizardProps) {
  const { brand } = useAdminBrand()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<WizardStep>(1)
  const [adTypeId, setAdTypeId] = useState<AdTypeId | null>(null)
  const [productId, setProductId] = useState<string>('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [aspect, setAspect] = useState<AspectRatio>('1:1')
  const [duration, setDuration] = useState<number>(5)
  const [variants, setVariants] = useState<number>(2)

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genNote, setGenNote] = useState<string | null>(null)

  const adType = adTypeId ? findAdType(adTypeId) : null
  const product = useMemo(() => products.find(p => p.id === productId) ?? null, [products, productId])

  const requiredFields = useMemo<FormField[]>(() => (adType?.fields ?? []).filter(f => f.required), [adType])
  const missingRequired = useMemo(
    () => requiredFields.filter(f => !String(config[f.id] ?? '').trim()),
    [requiredFields, config],
  )

  const canAdvance = (s: WizardStep) => {
    if (s === 1) return !!adTypeId
    if (s === 2) return !!productId
    if (s === 3) return missingRequired.length === 0
    if (s === 4) return true
    return true
  }

  const pickAdType = (id: AdTypeId) => {
    setAdTypeId(id)
    setConfig({})
    setGenError(null)
    setGenNote(null)
    const type = findAdType(id)
    if (type) {
      setAspect(type.defaultAspect)
      if (type.defaultDuration) setDuration(type.defaultDuration)
    }
  }

  const reset = () => {
    setStep(1)
    setAdTypeId(null)
    setProductId('')
    setConfig({})
    setAspect('1:1')
    setDuration(5)
    setVariants(2)
    setGenError(null)
    setGenNote(null)
  }

  const generate = async () => {
    if (!adType || !productId) return
    setGenError(null)
    setGenNote(null)
    setGenerating(true)
    try {
      if (adType.kind === 'image') {
        const { data, error } = await supabase.functions.invoke('generate-ad-image', {
          body: {
            brand,
            product_id: productId,
            ad_type: adType.id,
            config,
            aspect_ratio: aspect,
            variants_n: variants,
          },
        })
        if (error) throw new Error(await extractEdgeFnError(error))
        const res = data as { ok?: boolean; creatives?: unknown[]; errors?: string[]; error?: string }
        if (!res?.ok) throw new Error(res?.error ?? 'Generation failed')
        const made = res.creatives?.length ?? 0
        setGenNote(`Crafted ${made} variant${made === 1 ? '' : 's'}${res.errors?.length ? ` · ${res.errors.length} failed` : ''}. Check the library →`)
        queryClient.invalidateQueries({ queryKey: ['ad_creatives', brand] })
      } else {
        const { data, error } = await supabase.functions.invoke('generate-ad-video', {
          body: {
            brand,
            product_id: productId,
            ad_type: adType.id,
            config,
            aspect_ratio: aspect,
            duration_s: duration,
          },
        })
        if (error) throw new Error(await extractEdgeFnError(error))
        const res = data as { ok?: boolean; error?: string; job_id?: string }
        if (!res?.ok) throw new Error(res?.error ?? 'Submission failed')
        setGenNote('Video submitted. Usually ready in 30-120 seconds — watch the panel to the right.')
        queryClient.invalidateQueries({ queryKey: ['ad_jobs', brand] })
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Create an ad"
        description={
          step === 1 ? 'Pick the style. Each one is tuned for a different scroll-stop moment.'
          : step === 2 ? 'Which product?'
          : step === 3 ? 'A few details so we can craft this exactly right.'
          : step === 4 ? 'Where will this run?'
          : 'Review and craft.'
        }
      />

      <CardBody className="flex flex-col gap-5">
        <StepIndicator current={step} />

        {step === 1 && (
          <StyleStep selected={adTypeId} onPick={pickAdType} />
        )}

        {step === 2 && (
          <ProductStep
            products={products}
            loading={productsLoading}
            selected={productId}
            onPick={setProductId}
          />
        )}

        {step === 3 && adType && (
          <DetailsStep adType={adType} config={config} setConfig={setConfig} />
        )}

        {step === 4 && adType && (
          <FormatStep
            adType={adType}
            aspect={aspect}
            setAspect={setAspect}
            duration={duration}
            setDuration={setDuration}
            variants={variants}
            setVariants={setVariants}
          />
        )}

        {step === 5 && adType && product && (
          <ReviewStep
            adType={adType}
            product={product}
            config={config}
            aspect={aspect}
            duration={duration}
            variants={variants}
            generating={generating}
            genError={genError}
            genNote={genNote}
            onGenerate={() => void generate()}
            onReset={reset}
          />
        )}

        <div className="mt-2 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as WizardStep)}
              className="text-sm text-[var(--color-admin-muted)] underline-offset-2 hover:text-[var(--color-admin-text-strong)] hover:underline"
            >
              ← Back
            </button>
          ) : <div />}

          {step < 5 ? (
            <Button
              onClick={() => canAdvance(step) && setStep((step + 1) as WizardStep)}
              disabled={!canAdvance(step)}
              title={!canAdvance(step) && step === 3 ? `Fill in: ${missingRequired.map(f => f.label).join(', ')}` : undefined}
            >
              Next →
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  )
}

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: WizardStep[] = [1, 2, 3, 4, 5]
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, idx) => {
        const isActive = s === current
        const isDone = s < current
        return (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-on-primary)] shadow-sm ring-2 ring-[var(--color-admin-primary)]/30'
                  : isDone
                  ? 'bg-[var(--color-admin-success)] text-white'
                  : 'bg-[var(--color-admin-bg-soft)] text-[var(--color-admin-muted)]'
              }`}
            >
              {isDone ? '✓' : s}
            </div>
            <div className={`text-[11px] font-medium uppercase tracking-wider ${isActive ? 'text-[var(--color-admin-text-strong)]' : 'text-[var(--color-admin-muted)]'}`}>
              {STEP_LABELS[s]}
            </div>
            {idx < steps.length - 1 ? (
              <div className={`h-px flex-1 ${isDone ? 'bg-[var(--color-admin-success)]' : 'bg-[var(--color-admin-border)]'}`} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function StyleStep({ selected, onPick }: { selected: AdTypeId | null; onPick: (id: AdTypeId) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {AD_TYPES.map(t => {
        const isActive = selected === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            className={`group relative flex h-full flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              isActive
                ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5 shadow-sm'
                : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-strong)] hover:bg-[var(--color-admin-bg-soft)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-admin-bg-soft)] text-xl">
                {t.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--color-admin-text-strong)]">{t.label}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{t.kind === 'video' ? 'Video' : 'Image'}</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-admin-muted)]">{t.blurb}</p>
            {isActive ? (
              <div className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-admin-primary)] text-[10px] text-[var(--color-admin-on-primary)]">
                ✓
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function ProductStep({
  products,
  loading,
  selected,
  onPick,
}: {
  products: ProductRow[]
  loading: boolean
  selected: string
  onPick: (id: string) => void
}) {
  if (loading) return <div className="text-sm text-[var(--color-admin-muted)]">Loading products…</div>
  if (products.length === 0) return <div className="text-sm text-[var(--color-admin-muted)]">No active products. Add one from the catalogue tab.</div>

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {products.map(p => {
        const isActive = selected === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
              isActive
                ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5 shadow-sm'
                : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-strong)] hover:bg-[var(--color-admin-bg-soft)]'
            }`}
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-admin-bg-soft)]">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">{p.compound}</div>
              {p.tagline ? <div className="truncate text-xs text-[var(--color-admin-muted)]">{p.tagline}</div> : null}
            </div>
            {isActive ? (
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-admin-primary)] text-[10px] text-[var(--color-admin-on-primary)]">
                ✓
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function DetailsStep({
  adType,
  config,
  setConfig,
}: {
  adType: AdType
  config: Record<string, string>
  setConfig: (c: Record<string, string>) => void
}) {
  const setField = (id: string, value: string) => setConfig({ ...config, [id]: value })

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-admin-surface)] text-lg">{adType.icon}</div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-admin-text-strong)]">{adType.label}</div>
            <div className="text-xs text-[var(--color-admin-muted)]">{adType.description}</div>
          </div>
        </div>
      </div>

      {adType.fields.map(field => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={config[field.id] ?? ''}
          onChange={v => setField(field.id, v)}
        />
      ))}
    </div>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: string
  onChange: (v: string) => void
}) {
  if (field.type === 'textarea') {
    return (
      <label className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
            {field.label}{field.required ? <span className="ml-0.5 text-[var(--color-admin-primary)]">*</span> : null}
          </span>
          {field.hint ? <span className="text-[11px] text-[var(--color-admin-muted)]">{field.hint}</span> : null}
        </div>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder}
          className="w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 py-2 text-sm text-[var(--color-admin-text)]"
        />
      </label>
    )
  }

  // Chips layout for short option sets, select for longer ones.
  if (field.layout === 'chips' && field.options) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
            {field.label}{field.required ? <span className="ml-0.5 text-[var(--color-admin-primary)]">*</span> : null}
          </span>
          {field.hint ? <span className="text-[11px] text-[var(--color-admin-muted)]">{field.hint}</span> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {field.options.map(opt => {
            const isActive = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)] text-[var(--color-admin-on-primary)] shadow-sm'
                    : 'border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] text-[var(--color-admin-text)] hover:border-[var(--color-admin-border-emphasis)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Default: select dropdown.
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
          {field.label}{field.required ? <span className="ml-0.5 text-[var(--color-admin-primary)]">*</span> : null}
        </span>
        {field.hint ? <span className="text-[11px] text-[var(--color-admin-muted)]">{field.hint}</span> : null}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 text-sm text-[var(--color-admin-text)]"
      >
        <option value="">Choose…</option>
        {field.options?.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}

function FormatStep({
  adType,
  aspect,
  setAspect,
  duration,
  setDuration,
  variants,
  setVariants,
}: {
  adType: AdType
  aspect: AspectRatio
  setAspect: (a: AspectRatio) => void
  duration: number
  setDuration: (d: number) => void
  variants: number
  setVariants: (n: number) => void
}) {
  const allowedAspects = adType.aspectAllowed ?? ASPECT_RATIOS.map(a => a.id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
          Placement / aspect
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ASPECT_RATIOS.filter(a => allowedAspects.includes(a.id)).map(a => {
            const isActive = aspect === a.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                  isActive
                    ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5 shadow-sm'
                    : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-strong)]'
                }`}
              >
                <AspectIcon ratio={a.id} active={isActive} />
                <div className="text-xs font-semibold text-[var(--color-admin-text-strong)]">{a.label}</div>
                <div className="text-[10px] text-[var(--color-admin-muted)]">{a.hint}</div>
              </button>
            )
          })}
        </div>
      </div>

      {adType.kind === 'video' && adType.durations_s ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
            Duration
          </span>
          <div className="flex gap-2">
            {adType.durations_s.map(d => {
              const isActive = duration === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5 text-[var(--color-admin-text-strong)] shadow-sm'
                      : 'border-[var(--color-admin-border)] text-[var(--color-admin-muted)] hover:border-[var(--color-admin-border-strong)]'
                  }`}
                >
                  {d}s
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {adType.kind === 'image' ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-text-strong)]">
            How many variants?
          </span>
          <div className="flex gap-2">
            {[1, 2, 4].map(n => {
              const isActive = variants === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariants(n)}
                  className={`flex-1 rounded-lg border p-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5 text-[var(--color-admin-text-strong)] shadow-sm'
                      : 'border-[var(--color-admin-border)] text-[var(--color-admin-muted)] hover:border-[var(--color-admin-border-strong)]'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-[var(--color-admin-muted)]">More variants = more to pick from, but slower and more cost.</p>
        </div>
      ) : null}
    </div>
  )
}

function AspectIcon({ ratio, active }: { ratio: AspectRatio; active: boolean }) {
  const dims = ratio === '9:16' ? { w: 14, h: 22 }
    : ratio === '4:5' ? { w: 18, h: 22 }
    : ratio === '16:9' ? { w: 26, h: 14 }
    : { w: 20, h: 20 }
  return (
    <div
      className={`rounded-sm border ${active ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/20' : 'border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)]'}`}
      style={{ width: dims.w, height: dims.h }}
    />
  )
}

function ReviewStep({
  adType,
  product,
  config,
  aspect,
  duration,
  variants,
  generating,
  genError,
  genNote,
  onGenerate,
  onReset,
}: {
  adType: AdType
  product: ProductRow
  config: Record<string, string>
  aspect: AspectRatio
  duration: number
  variants: number
  generating: boolean
  genError: string | null
  genNote: string | null
  onGenerate: () => void
  onReset: () => void
}) {
  // Resolve option ids → labels for the summary so the operator sees
  // human text, not raw enum values.
  const configSummary = useMemo(() => {
    return adType.fields.map(field => {
      const raw = config[field.id] ?? ''
      const label = field.options?.find(o => o.id === raw)?.label ?? raw
      return { label: field.label, value: label || '—' }
    })
  }, [adType, config])

  if (genNote && !generating) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--color-admin-success)]/40 bg-[var(--color-admin-success-soft,#e8f5ee)] p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-admin-success)] text-xl text-white">✓</div>
        <div className="text-sm font-semibold text-[var(--color-admin-text-strong)]">Done!</div>
        <div className="text-xs text-[var(--color-admin-muted)]">{genNote}</div>
        <Button onClick={onReset}>Craft another</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-admin-surface)] text-xl">{adType.icon}</div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-admin-text-strong)]">{adType.label}</div>
            <div className="text-xs text-[var(--color-admin-muted)]">{adType.kind === 'video' ? `${duration}s video` : `${variants} image variant${variants === 1 ? '' : 's'}`} · {aspect}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-[var(--color-admin-border)] pt-3">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
          ) : null}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">{product.compound}</div>
            {product.tagline ? <div className="truncate text-xs text-[var(--color-admin-muted)]">{product.tagline}</div> : null}
          </div>
        </div>

        {configSummary.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[var(--color-admin-border)] pt-3">
            {configSummary.map((s, i) => (
              <div key={i} className="flex flex-col">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{s.label}</dt>
                <dd className="truncate text-xs text-[var(--color-admin-text-strong)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {genError ? (
        <div className="rounded-md border border-[var(--color-admin-danger)]/40 bg-[var(--color-admin-danger)]/5 p-3 text-xs text-[var(--color-admin-danger)]">
          {genError}
        </div>
      ) : null}

      <Button onClick={onGenerate} disabled={generating}>
        {generating
          ? (adType.kind === 'video' ? 'Submitting…' : 'Crafting…')
          : `Craft ${adType.kind === 'video' ? 'the video' : `the image${variants > 1 ? 's' : ''}`}`}
      </Button>

      <p className="text-center text-[11px] text-[var(--color-admin-muted)]">
        {adType.kind === 'video'
          ? 'Video ads usually take 30-120 seconds and appear in the library when ready.'
          : 'Image ads take about 5-15 seconds.'}
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
 * Library + preview modal. Mostly unchanged from the previous design —
 * just updated to show the friendly ad-type label instead of the
 * engine identifier.
 * ──────────────────────────────────────────────────────────────────────── */

interface LibraryProps {
  creatives: CreativeRow[]
  loading: boolean
  products: ProductRow[]
}

function CreativeLibrary({ creatives, loading, products }: LibraryProps) {
  const productById = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products],
  )
  const [preview, setPreview] = useState<CreativeRow | null>(null)
  const previewProduct = preview?.product_id ? productById.get(preview.product_id) ?? null : null

  return (
    <>
      <Card>
        <CardHeader title="Library" description={creatives.length ? `${creatives.length} creative${creatives.length === 1 ? '' : 's'} · click to preview` : 'Your crafted ads land here'} />
        <CardBody className="flex flex-col gap-3">
          {loading ? (
            <div className="text-sm text-[var(--color-admin-muted)]">Loading…</div>
          ) : creatives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-admin-border)] p-6 text-center text-sm text-[var(--color-admin-muted)]">
              Nothing yet. Step through the wizard on the left to craft your first ad.
            </div>
          ) : (
            creatives.slice(0, 20).map(c => {
              const product = c.product_id ? productById.get(c.product_id) : null
              const copy = c.metadata?.ad_copy ?? null
              const styleLabel = c.metadata?.ad_type ? friendlyAdTypeLabel(c.metadata.ad_type) : (c.preset ? friendlyAdTypeLabel(c.preset) : (c.kind === 'video' ? 'Video' : 'Image'))
              return (
                <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-2 transition-colors hover:border-[var(--color-admin-border-strong)]">
                  <button
                    type="button"
                    onClick={() => setPreview(c)}
                    className="flex gap-3 text-left"
                    title="Click to preview"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--color-admin-surface)]">
                      {c.kind === 'image' ? (
                        <img src={c.public_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <>
                          {c.thumbnail_url ? (
                            <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <video
                              src={c.public_url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          )}
                          <div className="absolute inset-0 grid place-items-center bg-black/30">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[var(--color-admin-text-strong)] shadow-sm">
                              <PlayIcon />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">{product?.compound ?? '—'}</div>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{c.aspect_ratio}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--color-admin-muted)]">{styleLabel}</div>
                    </div>
                  </button>
                  {copy ? <AdCopyPanel copy={copy} /> : null}
                </div>
              )
            })
          )}
        </CardBody>
      </Card>

      {preview ? (
        <CreativePreviewModal
          creative={preview}
          product={previewProduct}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M3 2.2v7.6c0 .35.39.56.69.37l6-3.8a.44.44 0 0 0 0-.74l-6-3.8A.44.44 0 0 0 3 2.2Z" />
    </svg>
  )
}

function CreativePreviewModal({
  creative,
  product,
  onClose,
}: {
  creative: CreativeRow
  product: ProductRow | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const aspectClass =
    creative.aspect_ratio === '9:16' ? 'aspect-[9/16] max-h-[80vh] max-w-[min(90vw,calc(80vh*9/16))]'
    : creative.aspect_ratio === '16:9' ? 'aspect-video max-h-[80vh] w-full max-w-4xl'
    : creative.aspect_ratio === '4:5' ? 'aspect-[4/5] max-h-[80vh] max-w-[min(90vw,calc(80vh*4/5))]'
    : 'aspect-square max-h-[80vh] max-w-[min(90vw,80vh)]'

  const styleLabel = creative.metadata?.ad_type
    ? friendlyAdTypeLabel(creative.metadata.ad_type)
    : creative.preset
    ? friendlyAdTypeLabel(creative.preset)
    : creative.kind === 'video' ? 'Video' : 'Image'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col gap-3 rounded-xl bg-[var(--color-admin-surface)] p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--color-admin-text-strong)]">
              {product?.compound ?? 'Creative'}
            </div>
            <div className="mt-0.5 text-xs text-[var(--color-admin-muted)]">
              {styleLabel} · {creative.aspect_ratio}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={creative.public_url}
              download
              className="rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-admin-text-strong)] hover:border-[var(--color-admin-border-emphasis)]"
              onClick={e => e.stopPropagation()}
            >
              Download
            </a>
            <a
              href={creative.public_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-admin-text-strong)] hover:border-[var(--color-admin-border-emphasis)]"
              onClick={e => e.stopPropagation()}
            >
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-admin-text-strong)] hover:border-[var(--color-admin-border-emphasis)]"
              aria-label="Close preview"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid place-items-center overflow-auto rounded-lg bg-black/40">
          <div className={aspectClass}>
            {creative.kind === 'video' ? (
              <video
                src={creative.public_url}
                controls
                autoPlay
                playsInline
                className="h-full w-full rounded-md bg-black object-contain"
              />
            ) : (
              <img
                src={creative.public_url}
                alt={product?.compound ?? ''}
                className="h-full w-full rounded-md object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


/* Renders the Facebook ad copy bundle with one-click copy buttons. */
function AdCopyPanel({ copy }: { copy: AdCopy }) {
  return (
    <div className="rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">Facebook copy</div>
        <span className="rounded bg-[var(--color-admin-bg-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-admin-text-strong)]">
          CTA: {copy.cta}
        </span>
      </div>

      {copy.hook_angle ? (
        <div className="mt-1.5 text-[11.5px] italic text-[var(--color-admin-muted)]">
          Angle: {copy.hook_angle}
        </div>
      ) : null}

      <CopyableField label="Primary text" value={copy.primary_text} multiline />

      <div className="mt-1.5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">Headlines</div>
        <div className="mt-0.5 flex flex-col gap-1">
          {copy.headlines.map((h, idx) => (
            <CopyableField key={idx} label={`#${idx + 1}`} value={h} />
          ))}
        </div>
      </div>

      <CopyableField label="Description" value={copy.description} />

      {copy.compliance_note && copy.compliance_note.toLowerCase() !== 'none — copy reads policy-safe' ? (
        <div className="mt-1.5 rounded bg-[var(--color-admin-warning-soft)] px-2 py-1 text-[11px] text-[var(--color-admin-warning)]">
          ⚠ {copy.compliance_note}
        </div>
      ) : null}
    </div>
  )
}


function CopyableField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard can fail on insecure contexts; nothing graceful to do.
    }
  }
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{label}</span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-admin-text-strong)] transition-colors hover:border-[var(--color-admin-border-emphasis)]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className={`mt-0.5 text-xs text-[var(--color-admin-text-strong)] ${multiline ? '' : 'truncate'}`}>
        {value}
      </div>
    </div>
  )
}
