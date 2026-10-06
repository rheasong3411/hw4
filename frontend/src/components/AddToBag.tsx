import { useState } from 'react'
import { formatPrice, type Product } from '../api'
import { useBag } from '../bag/BagContext'

// Buttons show availability only; the exact count appears once a size is chosen.
function availability(quantity: number): string {
  return quantity === 0 ? 'Out of stock' : 'In stock'
}

function sizeStock(size: string, quantity: number): string {
  return quantity <= 5 ? `Size ${size}: only ${quantity} left` : `Size ${size}: ${quantity} in stock`
}

type Props = {
  product: Product
  selectedSize: string | null
  onSelectSize: (size: string) => void
  compact?: boolean
}

// Size buttons (sold-out sizes disabled and struck through) plus Add to bag.
// Used on the product page and in quick view.
export default function AddToBag({ product, selectedSize, onSelectSize, compact = false }: Props) {
  const { add } = useBag()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const selected = product.inventory.find((item) => item.size === selectedSize)
  const soldOut = product.total_stock === 0

  function handleAdd() {
    if (!selectedSize) {
      setMessage({ ok: false, text: 'Choose a size first.' })
      return
    }
    const result = add(product, selectedSize)
    setMessage({ ok: result.ok, text: result.message })
  }

  return (
    <div className={compact ? 'add-to-bag compact' : 'add-to-bag'}>
      <div className="size-heading">
        <h3>Size</h3>
        {!selected && !soldOut && <span className="size-hint">Choose a size to see stock</span>}
      </div>
      <div className="size-grid" role="radiogroup" aria-label="Choose a size">
        {product.inventory.map((item) => {
          const unavailable = item.quantity === 0
          const isSelected = item.size === selectedSize
          return (
            <button
              key={item.size}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={['size-option', unavailable ? 'size-unavailable' : '', isSelected ? 'size-selected' : ''].join(' ')}
              disabled={unavailable}
              onClick={() => {
                onSelectSize(item.size)
                setMessage(null)
              }}
              aria-label={`${item.size}: ${availability(item.quantity)}`}
            >
              <strong>{item.size}</strong>
              <span>{availability(item.quantity)}</span>
            </button>
          )
        })}
      </div>
      <p className={selected && selected.quantity <= 5 ? 'size-stock low' : 'size-stock'} aria-live="polite">
        {selected ? sizeStock(selected.size, selected.quantity) : '\u00a0'}
      </p>
      <button type="button" className="button button-block button-bag" onClick={handleAdd} disabled={soldOut}>
        {soldOut ? 'Sold out' : selectedSize ? `Add to bag · ${formatPrice(product.price)}` : 'Select a size'}
      </button>
      {message && (
        <p className={message.ok ? 'bag-message ok' : 'bag-message'} role="status">
          {message.text}
        </p>
      )}
    </div>
  )
}
