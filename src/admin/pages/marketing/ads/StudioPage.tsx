import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { useBrandList } from '../../../hooks/useBrandQuery'
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
}

export default function StudioPage() {
  const { data: products = [], isLoading: productsLoading } = useBrandList<ProductRow>({
    table: 'products',
    select: 'id,compound,tagline,image_url,status',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { data: creatives = [], isLoading: creativesLoading } = useBrandList<CreativeRow>({
    table: 'ad_creatives',
    orderBy: { column: 'created_at', ascending: false },
  })

  const activeProducts = useMemo(
    () => products.filter(p => p.status !== 'archived'),
    [products],
  )

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
        <CreativeLibrary creatives={creatives} loading={creativesLoading} products={activeProducts} />
      </div>
    </>
  )
}

interface FormProps {
  products: ProductRow[]
  productsLoading: boolean
}

function StudioForm({ products, productsLoading }: FormProps) {
  const [tab, setTab] = useState<CreativeKind>('image')
  const [productId, setProductId] = useState<string>('')
  const [aspect, setAspect] = useState<AspectRatio>('1:1')

  // Image
  const [hookId, setHookId] = useState<ImageHookId>('lifestyle')
  const [customPrompt, setCustomPrompt] = useState('')
  const [variantsN, setVariantsN] = useState(4)

  // Video
  const [presetId, setPresetId] = useState<PresetId | ''>('ugc')
  const [videoModelId, setVideoModelId] = useState<VideoModelId>('wan2-6')
  const [duration, setDuration] = useState(8)
  const [videoPrompt, setVideoPrompt] = useState('')

  const product = products.find(p => p.id === productId) ?? null

  /* When operator picks a preset, mirror its suggested model + prefill
   * the prompt so they can edit instead of starting from a blank box. */
  const applyPreset = (id: PresetId) => {
    setPresetId(id)
    const preset = findPreset(id)
    if (preset) {
      setVideoModelId(preset.suggested_model)
      setVideoPrompt(preset.prompt_template)
    }
  }

  const disabledNote =
    tab === 'image'
      ? 'Generation goes live once the Gemini Nano Banana Edge Function ships (Phase 2).'
      : 'Generation goes live once the Higgsfield Edge Function ships (Phase 3).'

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
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
          <span className="text-xs text-[var(--color-admin-muted)]">{disabledNote}</span>
          <Button disabled>Generate</Button>
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
          {VIDEO_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
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
            return (
              <div key={c.id} className="flex gap-3 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-2">
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
            )
          })
        )}
      </CardBody>
    </Card>
  )
}
