import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="st-footer">
      <div className="st-footer-inner">
        <div className="st-footer-grid">
          <div className="st-footer-col st-footer-brand">
            <img src="/images/logo.png" alt="Peptiva Research" className="st-footer-logo" />
            <p>The UK's leading peptide research platform. Personalised protocols backed by peer-reviewed science.</p>
          </div>
          <div className="st-footer-col">
            <h4>Products</h4>
            <Link to="/products">All Peptides</Link>
          </div>
          <div className="st-footer-col">
            <h4>Company</h4>
            <Link to="/shipping">Shipping &amp; Delivery</Link>
            <Link to="/refund-policy">Refund Policy</Link>
            <Link to="/disclaimer">Disclaimer</Link>
          </div>
          <div className="st-footer-col">
            <h4>Legal</h4>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
          <div className="st-footer-col">
            <h4>Support</h4>
            <a href="mailto:support@peptiva.co.uk">support@peptiva.co.uk</a>
          </div>
        </div>
        <div className="st-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Peptiva. All rights reserved.</p>
          <div className="st-footer-legal-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund-policy">Refunds</Link>
            <Link to="/disclaimer">Disclaimer</Link>
            <Link to="/shipping">Shipping</Link>
          </div>
          <p className="st-footer-disclaimer">
            All products are for research purposes only. Individual results may vary.
            Consult a qualified healthcare professional before beginning any peptide protocol.
          </p>
        </div>
      </div>
    </footer>
  )
}
