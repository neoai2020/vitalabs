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
import { getBrand } from '../lib/config/brand'

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
    <div className="ck-promo">
      {applied ? (
        <div className="ck-promo-applied">
          <span><strong>{applied.code}</strong> applied — £{applied.discount.toFixed(2)} off</span>
          <button type="button" onClick={clear} className="ck-promo-remove">Remove</button>
        </div>
      ) : (
        <div className="ck-promo-row">
          <input
            type="text"
            placeholder="Discount code or gift card"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="ck-promo-input"
          />
          <button
            type="button"
            onClick={apply}
            disabled={validating || !code.trim()}
            className="ck-promo-apply"
          >
            {validating ? 'Checking…' : 'Apply'}
          </button>
        </div>
      )}
      {error ? <p className="ck-promo-error">{error}</p> : null}
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

/** Per-country labels for the state/postcode fields. We only ship to four
 *  countries, but each one calls the admin area + postal code something
 *  different — using the local term reduces friction at checkout. */
function getRegionLabels(country: string): { state: string; postcode: string; postcodePlaceholder: string } {
  switch (country) {
    case 'US':
      return { state: 'State', postcode: 'ZIP Code', postcodePlaceholder: '10001' }
    case 'AE':
      return { state: 'Emirate', postcode: 'Postal code (optional)', postcodePlaceholder: '' }
    case 'IE':
      return { state: 'County', postcode: 'Eircode', postcodePlaceholder: 'D02 XY45' }
    case 'GB':
    default:
      return { state: 'County', postcode: 'Postcode', postcodePlaceholder: 'SW1A 1AA' }
  }
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

  // Mobile-only collapsible summary toggle.
  const [summaryOpen, setSummaryOpen] = useState(false)

  const customerIdRef = useRef<string | null>(null)
  const hyperRef = useRef<ReturnType<typeof getHyperInstance> | null>(null)
  const widgetsRef = useRef<ReturnType<ReturnType<typeof getHyperInstance>['widgets']> | null>(null)
  const paymentContainerRef = useRef<HTMLDivElement | null>(null)
  const [initCount, setInitCount] = useState(0)

  const countdown = useCountdown(10)

  /* Capture the latest customer + shipping values in a ref so the
   * payment-intent metadata can include them at init time WITHOUT
   * pinning them as useCallback deps. Without this, every keystroke
   * in a shipping field rebuilt initPayment, retriggered the effect,
   * created a fresh PaymentIntent, and ripped+remounted the Uprails
   * iframe — both a UX nightmare (skeleton flash on every key) and a
   * production cost issue (PaymentIntent per keystroke). */
  const formMetaRef = useRef({
    customerName,
    customerEmail,
    shippingAddress1,
    shippingAddress2,
    shippingCity,
    shippingCounty,
    shippingPostcode,
    shippingCountry,
  })
  useEffect(() => {
    formMetaRef.current = {
      customerName,
      customerEmail,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingCounty,
      shippingPostcode,
      shippingCountry,
    }
  })

  const initPayment = useCallback(async () => {
    if (!state) return

    try {
      setStatus('loading')
      setErrorMsg(null)

      const skus = state.items.map(i => i.sku).join(', ')

      // Discount amount is server-derived from the redemption_token. The
      // local `promo.discount` is only used for UI display.
      const discountedAmount = Math.max(0, state.amount - Math.round((promo?.discount ?? 0) * 100))

      const meta = formMetaRef.current
      const { clientSecret } = await createPaymentIntent({
        amount: discountedAmount,
        currency: 'GBP',
        description: state.description,
        email: meta.customerEmail || state.email,
        redemptionToken: promo?.token,
        subtotal: state.amount,
        metadata: {
          // brand goes on the PaymentIntent so the Uprails server-to-server
          // webhook can attribute the order to the right brand on the
          // shared database.
          brand: getBrand(),
          skus,
          quantity: String(state.quantity),
          shipping_name: meta.customerName,
          shipping_address1: meta.shippingAddress1,
          shipping_address2: meta.shippingAddress2,
          shipping_city: meta.shippingCity,
          shipping_county: meta.shippingCounty,
          shipping_postcode: meta.shippingPostcode,
          shipping_country: meta.shippingCountry,
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
    // Only re-init on amount-changing inputs. Shipping/customer fields
    // flow through formMetaRef and the explicit sessionStorage write at
    // submit time, so they don't need to retrigger init.
  }, [state, promo?.discount, promo?.token])

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

    if (!shippingAddress1.trim() || !shippingCity.trim()) {
      setErrorMsg('Please fill in your shipping address.')
      return
    }

    // Postcode is required for GB / IE / US; AE doesn't always have one.
    if (shippingCountry !== 'AE' && !shippingPostcode.trim()) {
      setErrorMsg('Please enter your postcode.')
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
      brand: getBrand(),
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

  const region = getRegionLabels(shippingCountry)
  const totalGBP = (state.amount / 100) - (promo?.discount ?? 0)

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

      {/* Mobile-only: collapsible "Order summary" bar at the very top.
          Tapping toggles the right column visibility on narrow screens.
          Hidden on desktop via CSS. */}
      <button
        type="button"
        className={`ck-mobile-summary-bar ${summaryOpen ? 'is-open' : ''}`}
        onClick={() => setSummaryOpen(o => !o)}
        aria-expanded={summaryOpen}
      >
        <span className="ck-mobile-summary-left">
          Order summary
          <svg className="ck-mobile-summary-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span className="ck-mobile-summary-total">£{totalGBP.toFixed(2)}</span>
      </button>

      <div className="ck-wrap">
        <div className={`ck-grid ${summaryOpen ? 'is-summary-open' : ''}`}>
          {/* LEFT COLUMN: Form */}
          <div className="ck-left">
            {/* Customer / Contact */}
            <section className="ck-section">
              <h2 className="ck-section-title">Contact</h2>
              <div className="ck-field">
                <input
                  id="ck-email"
                  type="email"
                  className="ck-input"
                  placeholder=" "
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <label htmlFor="ck-email" className="ck-label">Email *</label>
              </div>
              <div className="ck-field">
                <input
                  id="ck-name"
                  type="text"
                  className="ck-input"
                  placeholder=" "
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <label htmlFor="ck-name" className="ck-label">Full name *</label>
              </div>
              <div className="ck-field">
                <input
                  id="ck-phone"
                  type="tel"
                  className="ck-input"
                  placeholder=" "
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
                <label htmlFor="ck-phone" className="ck-label">Phone *</label>
              </div>
            </section>

            {/* Shipping Address */}
            <section className="ck-section">
              <h2 className="ck-section-title">Delivery</h2>

              {/* Country select — always has a value, so always treat label as floating */}
              <div className="ck-field ck-field--select is-filled">
                <select
                  id="ck-country"
                  className="ck-input ck-select"
                  value={shippingCountry}
                  onChange={e => setShippingCountry(e.target.value)}
                  autoComplete="country"
                  required
                >
                  <option value="GB">United Kingdom</option>
                  <option value="IE">Ireland</option>
                  <option value="US">United States</option>
                  <option value="AE">United Arab Emirates</option>
                </select>
                <label htmlFor="ck-country" className="ck-label">Country / Region</label>
              </div>

              <div className="ck-field">
                <input
                  id="ck-address1"
                  type="text"
                  className="ck-input"
                  placeholder=" "
                  value={shippingAddress1}
                  onChange={e => setShippingAddress1(e.target.value)}
                  autoComplete="address-line1"
                  required
                />
                <label htmlFor="ck-address1" className="ck-label">Address *</label>
              </div>
              <div className="ck-field">
                <input
                  id="ck-address2"
                  type="text"
                  className="ck-input"
                  placeholder=" "
                  value={shippingAddress2}
                  onChange={e => setShippingAddress2(e.target.value)}
                  autoComplete="address-line2"
                />
                <label htmlFor="ck-address2" className="ck-label">Apartment, suite, etc. (optional)</label>
              </div>

              <div className="ck-field-row">
                <div className="ck-field">
                  <input
                    id="ck-city"
                    type="text"
                    className="ck-input"
                    placeholder=" "
                    value={shippingCity}
                    onChange={e => setShippingCity(e.target.value)}
                    autoComplete="address-level2"
                    required
                  />
                  <label htmlFor="ck-city" className="ck-label">City *</label>
                </div>
                <div className="ck-field">
                  <input
                    id="ck-county"
                    type="text"
                    className="ck-input"
                    placeholder=" "
                    value={shippingCounty}
                    onChange={e => setShippingCounty(e.target.value)}
                    autoComplete="address-level1"
                  />
                  <label htmlFor="ck-county" className="ck-label">{region.state}</label>
                </div>
              </div>

              <div className="ck-field">
                <input
                  id="ck-postcode"
                  type="text"
                  className="ck-input"
                  placeholder=" "
                  value={shippingPostcode}
                  onChange={e => setShippingPostcode(e.target.value)}
                  autoComplete="postal-code"
                  required={shippingCountry !== 'AE'}
                />
                <label htmlFor="ck-postcode" className="ck-label">
                  {region.postcode}{shippingCountry !== 'AE' ? ' *' : ''}
                  {region.postcodePlaceholder ? ` — e.g. ${region.postcodePlaceholder}` : ''}
                </label>
              </div>
            </section>

            {/* Shipping method (display-only — we always ship free tracked) */}
            <section className="ck-section">
              <h2 className="ck-section-title">Shipping method</h2>
              <div className="ck-ship-card">
                <div>
                  <div className="ck-ship-label">Royal Mail Tracked 48</div>
                  <div className="ck-ship-sub">2 Business Days</div>
                </div>
                <div className="ck-ship-price">Free</div>
              </div>
            </section>

            {/* Payment */}
            <section className="ck-section">
              <h2 className="ck-section-title">Payment</h2>
              <p className="ck-section-subtitle">All transactions are secure and encrypted.</p>

              <form onSubmit={handleSubmit} className="ck-form">
                {/* Credit-card visual shell — the actual card inputs live inside
                    the Uprails iframe below. The header is purely chrome to
                    match the mockup. */}
                <div className="ck-pay-group">
                  <div className="ck-pay-header">
                    <span className="ck-radio" />
                    <span className="ck-pay-title">Credit card</span>
                    <span className="ck-card-badges">
                      <span className="ck-card-badge" aria-label="Visa">
                        <svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg">
                          <text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="700" fontStyle="italic" fill="#1a1f71" letterSpacing="0.2">VISA</text>
                        </svg>
                      </span>
                      <span className="ck-card-badge" aria-label="Mastercard">
                        <svg viewBox="0 0 48 30" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="19.5" cy="15" r="9" fill="#eb001b" />
                          <circle cx="28.5" cy="15" r="9" fill="#f79e1b" />
                          <path d="M24 7.8a9 9 0 0 1 0 14.4 9 9 0 0 1 0-14.4z" fill="#ff5f00" />
                        </svg>
                      </span>
                    </span>
                  </div>
                  <div className="ck-pay-body">
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
                  </div>
                </div>

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
                    <>Pay Now</>
                  )}
                </button>

                <p className="ck-payment-note">
                  Your card details are handled securely by our payment processor and never touch our servers.
                </p>
              </form>
            </section>

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
            <div className="ck-summary">
              <h2 className="ck-summary-title">Order summary</h2>

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

              {/* Promo code moved up — sits between the products and the totals so
                  customers see it before scrolling past the subtotal. */}
              <PromoSection
                subtotalGBP={state.amount / 100}
                onChange={setPromo}
              />

              <div className="ck-summary-row">
                <span>Subtotal</span>
                <span>{state.displayPrice}</span>
              </div>
              <div className="ck-summary-row">
                <span>Shipping</span>
                <span className="ck-green">Free</span>
              </div>
              {promo && promo.discount > 0 ? (
                <div className="ck-summary-row" style={{ color: '#16a34a' }}>
                  <span>Promo ({promo.code})</span>
                  <span>−£{promo.discount.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="ck-summary-total">
                <span className="ck-summary-total-lbl">Total</span>
                <span className="ck-summary-total-amt">
                  <span className="ck-summary-total-cur">GBP</span>
                  £{totalGBP.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Social proof */}
            <div className="ck-social-proof">
              <div className="ck-social-stars">★★★★★</div>
              <div className="ck-social-text">
                <strong>4.9/5</strong> Excellent! <span className="ck-social-count">(2,847 reviews)</span>
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
          <span className="ck-mobile-sticky-total">Total: £{totalGBP.toFixed(2)}</span>
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
