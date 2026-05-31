import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fireCapiEvent, newEventId } from '../lib/tracking/capi'
import { trackEvent } from '../lib/analytics'

interface OrderInfo {
  description?: string
  displayPrice?: string
  amount?: number
  items?: { sku: string; compound: string; image: string | null; displayPrice: string; price?: number }[]
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: {
    address1: string
    address2: string
    city: string
    county: string
    postcode: string
    country: string
  }
}

export default function OrderCompletePage() {
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const webhookSent = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    try {
      const stored = sessionStorage.getItem('vitalabs-last-order')
      if (stored) {
        const parsed = JSON.parse(stored) as OrderInfo
        setOrder(parsed)

        // First-party analytics: completed checkout. Powers conversion
        // rate + abandonment charts on the admin dashboard.
        trackEvent('checkout_completed', {
          props: {
            amount_pence: parsed.amount,
            sku_count: parsed.items?.length ?? 0,
          },
        })

        // Fire Facebook Purchase event on BOTH browser pixel and server-side
        // Conversions API using the same event_id so Meta dedupes. CAPI is a
        // backup signal for users with ad-blockers / iOS ITP that drop the
        // browser pixel — recovers ~10–30% of conversions.
        if (parsed.amount) {
          const valueInPounds = parsed.amount / 100
          const eventId = newEventId('Purchase')
          if (typeof window.fbq === 'function') {
            window.fbq('track', 'Purchase', {
              value: valueInPounds,
              currency: 'GBP',
            }, { eventID: eventId })
          }
          void fireCapiEvent({
            eventId,
            eventName: 'Purchase',
            email: parsed.customerEmail,
            phone: parsed.customerPhone,
            firstName: parsed.customerName?.split(' ')[0],
            lastName: parsed.customerName?.split(' ').slice(1).join(' '),
            country: parsed.shippingAddress?.country,
            customData: {
              value: valueInPounds,
              currency: 'GBP',
              content_ids: parsed.items?.map(i => i.sku),
              content_type: 'product',
              num_items: parsed.items?.length ?? 1,
            },
          })
        }

        if (!webhookSent.current && parsed.customerEmail) {
          webhookSent.current = true
          supabase.functions.invoke('order-webhook', {
            body: {
              customerName: parsed.customerName,
              customerEmail: parsed.customerEmail,
              customerPhone: parsed.customerPhone,
              shippingAddress: parsed.shippingAddress,
              items: parsed.items,
              amount: parsed.amount,
            },
          }).catch(err => console.error('[OrderComplete] Zapier webhook failed:', err))
        }
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <div className="oc-page">
      <header className="oc-header">
        <Link to="/" className="oc-logo">Vita Labs</Link>
      </header>

      <main className="oc-main">
        <div className="oc-card">
          <div className="oc-icon">✓</div>
          <h1>Order confirmed!</h1>
          <p className="oc-subtitle">
            Thank you for your purchase. Your protocol is being prepared
            and you'll receive a confirmation email shortly.
          </p>

          {order?.items && order.items.length > 0 && (
            <div className="oc-items">
              {order.items.map((item, i) => (
                <div key={i} className="oc-item">
                  {item.image && <img src={item.image} alt={item.sku} className="oc-item-img" />}
                  <div className="oc-item-info">
                    <strong>{item.sku}</strong>
                    <span>{item.compound}</span>
                  </div>
                  <span className="oc-item-price">{item.displayPrice}</span>
                </div>
              ))}
            </div>
          )}

          {order?.displayPrice && (
            <div className="oc-total">
              <span>Total paid</span>
              <span>{order.displayPrice}</span>
            </div>
          )}

          {(order?.customerName || order?.shippingAddress) && (
            <div className="oc-details">
              {order.customerName && (
                <div className="oc-detail-block">
                  <h3>Customer</h3>
                  <p>{order.customerName}</p>
                  {order.customerEmail && <p>{order.customerEmail}</p>}
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                </div>
              )}
              {order.shippingAddress && (
                <div className="oc-detail-block">
                  <h3>Shipping to</h3>
                  <p>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                  <p>
                    {order.shippingAddress.city}
                    {order.shippingAddress.county ? `, ${order.shippingAddress.county}` : ''}
                  </p>
                  <p>{order.shippingAddress.postcode}</p>
                </div>
              )}
            </div>
          )}

          <div className="oc-next-steps">
            <h2>What happens next</h2>
            <div className="oc-steps">
              <div className="oc-step">
                <div className="oc-step-num">1</div>
                <div>
                  <strong>Order confirmation</strong>
                  <p>You'll receive an email with your order details within minutes.</p>
                </div>
              </div>
              <div className="oc-step">
                <div className="oc-step-num">2</div>
                <div>
                  <strong>Protocol preparation</strong>
                  <p>Our team prepares your personalised dosing protocol and documentation.</p>
                </div>
              </div>
              <div className="oc-step">
                <div className="oc-step-num">3</div>
                <div>
                  <strong>Fast dispatch</strong>
                  <p>Your order ships within 24 hours with free tracked delivery.</p>
                </div>
              </div>
              <div className="oc-step">
                <div className="oc-step-num">4</div>
                <div>
                  <strong>Start your protocol</strong>
                  <p>Follow your practitioner-reviewed guide for optimal results.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="oc-guarantees">
            <span>🛡️ 30-day guarantee</span>
            <span>🔬 99.3%+ purity</span>
            <span>📦 Free tracked shipping</span>
          </div>

          <Link to="/" className="oc-btn">Return to Vita Labs</Link>
        </div>
      </main>

      <footer className="oc-footer">
        <p>Vita Labs Ltd · UK-regulated laboratory · Sold for research use only</p>
        <p>© {new Date().getFullYear()} Vita Labs</p>
      </footer>
    </div>
  )
}
