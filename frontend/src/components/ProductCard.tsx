import { useState } from 'react'
import { Link } from 'react-router-dom'
import { COLOR_FAMILIES, colorFamilies, formatPrice, stockInSize, type Product } from '../api'
import QuickView from './QuickView'

type Props = {
  product: Product
  // When the Products page is filtered by size, show that size's stock.
  highlightSize?: string
}

export default function ProductCard({ product, highlightSize }: Props) {
  const [quickView, setQuickView] = useState(false)
  const soldOut = product.total_stock === 0
  const swatches = COLOR_FAMILIES.filter((f) => colorFamilies(product).includes(f.key))
  const sizeStock = highlightSize ? stockInSize(product, highlightSize) : null
  const lowInSize = sizeStock !== null && sizeStock > 0 && sizeStock <= 5

  return (
    <article className="product-card">
      <Link to={`/products/${product.product_id}`} className="product-card-link">
        <div className="product-card-image">
          {/* Two layers: the full shot, and a close-up that fades in on hover. */}
          <img className="shot" src={product.image_url} alt={product.name} loading="lazy" />
          <img className="closeup" src={product.image_url} alt="" aria-hidden="true" loading="lazy" />
          {soldOut && <span className="pennant pennant-sold">Sold out</span>}
          {lowInSize && <span className="pennant pennant-low">Only {sizeStock} left in {highlightSize}</span>}
        </div>
        <div className="product-card-body">
          <span className="product-card-type">{product.garment_type}</span>
          <h3>{product.name}</h3>
          <p className="product-card-desc">{product.description}</p>
          <div className="product-card-footer">
            <span className="product-card-price">{formatPrice(product.price)}</span>
            <span className="card-swatches" aria-label={`Colours: ${product.colors.join(', ')}`}>
              {swatches.map((family) => (
                <span
                  key={family.key}
                  className="swatch-dot swatch-dot-small"
                  style={{ background: family.swatch }}
                  title={family.label}
                />
              ))}
            </span>
          </div>
        </div>
      </Link>
      {!soldOut && (
        <button type="button" className="quick-button" onClick={() => setQuickView(true)}>
          Quick view
        </button>
      )}
      {quickView && <QuickView product={product} onClose={() => setQuickView(false)} />}
    </article>
  )
}
