import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createPaymentIntent,
  getHyperInstance,
  UPRAILS_APPEARANCE,
  type CheckoutState,
} from '../lib/uprails'

type Status = 'idle' | 'loading' | 'ready' | 'submitting' | 'succeeded' | 'failed'

function useCountdown(startMinutes: number) {
  const [seconds, setSeconds] = useState(startMinutes * 60)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds > 0])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return { mins, secs, expired: seconds === 0 }
}

export default function CheckoutPage() {
  const { state } = useLocation() as { state: CheckoutState | null }
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState(state?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState('')

  const hyperRef = useRef<ReturnType<typeof getHyperInstance> | null>(null)
  const widgetsRef = useRef<ReturnType<ReturnType<typeof getHyperInstance>['widgets']> | null>(null)
  const paymentContainerRef = useRef<HTMLDivElement | null>(null)
  const [initCount, setInitCount] = useState(0)

  const countdown = useCountdown(10)

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
        email: customerEmail || state.email,
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

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setErrorMsg('Please fill in your name, email, and phone number.')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    const returnPath = state?.returnPath || '/order-complete'

    sessionStorage.setItem('peptiva-last-order', JSON.stringify({
      description: state?.description,
      displayPrice: state?.displayPrice,
      items: state?.items,
      customerName,
      customerEmail,
      customerPhone,
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
  }, [status, state, customerName, customerEmail, customerPhone])

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
            <svg className="ck-lock-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="ck-header-secure">Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Urgency countdown */}
      {!countdown.expired && (
        <div className="ck-urgency">
          <span className="ck-urgency-text">Hurry, your checkout expires soon</span>
          <div className="ck-timer">
            <div className="ck-timer-block">
              <span className="ck-timer-num">{String(countdown.mins).padStart(2, '0')}</span>
              <span className="ck-timer-label">Minutes</span>
            </div>
            <span className="ck-timer-sep">:</span>
            <div className="ck-timer-block">
              <span className="ck-timer-num">{String(countdown.secs).padStart(2, '0')}</span>
              <span className="ck-timer-label">Seconds</span>
            </div>
          </div>
        </div>
      )}

      <div className="ck-wrap">
        <div className="ck-grid">
          {/* LEFT COLUMN: Form */}
          <div className="ck-left">
            {/* Customer Information */}
            <div className="ck-section">
              <h2 className="ck-section-title">Customer Information</h2>
              <div className="ck-card">
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-name">Full Name *</label>
                  <input
                    id="ck-name"
                    type="text"
                    className="ck-input"
                    placeholder="John Smith"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-email">Email Address *</label>
                  <input
                    id="ck-email"
                    type="email"
                    className="ck-input"
                    placeholder="you@example.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <span className="ck-field-hint">To receive your order confirmation.</span>
                </div>
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-phone">Phone Number *</label>
                  <input
                    id="ck-phone"
                    type="tel"
                    className="ck-input"
                    placeholder="+44 7700 900000"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                  <span className="ck-field-hint">For delivery updates only.</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="ck-section">
              <h2 className="ck-section-title">Payment Information</h2>
              <p className="ck-section-subtitle">All transactions are secure and encrypted.</p>
              <div className="ck-card">
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
                      <>Pay Now — {state.displayPrice}</>
                    )}
                  </button>
                </form>

                <p className="ck-payment-note">
                  Your card details are handled securely by our payment processor and never touch our servers.
                </p>
              </div>
            </div>

            {/* Trust row */}
            <div className="ck-trust-row">
              <div className="ck-trust-item">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                <span>Secure payment</span>
              </div>
              <div className="ck-trust-item">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                <span>Free tracked shipping</span>
              </div>
              <div className="ck-trust-item">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5C17.944 5.678 18 6.379 18 7.1c0 5.523-3.626 9.132-8 11.9-4.374-2.768-8-6.377-8-11.9 0-.721.056-1.422.166-2.1z" clipRule="evenodd" /></svg>
                <span>30-day guarantee</span>
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

          {/* RIGHT COLUMN: Summary */}
          <div className="ck-right">
            {/* Cart Summary */}
            <div className="ck-card ck-summary-card">
              <h2 className="ck-section-title">Cart Summary</h2>

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
                <span>Subtotal</span>
                <span>{state.displayPrice}</span>
              </div>
              <div className="ck-summary-row">
                <span>Shipping (UK tracked)</span>
                <span className="ck-green">FREE</span>
              </div>
              <div className="ck-summary-row">
                <span>Tax</span>
                <span>£0.00</span>
              </div>

              <div className="ck-summary-divider" />

              <div className="ck-summary-row ck-summary-row--total">
                <span>TOTAL</span>
                <span>{state.displayPrice}</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="ck-social-proof">
              <div className="ck-social-stars">★★★★★</div>
              <div className="ck-social-text">
                <strong>9.6/10</strong> Excellent! <span className="ck-social-count">(2,847 reviews)</span>
              </div>
            </div>

            {/* Guarantee */}
            <div className="ck-guarantee-box">
              <div className="ck-guarantee-header">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5C17.944 5.678 18 6.379 18 7.1c0 5.523-3.626 9.132-8 11.9-4.374-2.768-8-6.377-8-11.9 0-.721.056-1.422.166-2.1z" clipRule="evenodd" /></svg>
                <strong>Peptiva Guarantee</strong>
              </div>
              <p>
                We offer a full refund or replacement within 30 days from the date of purchase, no questions asked. Every batch is independently tested with 99.3%+ purity verification.
              </p>
            </div>

            {/* Need help */}
            <div className="ck-help-box">
              <strong>Need Help?</strong>
              <p>Email us at <a href="mailto:support@peptiva.co.uk">support@peptiva.co.uk</a></p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
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

      <footer className="ck-footer">
        <p>Peptiva Ltd · UK-regulated laboratory · Sold for research use only</p>
        <p>© {new Date().getFullYear()} Peptiva · All rights reserved</p>
      </footer>
    </div>
  )
}
