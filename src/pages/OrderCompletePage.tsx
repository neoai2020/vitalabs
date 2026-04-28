import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface OrderInfo {
  description?: string
  displayPrice?: string
  items?: { sku: string; compound: string; image: string | null; displayPrice: string }[]
}

export default function OrderCompletePage() {
  const [order, setOrder] = useState<OrderInfo | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    try {
      const stored = sessionStorage.getItem('peptiva-last-order')
      if (stored) setOrder(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  return (
    <div className="oc-page">
      <header className="oc-header">
        <Link to="/" className="oc-logo">Peptiva</Link>
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

          <Link to="/" className="oc-btn">Return to Peptiva</Link>
        </div>
      </main>

      <footer className="oc-footer">
        <p>Peptiva Ltd · UK-regulated laboratory · Sold for research use only</p>
        <p>© {new Date().getFullYear()} Peptiva</p>
      </footer>
    </div>
  )
}
