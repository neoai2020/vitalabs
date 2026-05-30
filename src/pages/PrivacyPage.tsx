import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

export default function PrivacyPage() {
  return (
    <div className="st-page">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: 1 May 2025</p>

          <section>
            <h2>1. Introduction</h2>
            <p>Vita Labs ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website and purchase our products.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>Information You Provide</h3>
            <ul>
              <li><strong>Account information:</strong> Name, email address, password</li>
              <li><strong>Order information:</strong> Billing/shipping address, payment details, phone number</li>
              <li><strong>Quiz responses:</strong> Health goals, body metrics, and preferences you share through our assessment quiz</li>
              <li><strong>Communications:</strong> Messages sent to our support team</li>
            </ul>
            <h3>Information Collected Automatically</h3>
            <ul>
              <li><strong>Device data:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Usage data:</strong> Pages visited, time spent, click patterns, referral sources</li>
              <li><strong>Location data:</strong> Approximate location based on IP address</li>
              <li><strong>Cookies &amp; tracking:</strong> See Section 7 below</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Process and fulfil your orders</li>
              <li>Provide personalised product recommendations</li>
              <li>Send order confirmations, shipping updates, and receipts</li>
              <li>Respond to customer service requests</li>
              <li>Improve our website, products, and services</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Legal Basis for Processing (GDPR)</h2>
            <p>We process your data under the following legal bases:</p>
            <ul>
              <li><strong>Contract:</strong> Processing necessary to fulfil your order</li>
              <li><strong>Consent:</strong> Marketing communications and non-essential cookies</li>
              <li><strong>Legitimate interest:</strong> Fraud prevention, analytics, service improvement</li>
              <li><strong>Legal obligation:</strong> Tax records, regulatory compliance</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul>
              <li><strong>Payment processors:</strong> To securely process transactions</li>
              <li><strong>Shipping partners:</strong> To deliver your orders</li>
              <li><strong>Analytics providers:</strong> To understand site usage (anonymised where possible)</li>
              <li><strong>Marketing platforms:</strong> To serve relevant advertisements (with consent)</li>
              <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>We retain your personal information for as long as necessary to fulfil the purposes outlined in this policy, unless a longer retention period is required by law. Specifically:</p>
            <ul>
              <li>Account data: Until you request deletion</li>
              <li>Order records: 7 years (tax/legal requirements)</li>
              <li>Marketing preferences: Until consent is withdrawn</li>
              <li>Analytics data: 26 months</li>
            </ul>
          </section>

          <section>
            <h2>7. Cookies &amp; Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li><strong>Essential cookies:</strong> Enable core site functionality (cart, checkout, login)</li>
              <li><strong>Analytics cookies:</strong> Understand user behaviour and improve our site</li>
              <li><strong>Marketing cookies:</strong> Deliver relevant advertisements and measure campaign effectiveness</li>
            </ul>
            <p>You can manage cookie preferences through your browser settings. Disabling essential cookies may affect site functionality.</p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Under GDPR and UK data protection law, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
              <li><strong>Withdraw consent:</strong> Revoke previously given consent at any time</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:support@vitalabs.io">support@vitalabs.io</a>.</p>
          </section>

          <section>
            <h2>9. Data Security</h2>
            <p>We implement industry-standard security measures including TLS/SSL encryption, secure payment processing, access controls, and regular security audits to protect your information. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2>10. International Transfers</h2>
            <p>Your data may be transferred to and processed in countries outside the UK/EEA. Where this occurs, we ensure appropriate safeguards are in place (such as Standard Contractual Clauses) to protect your data.</p>
          </section>

          <section>
            <h2>11. Children's Privacy</h2>
            <p>Our Site is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take steps to delete it promptly.</p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on our Site or sending an email. Your continued use of the Site constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>For privacy-related enquiries:</p>
            <p>Email: <a href="mailto:support@vitalabs.io">support@vitalabs.io</a></p>
            <p>You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
