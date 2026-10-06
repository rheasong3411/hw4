import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, type Product } from '../api'
import AddToBag from './AddToBag'

// A modal with the essentials and Add to bag, so shoppers can buy from the
// grid without leaving it.
export default function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const [size, setSize] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="quick-view"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${product.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="icon-button quick-close" onClick={onClose} aria-label="Close quick view">
          ×
        </button>
        <div className="quick-image">
          <img src={product.image_url} alt={product.name} />
        </div>
        <div className="quick-info">
          <span className="eyebrow">{product.garment_type}</span>
          <h2>{product.name}</h2>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="quick-desc">{product.description}</p>
          <p className="quick-colors">{product.colors.join(' · ')}</p>
          <AddToBag product={product} selectedSize={size} onSelectSize={setSize} compact />
          <Link to={`/products/${product.product_id}`} className="text-link" onClick={onClose}>
            See full details →
          </Link>
        </div>
      </div>
    </div>
  )
}
