import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

export default function ShippingPage() {
  return (
    <div className="st-page">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <h1>Shipping &amp; Delivery</h1>
          <p className="legal-updated">Last updated: 1 May 2025</p>

          <section>
            <h2>1. Processing Times</h2>
            <p>Orders are processed within <strong>1–2 business days</strong> after payment confirmation. Orders placed on weekends or bank holidays will be processed the following business day.</p>
          </section>

          <section>
            <h2>2. Delivery Options</h2>
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Timeframe</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard UK Delivery</td>
                  <td>3–5 business days</td>
                  <td>£4.99 (Free over £75)</td>
                </tr>
                <tr>
                  <td>Express UK Delivery</td>
                  <td>1–2 business days</td>
                  <td>£9.99</td>
                </tr>
                <tr>
                  <td>Next Day (order before 2pm)</td>
                  <td>Next business day</td>
                  <td>£12.99</td>
                </tr>
                <tr>
                  <td>Europe</td>
                  <td>5–10 business days</td>
                  <td>£14.99</td>
                </tr>
                <tr>
                  <td>International</td>
                  <td>7–14 business days</td>
                  <td>£19.99</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>3. Tracking</h2>
            <p>All orders include tracking. You'll receive a tracking number via email once your order has been dispatched. You can track your order at any time using the link provided.</p>
          </section>

          <section>
            <h2>4. Packaging</h2>
            <p>All orders are shipped in <strong>discreet, unbranded packaging</strong> for your privacy. Temperature-sensitive products are shipped with appropriate cold-chain packaging to maintain product integrity.</p>
          </section>

          <section>
            <h2>5. Delivery Issues</h2>
            <p>If your order has not arrived within the expected timeframe:</p>
            <ol>
              <li>Check your tracking link for the latest status</li>
              <li>Allow an additional 2 business days for potential carrier delays</li>
              <li>Contact us at <a href="mailto:support@peptivalabs.io">support@peptivalabs.io</a> with your order number</li>
            </ol>
            <p>We will investigate with the carrier and either reship or refund as appropriate.</p>
          </section>

          <section>
            <h2>6. Incorrect Address</h2>
            <p>Please ensure your shipping address is correct at the time of order. We cannot be held responsible for orders delivered to an incorrect address provided by the customer. Re-delivery costs will be charged to the customer.</p>
          </section>

          <section>
            <h2>7. Customs &amp; Import Duties</h2>
            <p>International orders may be subject to customs duties, taxes, or import fees imposed by your country's customs authority. These charges are the responsibility of the recipient and are not included in our product or shipping prices.</p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>For shipping enquiries, contact <a href="mailto:support@peptivalabs.io">support@peptivalabs.io</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
