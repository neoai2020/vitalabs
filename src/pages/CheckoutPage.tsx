import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createPaymentIntent,
  getHyperInstance,
  UPRAILS_APPEARANCE,
  type CheckoutState,
} from '../lib/uprails'

type Status = 'idle' | 'loading' | 'ready' | 'submitting' | 'succeeded' | 'failed'

const TESTIMONIALS = [
  {
    text: 'Arrived in 2 days with tracked shipping. Packaging was discreet and professional. Already ordered again.',
    name: 'James T.',
    loc: 'Manchester',
    tag: 'Fast delivery',
  },
  {
    text: 'Was nervous about ordering online but the whole process was smooth. Payment was secure and I got an email confirmation instantly.',
    name: 'Sophie R.',
    loc: 'London',
    tag: 'Easy checkout',
  },
  {
    text: 'The quality is outstanding — came with full COA documentation. This is the real deal, not the cheap alternatives.',
    name: 'Daniel M.',
    loc: 'Edinburgh',
    tag: 'Lab verified',
  },
  {
    text: 'I had a question about my order and support replied within an hour. Rare to see that level of service.',
    name: 'Emma L.',
    loc: 'Bristol',
    tag: 'Great support',
  },
]

export default function CheckoutPage() {
  const { state } = useLocation() as { state: CheckoutState | null }
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hyperRef = useRef<ReturnType<typeof getHyperInstance> | null>(null)
  const widgetsRef = useRef<ReturnType<ReturnType<typeof getHyperInstance>['widgets']> | null>(null)
  const paymentContainerRef = useRef<HTMLDivElement | null>(null)
  const [initCount, setInitCount] = useState(0)

  const initPayment = useCallback(async () => {
    if (!state) return

    try {
      setStatus('loading')
      setErrorMsg(null)

      const skus = state.items.map(i => i.sku).join(', ')

      const { clientSecret } = await createPaymentIntent({
        amount: state.amount,
        currency: 'GBP',
        description: state.description,
        email: state.email,
        metadata: {
          skus,
          quantity: String(state.quantity),
        },
      })

      const hyper = getHyperInstance()
      hyperRef.current = hyper

      const widgets = hyper.widgets({
        clientSecret,
        appearance: UPRAILS_APPEARANCE,
      })
      widgetsRef.current = widgets

      const paymentElement = widgets.create('payment')

      const container = paymentContainerRef.current
      if (container) {
        container.innerHTML = ''
        const mount = document.createElement('div')
        mount.id = 'payment-element'
        container.appendChild(mount)
        paymentElement.mount('#payment-element')
      }

      setStatus('ready')
    } catch (err) {
      console.error('Checkout init failed:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load payment form')
      setStatus('failed')
    }
  }, [state])

  useEffect(() => {
    initPayment()
  }, [initPayment, initCount])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hyperRef.current || !widgetsRef.current || status === 'submitting') return

    setStatus('submitting')
    setErrorMsg(null)

    const returnPath = state?.returnPath || '/order-complete'

    sessionStorage.setItem('peptiva-last-order', JSON.stringify({
      description: state?.description,
      displayPrice: state?.displayPrice,
      items: state?.items,
    }))

    const timeoutId = setTimeout(() => {
      setErrorMsg('Payment is taking longer than expected. Please check your email for confirmation or try again.')
      setStatus('ready')
    }, 60_000)

    try {
      const result = await hyperRef.current.confirmPayment({
        elements: widgetsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}${returnPath}`,
        },
      })

      clearTimeout(timeoutId)
      console.log('[Checkout] confirmPayment result:', JSON.stringify(result))

      if (result?.error) {
        setErrorMsg(result.error.message)
        setInitCount(c => c + 1)
        return
      }

      const paymentStatus = result?.status
      if (paymentStatus === 'succeeded' || paymentStatus === 'processing') {
        setStatus('succeeded')
        window.location.href = `${window.location.origin}${returnPath}`
      } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        setErrorMsg('Payment was declined. Please check your card details or try a different card.')
        setInitCount(c => c + 1)
      } else if (paymentStatus === 'requires_payment_method') {
        setErrorMsg('Payment failed. Please check your card details and try again.')
        setInitCount(c => c + 1)
      } else if (paymentStatus === 'requires_action') {
        setErrorMsg('Additional authentication required. Please try again.')
        setStatus('ready')
      } else {
        setErrorMsg(`Payment could not be completed (${paymentStatus || 'unknown'}). Please try again.`)
        setInitCount(c => c + 1)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Payment submission error:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed')
      setInitCount(c => c + 1)
    }
  }, [status, state])

  if (!state) {
    return (
      <div className="ck-page">
        <div className="ck-wrap">
          <div className="ck-empty">
            <h1>No product selected</h1>
            <p>Please choose a product from your results page first.</p>
            <Link className="ck-btn ck-btn--pay" to="/results">Back to results</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ck-page">
      {/* Secure header */}
      <header className="ck-header">
        <div className="ck-header-inner">
          <Link to="/" className="ck-logo">Peptiva</Link>
          <div className="ck-header-right">
            <span className="ck-header-secure">🔒 256-bit SSL Encrypted</span>
          </div>
        </div>
      </header>

      {/* Progress steps */}
      <div className="ck-steps">
        <div className="ck-steps-inner">
          <span className="ck-step ck-step--done">✓ Quiz</span>
          <span className="ck-step-line ck-step-line--done" />
          <span className="ck-step ck-step--done">✓ Results</span>
          <span className="ck-step-line ck-step-line--done" />
          <span className="ck-step ck-step--active">3. Payment</span>
          <span className="ck-step-line" />
          <span className="ck-step">4. Confirmation</span>
        </div>
      </div>

      <div className="ck-wrap">
        <div className="ck-grid">
          {/* LEFT COLUMN: Summary + Trust */}
          <div className="ck-left">
            {/* Order summary */}
            <div className="ck-summary">
              <h2 className="ck-section-title">Order summary</h2>
              <div className="ck-summary-card">
                {state.items.map((item, i) => (
                  <div key={i} className="ck-summary-product">
                    {item.image && (
                      <img src={item.image} alt={item.sku} className="ck-summary-img" />
                    )}
                    <div className="ck-summary-info">
                      <h3>{item.sku}</h3>
                      <p className="ck-summary-compound">{item.compound}</p>
                    </div>
                    <span className="ck-summary-item-price">{item.displayPrice}</span>
                  </div>
                ))}
                <div className="ck-summary-divider" />
                <div className="ck-summary-row">
                  <span>Subtotal ({state.items.length} {state.items.length === 1 ? 'item' : 'items'})</span>
                  <span>{state.displayPrice}</span>
                </div>
                <div className="ck-summary-row">
                  <span>Shipping (UK tracked)</span>
                  <span className="ck-green">FREE</span>
                </div>
                <div className="ck-summary-divider" />
                <div className="ck-summary-row ck-summary-row--total">
                  <span>Total</span>
                  <span>{state.displayPrice}</span>
                </div>
              </div>
            </div>

            {/* Guarantee badges */}
            <div className="ck-guarantees">
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">🛡️</div>
                <div>
                  <strong>30-Day Money-Back Guarantee</strong>
                  <p>Not satisfied? Full refund, no questions asked.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">🔬</div>
                <div>
                  <strong>99.3%+ Purity Verified</strong>
                  <p>Every batch tested in our UK-regulated laboratory. COA included.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">📦</div>
                <div>
                  <strong>Free Tracked Shipping</strong>
                  <p>Dispatched within 24 hours. Discreet, tamper-proof packaging.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">🔒</div>
                <div>
                  <strong>Bank-Level Security</strong>
                  <p>256-bit SSL encryption. Your details never touch our servers.</p>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="ck-reviews">
              <h2 className="ck-section-title">What our customers say</h2>
              <div className="ck-reviews-grid">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="ck-review">
                    <div className="ck-review-header">
                      <span className="ck-review-stars">★★★★★</span>
                      <span className="ck-review-tag">{t.tag}</span>
                    </div>
                    <p className="ck-review-text">"{t.text}"</p>
                    <span className="ck-review-author">{t.name} — {t.loc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment */}
          <div className="ck-right">
            <div className="ck-payment-card">
              <h2 className="ck-section-title">Payment details</h2>

              <form onSubmit={handleSubmit} className="ck-form">
                {status === 'loading' && (
                  <div className="ck-payment-element">
                    <div className="ck-loading">
                      <div className="ck-spinner" />
                      <p>Loading secure payment form...</p>
                    </div>
                  </div>
                )}
                <div
                  ref={paymentContainerRef}
                  className="ck-payment-element"
                  style={{ display: status === 'loading' ? 'none' : undefined }}
                />

                {errorMsg && (
                  <div className="ck-error" role="alert">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="ck-btn ck-btn--pay"
                  disabled={status !== 'ready'}
                >
                  {status === 'submitting' ? (
                    <span className="ck-btn-loading">
                      <span className="ck-btn-spinner" /> Processing...
                    </span>
                  ) : (
                    <>Complete Order — {state.displayPrice}</>
                  )}
                </button>
              </form>

              <div className="ck-pay-trust">
                <span>🔒 Secure payment</span>
                <span>📦 Free shipping</span>
                <span>🛡️ 30-day guarantee</span>
              </div>

              <p className="ck-payment-note">
                Your card details are handled securely by our payment processor and never touch our servers.
              </p>
            </div>

            {/* Sticky mobile CTA */}
            <div className="ck-mobile-sticky">
              <div className="ck-mobile-sticky-info">
                <span className="ck-mobile-sticky-total">Total: {state.displayPrice}</span>
                <span className="ck-mobile-sticky-ship">Free tracked shipping</span>
              </div>
              <button
                type="button"
                className="ck-btn ck-btn--pay ck-btn--mobile"
                disabled={status !== 'ready'}
                onClick={(e) => {
                  const form = document.querySelector('.ck-form') as HTMLFormElement
                  if (form) form.requestSubmit()
                  else handleSubmit(e as unknown as React.FormEvent)
                }}
              >
                {status === 'submitting' ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="ck-back"
          onClick={() => navigate(-1)}
        >
          ← Back to results
        </button>
      </div>

      <footer className="ck-footer">
        <p>
          Peptiva Ltd · UK-regulated laboratory · Sold for research use only
        </p>
        <p>© {new Date().getFullYear()} Peptiva · All rights reserved</p>
      </footer>
    </div>
  )
}
