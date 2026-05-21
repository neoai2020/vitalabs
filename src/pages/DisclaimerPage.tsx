import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

export default function DisclaimerPage() {
  return (
    <div className="st-page">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <h1>Medical &amp; Legal Disclaimer</h1>
          <p className="legal-updated">Last updated: 1 May 2025</p>

          <section>
            <h2>1. Research Purposes Only</h2>
            <p>All peptide products available on this website are sold strictly for <strong>research purposes only</strong>. They are not intended for human consumption, medical use, or as dietary supplements unless explicitly stated otherwise and accompanied by appropriate professional guidance.</p>
          </section>

          <section>
            <h2>2. Not Medical Advice</h2>
            <p>The information provided on this website — including product descriptions, dosage calculators, articles, blog posts, and quiz results — is for <strong>educational and informational purposes only</strong>. It does not constitute medical advice, diagnosis, or treatment.</p>
            <p>Always consult a qualified healthcare professional before beginning any peptide protocol, supplement regimen, or making changes to your health routine. Never disregard professional medical advice or delay seeking it because of information found on this Site.</p>
          </section>

          <section>
            <h2>3. No Guarantees of Results</h2>
            <p>Individual results may vary significantly. Testimonials, reviews, and case studies presented on this Site reflect individual experiences and are not guarantees of specific outcomes. Factors such as genetics, lifestyle, diet, adherence to protocols, and pre-existing health conditions all influence results.</p>
          </section>

          <section>
            <h2>4. Dosage Calculator Disclaimer</h2>
            <p>The dosage calculator on this Site provides <strong>general guidance only</strong> based on publicly available research literature. It is not a substitute for professional medical consultation. Appropriate dosing depends on individual health factors that cannot be assessed through an online tool.</p>
          </section>

          <section>
            <h2>5. Third-Party Content</h2>
            <p>This Site may contain links to third-party websites, research papers, or external resources. We do not endorse, control, or assume responsibility for the content or practices of third-party sites. Accessing external links is at your own risk.</p>
          </section>

          <section>
            <h2>6. Product Information Accuracy</h2>
            <p>While we strive to ensure all product information, descriptions, and specifications are accurate and up-to-date, we do not warrant that all information on this Site is complete, current, or error-free. Product formulations, availability, and pricing may change without notice.</p>
          </section>

          <section>
            <h2>7. Regulatory Compliance</h2>
            <p>It is your responsibility to ensure that the purchase, importation, possession, and use of our products complies with all applicable laws and regulations in your jurisdiction. We make no representation that products available on this Site are appropriate or available for use in all locations.</p>
          </section>

          <section>
            <h2>8. Assumption of Risk</h2>
            <p>By purchasing and using any products from this Site, you acknowledge and accept all risks associated with such use. Peptiva, its owners, employees, and affiliates shall not be held liable for any adverse effects, injuries, or damages arising from the use or misuse of our products.</p>
          </section>

          <section>
            <h2>9. Age Restriction</h2>
            <p>Our products are intended for adults aged 18 and over only. By using this Site and purchasing products, you confirm that you are at least 18 years of age.</p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>If you have questions about this disclaimer or our products, contact us at <a href="mailto:support@peptiva.co.uk">support@peptiva.co.uk</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
