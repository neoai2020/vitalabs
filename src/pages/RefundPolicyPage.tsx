import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

export default function RefundPolicyPage() {
  return (
    <div className="st-page">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <h1>Refund &amp; Returns Policy</h1>
          <p className="legal-updated">Last updated: 1 May 2025</p>

          <section>
            <h2>1. Our Guarantee</h2>
            <p>At Peptiva, we stand behind the quality of our products. If you're not completely satisfied with your purchase, we offer a straightforward refund process within the eligibility period outlined below.</p>
          </section>

          <section>
            <h2>2. Eligibility for Refunds</h2>
            <p>You may request a refund within <strong>14 days</strong> of receiving your order, provided:</p>
            <ul>
              <li>The product is unused, unopened, and in its original sealed packaging</li>
              <li>You provide your order number and proof of purchase</li>
              <li>The product has been stored according to the instructions provided (temperature-sensitive items)</li>
            </ul>
          </section>

          <section>
            <h2>3. Non-Refundable Items</h2>
            <p>Due to the nature of our products, the following are <strong>not eligible</strong> for return or refund:</p>
            <ul>
              <li>Products that have been opened, used, or tampered with</li>
              <li>Products not stored according to guidelines (e.g., items requiring refrigeration)</li>
              <li>Orders where more than 14 days have elapsed since delivery</li>
              <li>Digital products, consultation fees, or membership subscriptions (unless covered by separate terms)</li>
            </ul>
          </section>

          <section>
            <h2>4. How to Request a Refund</h2>
            <p>To initiate a return or refund:</p>
            <ol>
              <li>Email <a href="mailto:support@peptivalabs.io">support@peptivalabs.io</a> with your order number and reason for return</li>
              <li>Our team will respond within 2 business days with return instructions</li>
              <li>Ship the item back to the address provided (return shipping is at your expense unless the item is defective)</li>
              <li>Once we receive and inspect the returned item, we'll process your refund</li>
            </ol>
          </section>

          <section>
            <h2>5. Refund Processing</h2>
            <p>Approved refunds are processed to your original payment method within <strong>5–10 business days</strong>. Please note that your bank or card provider may take additional time to reflect the refund in your account.</p>
          </section>

          <section>
            <h2>6. Damaged or Defective Products</h2>
            <p>If you receive a damaged, defective, or incorrect item:</p>
            <ul>
              <li>Contact us within 48 hours of delivery</li>
              <li>Provide photos of the damage/defect and your order number</li>
              <li>We will send a replacement at no additional cost or issue a full refund including shipping</li>
            </ul>
          </section>

          <section>
            <h2>7. Cancellations</h2>
            <p>Orders can be cancelled free of charge if the cancellation request is received <strong>before dispatch</strong>. Once an order has been shipped, it cannot be cancelled and the standard return process applies.</p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>For any questions regarding returns or refunds, please contact our support team at <a href="mailto:support@peptivalabs.io">support@peptivalabs.io</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
