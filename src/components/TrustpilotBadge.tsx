export function TrustpilotSection() {
  return (
    <section className="tp-section">
      <div className="st-container">
        <div className="tp-full">
          <div className="tp-full-left">
            <div className="tp-full-score">
              <span className="tp-full-number">4.9</span>
              <span className="tp-full-outof">/ 5</span>
            </div>
            <div className="tp-full-stars">
              {[1,2,3,4,5].map(i => (
                <span key={i} className={`tp-star-box ${i === 5 ? 'tp-star-box--90' : ''}`}>
                  <svg viewBox="0 0 24 24"><path d="M12 2l2.9 8.9H24l-7.4 5.4 2.9 8.9L12 19.8l-7.4 5.4 2.9-8.9L0 10.9h9.1L12 2z"/></svg>
                </span>
              ))}
            </div>
            <p className="tp-full-label">Based on <strong>200+ reviews</strong></p>
          </div>
          <div className="tp-full-right">
            <div className="tp-full-brand">
              <svg className="tp-full-tp-icon" viewBox="0 0 24 24"><path d="M12 2l2.9 8.9H24l-7.4 5.4 2.9 8.9L12 19.8l-7.4 5.4 2.9-8.9L0 10.9h9.1L12 2z" fill="#00B67A"/></svg>
              <span className="tp-full-tp-name">Trustpilot</span>
            </div>
            <p className="tp-full-rated">Rated <strong>Excellent</strong></p>
            <p className="tp-full-desc">Our customers rate us 4.9 out of 5 on Trustpilot. Real reviews from verified buyers — no fakes, no filters.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function TrustpilotStrip() {
  return (
    <div className="tp-strip">
      <div className="tp-strip-inner">
        <svg className="tp-strip-icon" viewBox="0 0 24 24"><path d="M12 2l2.9 8.9H24l-7.4 5.4 2.9 8.9L12 19.8l-7.4 5.4 2.9-8.9L0 10.9h9.1L12 2z" fill="#00B67A"/></svg>
        <span className="tp-strip-name">Trustpilot</span>
        <div className="tp-strip-stars">
          {[1,2,3,4,5].map(i => (
            <span key={i} className={`tp-strip-star ${i === 5 ? 'tp-strip-star--90' : ''}`}>
              <svg viewBox="0 0 24 24"><path d="M12 2l2.9 8.9H24l-7.4 5.4 2.9 8.9L12 19.8l-7.4 5.4 2.9-8.9L0 10.9h9.1L12 2z"/></svg>
            </span>
          ))}
        </div>
        <span className="tp-strip-score"><strong>4.9</strong> / 5</span>
        <span className="tp-strip-sep">|</span>
        <span className="tp-strip-label">Rated <strong>Excellent</strong></span>
      </div>
    </div>
  )
}
