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

  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [customerEmail, setCustomerEmail] = useState(state?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState('')

  const customerName = `${customerFirstName} ${customerLastName}`.trim()

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

    if (!customerFirstName.trim() || !customerLastName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
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
        const firstName = customerFirstName.trim()
        const lastName = customerLastName.trim()

        const { customerId } = await createCustomer({
          email: customerEmail.trim(),
          name: customerName,
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
  }, [status, state, customerFirstName, customerLastName, customerEmail, customerPhone, shippingCountry, shippingAddress1, shippingAddress2, shippingCity, shippingCounty, shippingPostcode])

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

      {/* Mobile-only: collapsible "Total" bar showing a product thumbnail,
          item count, and grand total. Tapping toggles the right column.
          Hidden on desktop via CSS. */}
      <button
        type="button"
        className={`ck-mobile-summary-bar ${summaryOpen ? 'is-open' : ''}`}
        onClick={() => setSummaryOpen(o => !o)}
        aria-expanded={summaryOpen}
      >
        <span className="ck-mobile-summary-left">
          {state.items[0]?.image ? (
            <img
              src={state.items[0].image}
              alt=""
              className="ck-mobile-summary-thumb"
            />
          ) : (
            <span className="ck-mobile-summary-thumb ck-mobile-summary-thumb--placeholder" aria-hidden="true" />
          )}
          <span className="ck-mobile-summary-label">
            <strong>Total</strong>
            <span className="ck-mobile-summary-items">
              {state.quantity} {state.quantity === 1 ? 'item' : 'items'}
            </span>
          </span>
        </span>
        <span className="ck-mobile-summary-right">
          <span className="ck-mobile-summary-total">£{totalGBP.toFixed(2)}</span>
          <svg className="ck-mobile-summary-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      <div className="ck-wrap">
        <div className={`ck-grid ${summaryOpen ? 'is-summary-open' : ''}`}>
          {/* LEFT COLUMN: Form */}
          <div className="ck-left">
            {/* Customer / Contact — just email, with prominent black border */}
            <section className="ck-section">
              <h2 className="ck-section-title">Contact</h2>
              <div className="ck-field ck-field--prominent">
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

              <div className="ck-field-row">
                <div className="ck-field">
                  <input
                    id="ck-firstname"
                    type="text"
                    className="ck-input"
                    placeholder=" "
                    value={customerFirstName}
                    onChange={e => setCustomerFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                  <label htmlFor="ck-firstname" className="ck-label">First name *</label>
                </div>
                <div className="ck-field">
                  <input
                    id="ck-lastname"
                    type="text"
                    className="ck-input"
                    placeholder=" "
                    value={customerLastName}
                    onChange={e => setCustomerLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                  <label htmlFor="ck-lastname" className="ck-label">Last name *</label>
                </div>
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

            {/* Social proof — bigger, headline style */}
            <div className="ck-social-proof">
              <div className="ck-social-stars">★★★★★</div>
              <div className="ck-social-text">
                <strong>4.9/5</strong> Excellent! <span className="ck-social-count">(2,847 reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="ck-footer">
        <p>Vita Labs Ltd · UK-regulated laboratory · Sold for research use only</p>
        <p>© {new Date().getFullYear()} Vita Labs · All rights reserved</p>
      </footer>
    </div>
  )
}
