import { useLocation } from 'react-router-dom'
import { getPeptideById } from '../data/peptides'

const PHONE = '447440153510'

export default function WhatsAppWidget() {
  const { pathname } = useLocation()

  let message = 'I need some help'

  const productMatch = pathname.match(/^\/products\/(.+)$/)
  if (productMatch) {
    const product = getPeptideById(productMatch[1])
    if (product) {
      message = `Can I know more about ${product.compound}?`
    }
  }

  const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-widget"
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="#ffffff">
        <path d="M16.004 2.667A13.26 13.26 0 002.67 15.923a13.16 13.16 0 001.792 6.637L2.667 29.333l6.96-1.764A13.29 13.29 0 0016.004 29.3 13.27 13.27 0 0029.333 16.04 13.27 13.27 0 0016.004 2.667zm0 24.266a11.01 11.01 0 01-5.6-1.53l-.4-.24-4.14 1.05 1.1-3.99-.26-.42a10.87 10.87 0 01-1.7-5.87A11.02 11.02 0 0116.004 4.93 11.01 11.01 0 0127.07 16.04 11.02 11.02 0 0116.004 26.933zm6.04-8.25c-.33-.17-1.96-.97-2.26-1.08-.31-.11-.53-.17-.75.17-.22.33-.86 1.08-1.05 1.3-.19.22-.39.25-.72.08-.33-.17-1.4-.52-2.67-1.65-.99-.88-1.65-1.96-1.85-2.3-.19-.33-.02-.51.15-.68.15-.15.33-.39.5-.59.17-.19.22-.33.33-.56.11-.22.06-.42-.03-.59-.08-.17-.75-1.8-1.02-2.46-.27-.65-.55-.56-.75-.57l-.64-.01c-.22 0-.59.08-.89.42-.31.33-1.17 1.14-1.17 2.78s1.2 3.22 1.36 3.44c.17.22 2.36 3.6 5.72 5.05.8.34 1.42.55 1.91.7.8.26 1.53.22 2.11.13.64-.1 1.96-.8 2.24-1.57.28-.78.28-1.44.19-1.58-.08-.14-.31-.22-.64-.39z"/>
      </svg>
    </a>
  )
}
