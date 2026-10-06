import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CATEGORIES,
  COLOR_FAMILIES,
  SIZES,
  categoryOf,
  colorFamilies,
  fetchProducts,
  stockInSize,
  type Product,
} from '../api'
import PriceFilter from '../components/PriceFilter'
import ProductCard from '../components/ProductCard'

const SORTS = [
  { key: 'name', label: 'Name: A to Z' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'stock', label: 'Most in stock' },
] as const

// Every filter lives in the URL (?category=hoodies&size=M&color=navy&min=40
// &max=70&instock=1&sort=price-asc&q=bulldog), so a filtered view can be shared or
// bookmarked and the Back button steps through changes.
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()

  const category = params.get('category') ?? ''
  const query = params.get('q') ?? ''
  const size = params.get('size') ?? ''
  const color = params.get('color') ?? ''
  const minPrice = Number(params.get('min')) || 0
  const maxPrice = Number(params.get('max')) || 0
  const inStockOnly = params.get('instock') === '1'
  const sort = params.get('sort') ?? 'name'

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('We could not load the catalogue. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  function setParam(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace })
  }

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = products.filter((product) => {
      if (category && categoryOf(product) !== category) return false
      if (size && stockInSize(product, size) === 0) return false
      if (color && !colorFamilies(product).some((family) => family === color)) return false
      if (minPrice && product.price < minPrice) return false
      if (maxPrice && product.price > maxPrice) return false
      if (inStockOnly && product.total_stock === 0) return false
      if (!term) return true
      return [product.name, product.description, ...product.colors, ...product.search_tags]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
    const sorted = [...filtered]
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
    if (sort === 'stock') sorted.sort((a, b) => b.total_stock - a.total_stock)
    return sorted
  }, [products, category, size, color, minPrice, maxPrice, inStockOnly, query, sort])

  const prices = products.map((p) => p.price)
  const lowPrice = prices.length ? Math.min(...prices) : 0
  const highPrice = prices.length ? Math.max(...prices) : 0

  function setPriceRange(min: number, max: number) {
    const next = new URLSearchParams(params)
    for (const [key, value] of [['min', min], ['max', max]] as const) {
      if (value) next.set(key, String(value))
      else next.delete(key)
    }
    setParams(next)
  }

  function removeFilter(key: string) {
    if (key === 'price') setPriceRange(0, 0)
    else setParam(key, '')
  }

  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label
  const colorLabel = COLOR_FAMILIES.find((c) => c.key === color)?.label

  const activeFilters = [
    categoryLabel && { key: 'category', label: categoryLabel },
    query && { key: 'q', label: `“${query}”` },
    size && { key: 'size', label: `In stock in ${size}` },
    colorLabel && { key: 'color', label: colorLabel },
    (minPrice || maxPrice) && {
      key: 'price',
      label: minPrice && maxPrice ? `$${minPrice}–$${maxPrice}` : minPrice ? `$${minPrice} & up` : `Up to $${maxPrice}`,
    },
    inStockOnly && { key: 'instock', label: 'In stock only' },
  ].filter((f): f is { key: string; label: string } => Boolean(f))

  function clearAll() {
    setParams(sort !== 'name' ? { sort } : {})
  }

  return (
    <div className="page">
      <div className="page-heading shop-heading">
        <div>
          <p className="eyebrow">The shop{categoryLabel ? ` · ${categoryLabel}` : ''}</p>
          <h1>{categoryLabel ?? 'Everything Bulldog Blue'}</h1>
          <p className="scrap shop-note">sizes show live stock, sold-out sizes say so</p>
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Search hoodies, colors, sports…"
          value={query}
          onChange={(event) => setParam('q', event.target.value, true)}
          aria-label="Search products"
        />
      </div>

      <div className="filter-row" role="group" aria-label="Category">
        {[{ key: '', label: 'All' }, ...CATEGORIES].map((option) => (
          <button
            key={option.key || 'all'}
            type="button"
            className={category === option.key ? 'chip chip-active' : 'chip'}
            onClick={() => setParam('category', option.key)}
            aria-pressed={category === option.key}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="refine-bar">
        <label className="refine-field">
          <span>Size</span>
          <select value={size} onChange={(event) => setParam('size', event.target.value)}>
            <option value="">Any size</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <PriceFilter
          min={minPrice}
          max={maxPrice}
          low={lowPrice}
          high={highPrice}
          onApply={setPriceRange}
        />

        <label className="refine-check">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => setParam('instock', event.target.checked ? '1' : '')}
          />
          In stock only
        </label>

        <label className="refine-field refine-sort">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setParam('sort', event.target.value === 'name' ? '' : event.target.value)}>
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="swatch-row" role="group" aria-label="Colour">
        <span className="swatch-row-label">Colour</span>
        {COLOR_FAMILIES.map((family) => (
          <button
            key={family.key}
            type="button"
            className={color === family.key ? 'swatch swatch-active' : 'swatch'}
            onClick={() => setParam('color', color === family.key ? '' : family.key)}
            aria-pressed={color === family.key}
            title={family.label}
          >
            <span className="swatch-dot" style={{ background: family.swatch }} />
            {family.label}
          </button>
        ))}
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="active-filter"
              onClick={() => removeFilter(filter.key)}
              aria-label={`Remove filter: ${filter.label}`}
            >
              {filter.label} <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="text-link clear-all" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {loading && <p className="status">Loading products…</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && (
        <>
          <p className="result-count" aria-live="polite">
            Showing {visible.length} of {products.length} items
          </p>
          {visible.length > 0 ? (
            <div className="product-grid">
              {visible.map((product) => (
                <ProductCard key={product.product_id} product={product} highlightSize={size} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No items match those filters</h3>
              <p>Try a different size or colour, or ask our assistant to find something similar.</p>
              <button type="button" className="button" onClick={clearAll}>
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
