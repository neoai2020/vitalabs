import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createPaymentIntent,
  getHyperInstance,
  UPRAILS_APPEARANCE,
  type CheckoutState,
} from '../lib/uprails'

type Status = 'idle' | 'loading' | 'ready' | 'submitting' | 'succeeded' | 'failed'

export default function CheckoutPage() {
  const { state } = useLocation() as { state: CheckoutState | null }
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hyperRef = useRef<ReturnType<typeof getHyperInstance> | null>(null)
  const widgetsRef = useRef<ReturnType<ReturnType<typeof getHyperInstance>['widgets']> | null>(null)
  const mountedRef = useRef(false)

  if (!state) {
    return (
      <div className="ck-page">
        <div className="ck-wrap">
          <div className="ck-empty">
            <h1>No product selected</h1>
            <p>Please choose a product from your results page first.</p>
            <Link className="ck-btn ck-btn--primary" to="/results">Back to results</Link>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    let cancelled = false

    async function init() {
      try {
        setStatus('loading')
        setErrorMsg(null)

        const skus = state!.items.map(i => i.sku).join(', ')

        const { clientSecret } = await createPaymentIntent({
          amount: state!.amount,
          currency: 'GBP',
          description: state!.description,
          email: state!.email,
          metadata: {
            skus,
            quantity: String(state!.quantity),
          },
        })

        if (cancelled) return

        const hyper = getHyperInstance()
        hyperRef.current = hyper

        const widgets = hyper.widgets({
          clientSecret,
          appearance: UPRAILS_APPEARANCE,
        })
        widgetsRef.current = widgets

        const paymentElement = widgets.create('payment')
        paymentElement.mount('#payment-element')

        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('Checkout init failed:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load payment form')
        setStatus('failed')
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hyperRef.current || !widgetsRef.current || status === 'submitting') return

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const { error } = await hyperRef.current.confirmPayment({
        elements: widgetsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?result=complete`,
        },
      })

      if (error) {
        setErrorMsg(error.message)
        setStatus('ready')
      }
    } catch (err) {
      console.error('Payment submission error:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed')
      setStatus('ready')
    }
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get('result') === 'complete') {
    return (
      <div className="ck-page">
        <div className="ck-wrap">
          <div className="ck-success">
            <div className="ck-success-icon">✓</div>
            <h1>Payment complete</h1>
            <p>
              Thank you for your order. Your protocol is being prepared
              and you'll receive a confirmation email shortly.
            </p>
            <div className="ck-success-details">
              <span>Order: {state.description}</span>
              <span>Amount: {state.displayPrice}</span>
            </div>
            <Link className="ck-btn ck-btn--primary" to="/">Return to Peptiva</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ck-page">
      <header className="ck-header">
        <div className="ck-header-inner">
          <Link to="/" className="ck-logo">Peptiva</Link>
          <span className="ck-header-secure">🔒 Secure Checkout</span>
        </div>
      </header>

      <div className="ck-wrap">
        <div className="ck-grid">
          {/* Order summary */}
          <div className="ck-summary">
            <h2 className="ck-summary-title">Order summary</h2>
            <div className="ck-summary-card">
              {state.items.map((item, i) => (
                <div key={i} className={`ck-summary-product ${i > 0 ? 'ck-summary-product--stack' : ''}`}>
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
              <div className="ck-summary-line ck-summary-line--ship">
                <span>Shipping (UK tracked)</span>
                <span className="ck-summary-free">FREE</span>
              </div>
              <div className="ck-summary-total">
                <span>Total</span>
                <span>{state.displayPrice}</span>
              </div>
            </div>
            <div className="ck-summary-trust">
              <span>🔒 Secure payment</span>
              <span>📦 Free tracked shipping</span>
              <span>✓ 30-day guarantee</span>
            </div>
          </div>

          {/* Payment form */}
          <div className="ck-payment">
            <h2 className="ck-payment-title">Payment details</h2>
            <form onSubmit={handleSubmit} className="ck-form">
              <div
                id="payment-element"
                className="ck-payment-element"
              >
                {status === 'loading' && (
                  <div className="ck-loading">
                    <div className="ck-spinner" />
                    <p>Loading payment form...</p>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="ck-error" role="alert">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="ck-btn ck-btn--primary ck-btn--full"
                disabled={status !== 'ready'}
              >
                {status === 'submitting' ? 'Processing...' : `Pay ${state.displayPrice}`}
              </button>
            </form>

            <p className="ck-payment-note">
              Your card details are handled securely by Uprails and never touch our servers.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="ck-back"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <footer className="ck-footer">
        <p>
          Peptiva Ltd. All products manufactured in our UK-regulated laboratory.
          Sold for research use only.
        </p>
        <p>© {new Date().getFullYear()} Peptiva</p>
      </footer>
    </div>
  )
}
