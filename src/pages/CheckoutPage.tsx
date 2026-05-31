import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createCustomer,
  createPaymentIntent,
  getHyperInstance,
  UPRAILS_APPEARANCE,
  type CheckoutState,
} from '../lib/uprails'
import { useCart } from '../lib/cart'
import { redeemPromoCode } from '../lib/marketing'
import { trackEvent } from '../lib/analytics'

type Status = 'idle' | 'loading' | 'ready' | 'submitting' | 'succeeded' | 'failed'

interface AppliedPromo {
  code: string
  discount: number
  token: string
}

interface PromoSectionProps {
  subtotalGBP: number
  onChange: (next: AppliedPromo | null) => void
}

function PromoSection({ subtotalGBP, onChange }: PromoSectionProps) {
  const [code, setCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<AppliedPromo | null>(null)

  const apply = async () => {
    setValidating(true)
    setError(null)
    const result = await redeemPromoCode(code, subtotalGBP)
    setValidating(false)
    if (!result.ok || !result.token || !result.code) {
      setError(result.error ?? 'Invalid code')
      setApplied(null)
      onChange(null)
      return
    }
    const next: AppliedPromo = {
      code: result.code,
      discount: result.discount ?? 0,
      token: result.token,
    }
    setApplied(next)
    onChange(next)
  }

  const clear = () => {
    setApplied(null)
    setCode('')
    setError(null)
    onChange(null)
  }

  return (
    <div className="ck-promo" style={{ marginTop: 12 }}>
      {applied ? (
        <div className="ck-promo-applied" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#ecfdf5', color: '#065f46', fontSize: 13 }}>
          <span><strong>{applied.code}</strong> applied — £{applied.discount.toFixed(2)} off</span>
          <button type="button" onClick={clear} style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Remove</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Promo code"
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <button
            type="button"
            onClick={apply}
            disabled={validating || !code.trim()}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #143F66', background: '#143F66', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: validating || !code.trim() ? 0.6 : 1 }}
          >
            {validating ? 'Checking…' : 'Apply'}
          </button>
        </div>
      )}
      {error ? <p style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>{error}</p> : null}
    </div>
  )
}

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
  const { clearCart } = useCart()

  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev)
    }
  }, [])

  // Fire checkout_started exactly once per checkout view (skip if the
  // user landed here without a cart — those visits aren't real intent).
  useEffect(() => {
    if (!state || !state.amount) return
    trackEvent('checkout_started', {
      props: {
        amount_pence: state.amount,
        quantity: state.quantity,
        description: state.description,
      },
    })
  }, [state])

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState(state?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState('')

  const [shippingCountry, setShippingCountry] = useState('GB')
  const [shippingAddress1, setShippingAddress1] = useState('')
  const [shippingAddress2, setShippingAddress2] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingCounty, setShippingCounty] = useState('')
  const [shippingPostcode, setShippingPostcode] = useState('')

  const [promo, setPromo] = useState<AppliedPromo | null>(null)

  const customerIdRef = useRef<string | null>(null)
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

      // Discount amount is server-derived from the redemption_token. The
      // local `promo.discount` is only used for UI display.
      const discountedAmount = Math.max(0, state.amount - Math.round((promo?.discount ?? 0) * 100))

      const { clientSecret } = await createPaymentIntent({
        amount: discountedAmount,
        currency: 'GBP',
        description: state.description,
        email: customerEmail || state.email,
        redemptionToken: promo?.token,
        subtotal: state.amount,
        metadata: {
          skus,
          quantity: String(state.quantity),
          shipping_name: customerName,
          shipping_address1: shippingAddress1,
          shipping_address2: shippingAddress2,
          shipping_city: shippingCity,
          shipping_county: shippingCounty,
          shipping_postcode: shippingPostcode,
          shipping_country: shippingCountry,
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
  }, [state, promo?.discount, promo?.token, customerEmail, customerName, shippingAddress1, shippingAddress2, shippingCity, shippingCounty, shippingPostcode, shippingCountry])

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

    if (!shippingAddress1.trim() || !shippingCity.trim() || !shippingPostcode.trim()) {
      setErrorMsg('Please fill in your shipping address.')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    if (!customerIdRef.current) {
      try {
        const nameParts = customerName.trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const { customerId } = await createCustomer({
          email: customerEmail.trim(),
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: {
            line1: shippingAddress1.trim(),
            line2: shippingAddress2.trim() || undefined,
            city: shippingCity.trim(),
            state: shippingCounty.trim() || undefined,
            zip: shippingPostcode.trim(),
            country: shippingCountry,
            first_name: firstName,
            last_name: lastName,
          },
        })
        customerIdRef.current = customerId
      } catch (err) {
        console.error('Failed to create customer:', err)
      }
    }

    const returnPath = state?.returnPath || '/order-complete'

    sessionStorage.setItem('vitalabs-last-order', JSON.stringify({
      description: state?.description,
      displayPrice: state?.displayPrice,
      amount: state?.amount,
      items: state?.items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: {
        address1: shippingAddress1,
        address2: shippingAddress2,
        city: shippingCity,
        county: shippingCounty,
        postcode: shippingPostcode,
        country: shippingCountry,
      },
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
        clearCart()
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
  }, [status, state, customerName, customerEmail, customerPhone, shippingCountry, shippingAddress1, shippingAddress2, shippingCity, shippingCounty, shippingPostcode])

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
          <Link to="/" className="ck-logo"><img src="/images/logo.svg" alt="Vita Labs" className="ck-logo-img" /></Link>
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

            {/* Shipping Address */}
            <div className="ck-section">
              <h2 className="ck-section-title">Shipping Address</h2>
              <div className="ck-card">
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-country">Country / Region *</label>
                  <select
                    id="ck-country"
                    className="ck-input ck-select"
                    value={shippingCountry}
                    onChange={e => setShippingCountry(e.target.value)}
                    autoComplete="country"
                    required
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="IE">Ireland</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="NL">Netherlands</option>
                    <option value="BE">Belgium</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="PT">Portugal</option>
                    <option value="AT">Austria</option>
                    <option value="CH">Switzerland</option>
                    <option value="SE">Sweden</option>
                    <option value="NO">Norway</option>
                    <option value="DK">Denmark</option>
                    <option value="FI">Finland</option>
                    <option value="PL">Poland</option>
                    <option value="NZ">New Zealand</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="ZA">South Africa</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-address1">Address *</label>
                  <input
                    id="ck-address1"
                    type="text"
                    className="ck-input"
                    placeholder="Street address"
                    value={shippingAddress1}
                    onChange={e => setShippingAddress1(e.target.value)}
                    autoComplete="address-line1"
                    required
                  />
                </div>
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-address2">Apartment, suite, etc. (optional)</label>
                  <input
                    id="ck-address2"
                    type="text"
                    className="ck-input"
                    placeholder="Apartment, suite, unit, etc."
                    value={shippingAddress2}
                    onChange={e => setShippingAddress2(e.target.value)}
                    autoComplete="address-line2"
                  />
                </div>
                <div className="ck-field-row">
                  <div className="ck-field">
                    <label className="ck-label" htmlFor="ck-city">City *</label>
                    <input
                      id="ck-city"
                      type="text"
                      className="ck-input"
                      placeholder="City"
                      value={shippingCity}
                      onChange={e => setShippingCity(e.target.value)}
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                  <div className="ck-field">
                    <label className="ck-label" htmlFor="ck-county">
                      {shippingCountry === 'US' ? 'State' : shippingCountry === 'CA' ? 'Province' : 'County'}
                    </label>
                    <input
                      id="ck-county"
                      type="text"
                      className="ck-input"
                      placeholder={shippingCountry === 'US' ? 'State' : shippingCountry === 'CA' ? 'Province' : 'County'}
                      value={shippingCounty}
                      onChange={e => setShippingCounty(e.target.value)}
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div className="ck-field">
                  <label className="ck-label" htmlFor="ck-postcode">
                    {shippingCountry === 'US' ? 'ZIP Code' : 'Postcode'} *
                  </label>
                  <input
                    id="ck-postcode"
                    type="text"
                    className="ck-input"
                    placeholder={shippingCountry === 'US' ? '10001' : 'SW1A 1AA'}
                    value={shippingPostcode}
                    onChange={e => setShippingPostcode(e.target.value)}
                    autoComplete="postal-code"
                    required
                  />
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

            {/* Guarantee boxes */}
            <div className="ck-guarantees">
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5C17.944 5.678 18 6.379 18 7.1c0 5.523-3.626 9.132-8 11.9-4.374-2.768-8-6.377-8-11.9 0-.721.056-1.422.166-2.1z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <strong>30-Day Money-Back Guarantee</strong>
                  <p>Not satisfied? Full refund, no questions asked.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C1.817 13.769 2.432 15 3.414 15H9v2a1 1 0 102 0v-2h5.586c.982 0 1.597-1.231.707-2.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.168 1.169a.25.25 0 01-.177.426H6.13a.25.25 0 01-.177-.426l1.168-1.169A3 3 0 009 8.172z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <strong>99.3%+ Purity Verified</strong>
                  <p>Every batch tested in our UK-regulated laboratory. COA included.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-2a1 1 0 00-.293-.707l-3-3A1 1 0 0016 3h-2a1 1 0 00-1 1v5H4V5a1 1 0 00-1-1z" /></svg>
                </div>
                <div>
                  <strong>Free Tracked Shipping</strong>
                  <p>Dispatched within 24 hours. Discreet, tamper-proof packaging.</p>
                </div>
              </div>
              <div className="ck-guarantee">
                <div className="ck-guarantee-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <strong>Bank-Level Security</strong>
                  <p>256-bit SSL encryption. Your details never touch our servers.</p>
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
              {promo && promo.discount > 0 ? (
                <div className="ck-summary-row" style={{ color: '#16a34a' }}>
                  <span>Promo ({promo.code})</span>
                  <span>−£{promo.discount.toFixed(2)}</span>
                </div>
              ) : null}

              <PromoSection
                subtotalGBP={state.amount / 100}
                onChange={setPromo}
              />

              <div className="ck-summary-divider" />

              <div className="ck-summary-row ck-summary-row--total">
                <span>TOTAL</span>
                <span>£{((state.amount / 100) - (promo?.discount ?? 0)).toFixed(2)}</span>
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
                <strong>Vita Labs Guarantee</strong>
              </div>
              <p>
                We offer a full refund or replacement within 30 days from the date of purchase, no questions asked. Every batch is independently tested with 99.3%+ purity verification.
              </p>
            </div>

            {/* Need help */}
            <div className="ck-help-box">
              <strong>Need Help?</strong>
              <p>Email us at <a href="mailto:support@vitalabs.io">support@vitalabs.io</a></p>
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
        <p>Vita Labs Ltd · UK-regulated laboratory · Sold for research use only</p>
        <p>© {new Date().getFullYear()} Vita Labs · All rights reserved</p>
      </footer>
    </div>
  )
}
