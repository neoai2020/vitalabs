import { supabase } from './supabase'

/* ── Global SDK type declarations ── */

interface HyperInstance {
  widgets(opts: { clientSecret: string; appearance?: HyperAppearance }): UnifiedCheckout
  confirmPayment(opts: {
    elements: UnifiedCheckout
    confirmParams: { return_url: string }
  }): Promise<{ error?: { message: string }; status?: string }>
}

interface UnifiedCheckout {
  create(type: 'payment'): PaymentElement
}

interface PaymentElement {
  mount(selector: string): void
  unmount(): void
}

interface HyperAppearance {
  theme?: string
  variables?: Record<string, string>
}

declare global {
  interface Window {
    Hyper?: (publishableKey: string) => HyperInstance
  }
}

/* ── Checkout state passed via React Router ── */

export interface CheckoutItem {
  sku: string
  compound: string
  image: string | null
  price: number
  displayPrice: string
}

export interface CheckoutState {
  items: CheckoutItem[]
  amount: number
  quantity: number
  description: string
  displayPrice: string
  email?: string
}

/* ── Edge Function call ── */

interface CreatePaymentResponse {
  clientSecret: string
  paymentId: string
  status: string
}

export async function createPaymentIntent(opts: {
  amount: number
  currency?: string
  description?: string
  email?: string
  metadata?: Record<string, string>
}): Promise<CreatePaymentResponse> {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: {
      amount: opts.amount,
      currency: opts.currency ?? 'GBP',
      description: opts.description,
      email: opts.email,
      metadata: opts.metadata,
    },
  })

  if (error) throw new Error(error.message ?? 'Failed to create payment')
  return data as CreatePaymentResponse
}

/* ── SDK initialisation ── */

export function getHyperInstance(): HyperInstance {
  const publishableKey = import.meta.env.VITE_UPRAILS_PUBLISHABLE_KEY as string
  if (!window.Hyper) {
    throw new Error('Uprails SDK not loaded — check that HyperLoader.js is in index.html')
  }
  return window.Hyper(publishableKey)
}

export const UPRAILS_APPEARANCE: HyperAppearance = {
  theme: 'default',
  variables: {
    colorPrimary: '#0f766e',
    colorBackground: '#ffffff',
    colorText: '#1a1a2e',
    borderRadius: '8px',
  },
}
