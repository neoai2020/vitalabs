import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { useBrandList } from '../../../hooks/useBrandQuery'
import { useAdminBrand } from '../../../context/AdminBrandContext'
import { supabase } from '../../../../lib/supabase'
import { AdsTabBar } from './AdsTabBar'
import {
  ASPECT_RATIOS,
  IMAGE_HOOKS,
  IMAGE_MODELS,
  PRESETS,
  VIDEO_MODELS,
  findPreset,
  type AspectRatio,
  type CreativeKind,
  type ImageHookId,
  type PresetId,
  type VideoModelId,
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
  hook_id?: string
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

  /* Auto-poll Higgsfield while there's at least one running video job.
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
        description="Generate product ads (images via Gemini Nano Banana, video via Higgsfield) and ship them to Facebook as paused drafts. You launch them from Ads Manager."
      />
      <AdsTabBar />

      <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
        <StudioForm products={activeProducts} productsLoading={productsLoading} />
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
      <CardHeader title={`${jobs.length} video job${jobs.length === 1 ? '' : 's'} running`} description="Polling every 10s. Completed videos appear in the library." />
      <CardBody className="flex flex-col gap-2">
        {jobs.map(j => {
          const params = j.params as { product_id?: string; model_id?: string; preset?: string | null }
          const product = params.product_id ? byId.get(params.product_id) : null
          const ageS = Math.round((Date.now() - new Date(j.created_at).getTime()) / 1000)
          return (
            <div key={j.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-admin-primary)]/30" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">
                  {product?.compound ?? '—'} · {params.model_id ?? 'model'}
                </div>
                <div className="text-xs text-[var(--color-admin-muted)]">
                  {params.preset ? `${params.preset} · ` : ''}generating for {ageS}s
                </div>
              </div>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}

interface FormProps {
  products: ProductRow[]
  productsLoading: boolean
}

function StudioForm({ products, productsLoading }: FormProps) {
  const { brand } = useAdminBrand()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<CreativeKind>('image')
  const [productId, setProductId] = useState<string>('')
  const [aspect, setAspect] = useState<AspectRatio>('1:1')

  // Image
  const [hookId, setHookId] = useState<ImageHookId>('lifestyle')
  const [customPrompt, setCustomPrompt] = useState('')
  const [variantsN, setVariantsN] = useState(4)

  // Video — only higgsfield-dop is verified against the v2 API today.
  // Other partner models are listed in VIDEO_MODELS for roadmap visibility
  // but flagged comingSoon and filtered out of the picker.
  const [presetId, setPresetId] = useState<PresetId | ''>('tv_spot')
  const [videoModelId, setVideoModelId] = useState<VideoModelId>('higgsfield-dop')
  const [duration, setDuration] = useState(5)
  const [videoPrompt, setVideoPrompt] = useState('')

  // Generation lifecycle (image only for now; video added in Phase 3).
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generationNote, setGenerationNote] = useState<string | null>(null)

  const product = products.find(p => p.id === productId) ?? null

  /* When operator picks a preset, mirror its suggested model + prefill
   * the prompt so they can edit instead of starting from a blank box.
   * If the preset's suggested model isn't enabled yet (coming-soon),
   * fall back to higgsfield-dop so the operator never lands on an
   * unreachable model. */
  const applyPreset = (id: PresetId) => {
    setPresetId(id)
    const preset = findPreset(id)
    if (preset) {
      const suggested = VIDEO_MODELS.find(m => m.id === preset.suggested_model)
      setVideoModelId(suggested && !suggested.comingSoon ? preset.suggested_model : 'higgsfield-dop')
      setVideoPrompt(preset.prompt_template)
    }
  }

  const generate = async () => {
    setGenerationError(null)
    setGenerationNote(null)
    if (!productId) { setGenerationError('Pick a product first.'); return }

    if (tab === 'image') {
      const hook = IMAGE_HOOKS.find(h => h.id === hookId)
      if (!hook) { setGenerationError('Unknown hook'); return }
      setGenerating(true)
      try {
        const { data, error } = await supabase.functions.invoke('generate-ad-image', {
          body: {
            brand,
            product_id: productId,
            hook_id: hookId,
            aspect_ratio: aspect,
            custom_prompt: customPrompt || undefined,
            variants_n: variantsN,
            prompt_template: hook.prompt_template,
          },
        })
        if (error) throw new Error(error.message)
        const res = data as { ok?: boolean; creatives?: unknown[]; errors?: string[]; error?: string }
        if (!res?.ok) throw new Error(res?.error ?? 'Generation failed')
        const made = res.creatives?.length ?? 0
        setGenerationNote(`Generated ${made} variant${made === 1 ? '' : 's'}${res.errors?.length ? ` · ${res.errors.length} failed` : ''}.`)
        queryClient.invalidateQueries({ queryKey: ['ad_creatives', brand] })
      } catch (err) {
        setGenerationError(err instanceof Error ? err.message : 'Generation failed')
      } finally {
        setGenerating(false)
      }
      return
    }

    // Video path — submit to Higgsfield, poll-ad-jobs picks it up async.
    if (!videoPrompt.trim()) { setGenerationError('Prompt is required.'); return }
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-video', {
        body: {
          brand,
          product_id: productId,
          model_id: videoModelId,
          preset: presetId || undefined,
          prompt: videoPrompt,
          aspect_ratio: aspect,
          duration_s: duration,
        },
      })
      if (error) throw new Error(error.message)
      const res = data as { ok?: boolean; error?: string; job_id?: string }
      if (!res?.ok) throw new Error(res?.error ?? 'Submission failed')
      setGenerationNote(`Job submitted. We'll keep polling — video usually takes 30-120 seconds.`)
      queryClient.invalidateQueries({ queryKey: ['ad_jobs', brand] })
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const disabledNote = null

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="New creative" description="Pick a product, choose the format, and we'll do the rest." />
        <CardBody className="grid gap-5">
          <div className="flex items-center gap-2">
            {(['image', 'video'] as const).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`admin-tab${tab === k ? ' admin-tab--active' : ''}`}
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                {k === 'image' ? 'Image ad' : 'Video / UGC ad'}
              </button>
            ))}
          </div>

          {/* Product picker */}
          <Label hint="Used as a visual reference for image gen and a content brief for video gen.">
            Product
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 text-sm text-[var(--color-admin-text)]"
            >
              <option value="">{productsLoading ? 'Loading products…' : 'Select a product…'}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.compound}</option>
              ))}
            </select>
          </Label>

          {product?.image_url ? (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3">
              <img
                src={product.image_url}
                alt={product.compound}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--color-admin-text-strong)]">{product.compound}</div>
                {product.tagline ? (
                  <div className="truncate text-xs text-[var(--color-admin-muted)]">{product.tagline}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Aspect ratio */}
          <Label hint="Different placements need different ratios. Reels = 9:16, feed = 1:1 or 4:5.">
            Aspect ratio
            <div className="mt-1 flex flex-wrap gap-2">
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setAspect(ar.id)}
                  className={`admin-tab${aspect === ar.id ? ' admin-tab--active' : ''}`}
                  style={{ fontSize: 12 }}
                >
                  {ar.label} · {ar.hint}
                </button>
              ))}
            </div>
          </Label>

          {tab === 'image' ? (
            <ImageForm
              hookId={hookId}
              setHookId={setHookId}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              variantsN={variantsN}
              setVariantsN={setVariantsN}
            />
          ) : (
            <VideoForm
              presetId={presetId}
              applyPreset={applyPreset}
              videoModelId={videoModelId}
              setVideoModelId={setVideoModelId}
              duration={duration}
              setDuration={setDuration}
              videoPrompt={videoPrompt}
              setVideoPrompt={setVideoPrompt}
            />
          )}
        </CardBody>
        <CardFooter>
          <div className="mr-auto text-xs">
            {generationError ? (
              <span className="text-[var(--color-admin-danger)]">{generationError}</span>
            ) : generationNote ? (
              <span className="text-[var(--color-admin-success)]">{generationNote}</span>
            ) : disabledNote ? (
              <span className="text-[var(--color-admin-muted)]">{disabledNote}</span>
            ) : tab === 'image' ? (
              <span className="text-[var(--color-admin-muted)]">{variantsN} variant{variantsN === 1 ? '' : 's'} · ~5-15 seconds</span>
            ) : null}
          </div>
          <Button
            onClick={() => void generate()}
            disabled={generating || !productId}
          >
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

