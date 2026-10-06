import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CATEGORIES, categoryOf, fetchProduct, formatPrice, type Product } from '../api'
import { useChatPanel } from '../chat/ChatPanelContext'
import AddToBag from '../components/AddToBag'
import SimilarStyles from '../components/SimilarStyles'

// Keying by productId gives each product a fresh state when the URL changes.
export default function ProductDetailPage() {
  const { productId = '' } = useParams()
  return <ProductDetail key={productId} productId={productId} />
}

function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const { askAssistant } = useChatPanel()

  useEffect(() => {
    fetchProduct(productId)
      .then(setProduct)
      .catch(() => setError('We could not find that product.'))
  }, [productId])

  if (error) {
    return (
      <div className="page">
        <p className="status status-error">{error}</p>
        <Link to="/products" className="text-link">
          ← Back to products
        </Link>
      </div>
    )
  }

  if (!product) {
    return <p className="page status">Loading product…</p>
  }

  const soldOut = product.total_stock === 0
  const selected = product.inventory.find((item) => item.size === selectedSize)
  const category = CATEGORIES.find((c) => c.key === categoryOf(product))

  // Hover to inspect the stitching: the photo zooms toward the cursor.
  function handleMove(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    setZoom({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    })
  }

  return (
    <div className="page product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link>
        <span aria-hidden="true">/</span>
        {category && (
          <>
            <Link to={`/products?category=${category.key}`}>{category.label}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail">
        <div
          className={zoom ? 'detail-image stitched is-zoomed' : 'detail-image stitched'}
          onMouseMove={handleMove}
          onMouseLeave={() => setZoom(null)}
        >
          <img
            src={product.image_url}
            alt={product.name}
            style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          <span className="scrap detail-zoom-hint" aria-hidden="true">
            hover to see the stitching
          </span>
        </div>

        <div className="detail-info">
          <span className="eyebrow">{product.garment_type}</span>
          <h1>{product.name}</h1>
          <div className="detail-price-row">
            <p className="detail-price">{formatPrice(product.price)}</p>
            {soldOut && <span className="pennant pennant-sold">Sold out</span>}
          </div>

          <p className="detail-desc">{product.description}</p>

          <div className="detail-block">
            <h3>Colours</h3>
            <p className="detail-colors">{product.colors.join(', ')}</p>
          </div>

          <div className="detail-block">
            <AddToBag product={product} selectedSize={selectedSize} onSelectSize={setSelectedSize} />
          </div>

          <div className="detail-ask">
            <button
              type="button"
              className="button button-outline"
              onClick={() =>
                askAssistant(
                  selected
                    ? `Is the ${product.name} in stock in ${selected.size}? What similar styles do you have in ${selected.size}?`
                    : `Tell me about the ${product.name}: which sizes are in stock, and what's similar?`,
                )
              }
            >
              {selected ? `Ask our assistant about size ${selected.size}` : 'Ask our assistant about this item'}
            </button>
            <span>Live stock answers and similar styles, in the chat.</span>
          </div>

          <ul className="detail-perks">
            <li>✦ Returns within 30 days on unworn items with tags</li>
            <li>✦ Questions? orderdept@campuscustoms.com or (475) 301-4205</li>
          </ul>
        </div>
      </div>
      <SimilarStyles product={product} />
    </div>
  )
}
