import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import { useBag } from '../bag/BagContext'
import Bulldog from './Bulldog'

// Slide-in shopping bag. Quantities are capped at the stock in each size.
// There is no payment backend yet, so checkout says so honestly.
export default function BagDrawer() {
  const { lines, count, subtotal, open, setOpen, setQuantity, remove } = useBag()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <>
      <div className={open ? 'drawer-scrim is-open' : 'drawer-scrim'} onClick={() => setOpen(false)} />
      <aside
        className={open ? 'bag-drawer is-open' : 'bag-drawer'}
        aria-label="Shopping bag"
        aria-hidden={!open}
      >
        <header className="bag-header">
          <div>
            <p className="eyebrow">Your bag</p>
            <h2>
              {count} {count === 1 ? 'item' : 'items'}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close bag">
            ×
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="bag-empty">
            <Bulldog pose="peek" size={150} />
            <p className="scrap">Nothing in here yet…</p>
            <Link to="/products" className="button" onClick={() => setOpen(false)}>
              Shop the collection
            </Link>
          </div>
        ) : (
          <>
            <ul className="bag-lines">
              {lines.map((line) => (
                <li key={`${line.product_id}-${line.size}`} className="bag-line">
                  <Link to={`/products/${line.product_id}`} onClick={() => setOpen(false)} className="bag-thumb">
                    <img src={line.image_url} alt="" />
                  </Link>
                  <div className="bag-line-info">
                    <Link to={`/products/${line.product_id}`} onClick={() => setOpen(false)} className="bag-line-name">
                      {line.name}
                    </Link>
                    <span className="bag-line-meta">Size {line.size} · {formatPrice(line.price)}</span>
                    <div className="stepper" role="group" aria-label={`Quantity of ${line.name}, size ${line.size}`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.product_id, line.size, line.quantity - 1)}
                        aria-label="One fewer"
                      >
                        −
                      </button>
                      <span aria-live="polite">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.product_id, line.size, line.quantity + 1)}
                        disabled={line.quantity >= line.max}
                        aria-label="One more"
                      >
                        +
                      </button>
                    </div>
                    {line.quantity >= line.max && (
                      <span className="bag-line-cap">That&apos;s all we have in {line.size}</span>
                    )}
                  </div>
                  <div className="bag-line-end">
                    <strong>{formatPrice(line.price * line.quantity)}</strong>
                    <button type="button" className="text-link" onClick={() => remove(line.product_id, line.size)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="bag-footer">
              <div className="bag-subtotal">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <button type="button" className="button button-block" disabled>
                Checkout opens soon
              </button>
              <p className="bag-note">
                Online checkout isn&apos;t live yet. Your bag is saved on this device; visit us at
                57 Broadway or email orderdept@campuscustoms.com to order.
              </p>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
