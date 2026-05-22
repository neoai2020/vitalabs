import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import type { CheckoutState } from '../lib/uprails'

export default function CartDrawer() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart, isOpen, closeCart } = useCart()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleCheckout = () => {
    if (items.length === 0) return

    const checkoutState: CheckoutState = {
      items: items.map(i => ({
        sku: i.sku,
        compound: `${i.compound} — ${i.doseLabel}`,
        image: i.image,
        price: i.price * i.quantity,
        displayPrice: `£${(i.price * i.quantity).toFixed(2)}`,
      })),
      amount: Math.round(totalPrice * 100),
      quantity: totalItems,
      description: items.map(i => `${i.compound} (${i.doseLabel}) x${i.quantity}`).join(', '),
      displayPrice: `£${totalPrice.toFixed(2)}`,
    }

    closeCart()
    navigate('/checkout', { state: checkoutState })
  }

  return (
    <>
      <div className="cart-overlay" onClick={closeCart} />
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h3>Your Cart ({totalItems})</h3>
          <button type="button" className="cart-drawer-close" onClick={closeCart}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <p>Your cart is empty</p>
            <button type="button" className="btn btn--glow" onClick={closeCart}>Continue Shopping</button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <div key={`${item.id}-${item.doseLabel}`} className="cart-item">
                  {item.image && (
                    <img src={item.image} alt={item.compound} className="cart-item-img" />
                  )}
                  <div className="cart-item-info">
                    <h4>{item.compound}</h4>
                    <p className="cart-item-dose">{item.doseLabel}</p>
                    <p className="cart-item-price">£{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="cart-item-qty">
                      <button type="button" onClick={() => updateQuantity(item.id, item.doseLabel, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, item.doseLabel, item.quantity + 1)}>+</button>
                    </div>
                    <button type="button" className="cart-item-remove" onClick={() => removeItem(item.id, item.doseLabel)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-drawer-total">
                <span>Total</span>
                <strong>£{totalPrice.toFixed(2)}</strong>
              </div>
              <button type="button" className="btn btn--glow btn--lg cart-checkout-btn" onClick={handleCheckout}>
                Checkout — £{totalPrice.toFixed(2)}
              </button>
              <button type="button" className="cart-clear-btn" onClick={clearCart}>Clear Cart</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
