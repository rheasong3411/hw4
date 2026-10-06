import { useEffect, useState } from 'react'
import { fetchAlternatives, type Product } from '../api'
import ProductCard from './ProductCard'

// "Similar styles in stock" under a product page, from the same ranking as the
// agent's find_alternatives tool. If some sizes are sold out, the shopper can
// ask for similar items that have that size.
export default function SimilarStyles({ product }: { product: Product }) {
  const soldOutSizes = product.inventory.filter((s) => s.quantity === 0).map((s) => s.size)
  const [size, setSize] = useState<string | null>(null)
  const [items, setItems] = useState<Product[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAlternatives(product.product_id, size ?? undefined)
      .then((found) => !cancelled && setItems(found))
      .catch(() => !cancelled && setItems([]))
    return () => {
      cancelled = true
    }
  }, [product.product_id, size])

  return (
    <section className="similar" aria-labelledby="similar-heading">
      <div className="similar-heading">
        <h2 id="similar-heading">
          {size ? `Similar styles in stock in ${size}` : 'Similar styles in stock'}
        </h2>
        {soldOutSizes.length > 0 && (
          <div className="similar-sizes" role="group" aria-label="Find similar items in a sold-out size">
            <span>Need a size that&apos;s sold out here?</span>
            {soldOutSizes.map((s) => (
              <button
                key={s}
                type="button"
                className={size === s ? 'chip chip-active' : 'chip'}
                aria-pressed={size === s}
                onClick={() => setSize(size === s ? null : s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {items === null ? (
        <p className="status">Finding similar styles…</p>
      ) : items.length > 0 ? (
        <div className="product-grid">
          {items.map((item) => (
            <ProductCard key={item.product_id} product={item} highlightSize={size ?? undefined} />
          ))}
        </div>
      ) : (
        <p className="status">No similar styles are in stock{size ? ` in ${size}` : ''} right now.</p>
      )}
    </section>
  )
}