interface ImageFormProps {
  hookId: ImageHookId
  setHookId: (id: ImageHookId) => void
  customPrompt: string
  setCustomPrompt: (s: string) => void
  variantsN: number
  setVariantsN: (n: number) => void
}

function ImageForm({ hookId, setHookId, customPrompt, setCustomPrompt, variantsN, setVariantsN }: ImageFormProps) {
  return (
    <>
      <Label>
        Image model
        <div className="mt-1 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-[var(--color-admin-text-strong)]">{IMAGE_MODELS[0].label}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-admin-primary)]">Default</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-admin-muted)]">{IMAGE_MODELS[0].description}</p>
        </div>
      </Label>

      <Label hint="Each hook gets you a different angle. We'll generate N variants per hook.">
        Creative hook
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {IMAGE_HOOKS.map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => setHookId(h.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                hookId === h.id
                  ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5'
                  : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-strong)]'
              }`}
            >
              <div className="text-sm font-medium text-[var(--color-admin-text-strong)]">{h.label}</div>
              <div className="mt-1 text-xs text-[var(--color-admin-muted)]">{h.blurb}</div>
            </button>
          ))}
        </div>
      </Label>

      <Label hint="Optional. Adds your own twist on top of the hook template.">
        Extra prompt details
        <textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 py-2 text-sm text-[var(--color-admin-text)]"
          placeholder="e.g. lean into the sleep angle, soft pastel palette, no busy backgrounds"
        />
      </Label>

      <Label hint="More variants = more options. 4 is a good default.">
        Variants per generation
        <Input
          type="number"
          min={1}
          max={8}
          value={variantsN}
          onChange={e => setVariantsN(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
        />
      </Label>
    </>
  )
}

interface VideoFormProps {
  presetId: PresetId | ''
  applyPreset: (id: PresetId) => void
  videoModelId: VideoModelId
  setVideoModelId: (id: VideoModelId) => void
  duration: number
  setDuration: (n: number) => void
  videoPrompt: string
  setVideoPrompt: (s: string) => void
}

function VideoForm({ presetId, applyPreset, videoModelId, setVideoModelId, duration, setDuration, videoPrompt, setVideoPrompt }: VideoFormProps) {
  return (
    <>
      <Label hint="Picking a preset auto-suggests the right video model and prefills the prompt.">
        Marketing preset
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                presetId === p.id
                  ? 'border-[var(--color-admin-primary)] bg-[var(--color-admin-primary)]/5'
                  : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-strong)]'
              }`}
            >
              <div className="text-sm font-medium text-[var(--color-admin-text-strong)]">{p.label}</div>
              <div className="mt-1 text-xs text-[var(--color-admin-muted)]">{p.blurb}</div>
            </button>
          ))}
        </div>
      </Label>

      <Label>
        Video model
        <select
          value={videoModelId}
          onChange={e => setVideoModelId(e.target.value as VideoModelId)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 text-sm text-[var(--color-admin-text)]"
        >
          {VIDEO_MODELS.filter(m => !m.comingSoon).map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
          {VIDEO_MODELS.some(m => m.comingSoon) ? (
            <optgroup label="Coming soon (verify endpoint with your account first)">
              {VIDEO_MODELS.filter(m => m.comingSoon).map(m => (
                <option key={m.id} value={m.id} disabled>{m.label}</option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <p className="mt-1 text-xs text-[var(--color-admin-muted)]">
          {VIDEO_MODELS.find(m => m.id === videoModelId)?.description}
        </p>
      </Label>

      <Label>
        Duration
        <div className="mt-1 flex flex-wrap gap-2">
          {(VIDEO_MODELS.find(m => m.id === videoModelId)?.durations_s ?? [8]).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`admin-tab${duration === d ? ' admin-tab--active' : ''}`}
              style={{ fontSize: 12 }}
            >
              {d}s
            </button>
          ))}
        </div>
      </Label>

      <Label hint="Token placeholders like {{product_name}} and {{primary_benefit}} get filled at generation time.">
        Prompt
        <textarea
          value={videoPrompt}
          onChange={e => setVideoPrompt(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] px-3 py-2 text-sm font-mono text-[var(--color-admin-text)]"
          placeholder="A 30-something person filming a vertical phone selfie at home, talking honestly about how {{product_name}}…"
        />
      </Label>
    </>
  )
}

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

  return (
    <Card>
      <CardHeader title="Library" description={creatives.length ? `${creatives.length} creatives saved` : 'Your generated creatives land here'} />
      <CardBody className="flex flex-col gap-3">
        {loading ? (
          <div className="text-sm text-[var(--color-admin-muted)]">Loading…</div>
        ) : creatives.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-admin-border)] p-6 text-center text-sm text-[var(--color-admin-muted)]">
            No creatives yet. Generate one with the form on the left.
          </div>
        ) : (
          creatives.slice(0, 20).map(c => {
            const product = c.product_id ? productById.get(c.product_id) : null
            const copy = c.metadata?.ad_copy ?? null
            return (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-2">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--color-admin-surface)]">
                    {c.kind === 'image' ? (
                      <img src={c.public_url} alt="" className="h-full w-full object-cover" />
                    ) : c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] text-[var(--color-admin-muted)]">VIDEO</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate text-sm font-medium text-[var(--color-admin-text-strong)]">{product?.compound ?? '—'}</div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{c.kind} · {c.aspect_ratio}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-admin-muted)]">{c.generator}</div>
                    {c.prompt ? <div className="mt-1 line-clamp-2 text-xs text-[var(--color-admin-muted)]">{c.prompt}</div> : null}
                  </div>
                </div>
                {copy ? <AdCopyPanel copy={copy} /> : null}
              </div>
            )
          })
        )}
      </CardBody>
    </Card>
  )
}


/* Renders the Facebook ad copy bundle with one-click copy buttons next
 * to each paste target. Three headlines because Meta's Advantage+ surface
 * accepts up to five and rotates — three is plenty without overwhelming
 * the operator. */
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
