import { Link } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

export default function TermsPage() {
  return (
    <div className="st-page">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: 1 May 2025</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the Vita Labs website ("Site") and purchasing any products offered, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Site or purchase products.</p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>You must be at least 18 years of age to use this Site and purchase products. By placing an order, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding agreement.</p>
          </section>

          <section>
            <h2>3. Products &amp; Research Use</h2>
            <p>All peptide products sold on this Site are intended for <strong>research purposes only</strong>. Products are not intended to diagnose, treat, cure, or prevent any disease or medical condition. They are not approved for human consumption unless explicitly stated and accompanied by appropriate medical supervision.</p>
            <p>You acknowledge that you are purchasing these products at your own risk and that you will comply with all applicable local, national, and international laws governing the purchase, possession, and use of such products in your jurisdiction.</p>
          </section>

          <section>
            <h2>4. Orders &amp; Payments</h2>
            <p>All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order at our sole discretion, including orders that appear to be placed by resellers or distributors.</p>
            <p>Payment must be made in full at the time of purchase. We accept payment methods as displayed at checkout. All prices are in GBP (£) unless otherwise stated and are inclusive of applicable taxes.</p>
          </section>

          <section>
            <h2>5. Shipping &amp; Delivery</h2>
            <p>We aim to dispatch orders within 1–3 business days of payment confirmation. Delivery timeframes are estimates only and not guaranteed. We are not responsible for delays caused by carriers, customs, or events outside our control.</p>
            <p>Risk of loss passes to you upon delivery to the carrier. It is your responsibility to ensure your shipping address is correct.</p>
          </section>

          <section>
            <h2>6. Returns &amp; Refunds</h2>
            <p>Please see our <Link to="/refund-policy">Refund Policy</Link> for full details on returns, exchanges, and refund eligibility.</p>
          </section>

          <section>
            <h2>7. Intellectual Property</h2>
            <p>All content on this Site — including text, graphics, logos, images, product descriptions, and software — is the property of Vita Labs or its licensors and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.</p>
          </section>

          <section>
            <h2>8. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Site for any unlawful purpose or in violation of these Terms</li>
              <li>Attempt to gain unauthorised access to any part of the Site or its systems</li>
              <li>Interfere with the proper working of the Site</li>
              <li>Impersonate any person or entity</li>
              <li>Use automated tools to scrape, crawl, or extract data from the Site</li>
            </ul>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Vita Labs and its directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or products, including but not limited to loss of profits, data, or goodwill.</p>
            <p>Our total liability shall not exceed the amount paid by you for the specific product giving rise to the claim.</p>
          </section>

          <section>
            <h2>10. Disclaimer of Warranties</h2>
            <p>The Site and products are provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Vita Labs and its affiliates from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Site, violation of these Terms, or infringement of any third-party rights.</p>
          </section>

          <section>
            <h2>12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2>13. Changes to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site following any changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2>14. Contact</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:support@vitalabs.io">support@vitalabs.io</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
