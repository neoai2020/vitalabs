import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import type { CheckoutState } from '../lib/uprails'

export default function TestPaymentPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const testState: CheckoutState = {
      items: [{
        sku: 'TEST-ITEM',
        compound: 'Test Payment — £1.00',
        image: null,
        price: 1,
        displayPrice: '£1.00',
      }],
      amount: 100,
      quantity: 1,
      description: 'Test payment — £1.00',
      displayPrice: '£1.00',
      returnPath: '/order-complete',
    }

    navigate('/checkout', { state: testState, replace: true })
  }, [navigate])

  return null
}
