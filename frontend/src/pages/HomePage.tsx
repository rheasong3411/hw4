import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, categoryOf, fetchProducts, formatPrice, type Product } from '../api'
import { useChatPanel } from '../chat/ChatPanelContext'
import Bulldog from '../components/Bulldog'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import Skyline from '../components/Skyline'

const HERO_ID = 'district-vit-crewneck-vintage-bulldog'
const APPROVED_ID = 'super-heavyweight-crewneck-arched-yale-crest'
const FAVORITE_IDS = [
  '2025-yale-vs-harvard-t-shirt',
  'champion-reverse-weave-hoodie-1',
  'grace-hopper-college-crewneck',
  'brooks-brothers-bomber-jacket-yale',
]
// A photo for each category tile, chosen for a clean shot.
const CATEGORY_IMAGES: Record<string, string> = {
  hoodies: 'champion-reverse-weave-hoodie-1',
  crewnecks: 'saybrook-college-crewneck',
  tees: 'yale-bowl-t-shirt',
  'quarter-zips': 'berkeley-1-4-zip',
  jackets: 'benjamin-franklin-fleece-jacket',
}
// Scrapbook collage: product shots with handwritten captions.
const COLLAGE = [
  { id: 'yale-bowl-t-shirt', caption: 'game day, sorted' },
  { id: 'davenport-college-crewneck', caption: 'for the college loyalists' },
  { id: 'school-of-nursing-crest-t-shirt', caption: 'grad school pride' },
  { id: 'pierson-logo-t-shirt', caption: 'under $35, still classic' },
  { id: 'hype-and-vice-yale-university-premium-crewneck', caption: 'cozy library hours' },
]

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const { askAssistant, setOpen } = useChatPanel()

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const byId = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products])
  const hero = byId.get(HERO_ID)
  const approved = byId.get(APPROVED_ID)
  const favorites = FAVORITE_IDS.map((id) => byId.get(id)).filter((p): p is Product => !!p)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => (c[categoryOf(p)] = (c[categoryOf(p)] ?? 0) + 1))
    return c
  }, [products])

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-letters" aria-hidden="true">
          YALE
        </div>
        <div className="hero-copy">
          <span className="pennant pennant-label">The Bulldog Blue edit</span>
          <h1>
            A little Yale.
            <br />
            <em>Everywhere.</em>
          </h1>
          <p className="hero-lede">
            Heavyweight crewnecks, soft hoodies and game-day tees in deep Yale blue, for the
            dorm, the stands and every reunion after.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="button button-large">
              Shop the collection
            </Link>
            <button type="button" className="text-link hero-chat" onClick={() => setOpen(true)}>
              or ask our bulldog concierge →
            </button>
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-arch">
            {hero && <img src={hero.image_url} alt={hero.name} />}
          </div>
          <div className="hero-dog">
            <Bulldog pose="peek" size={150} label="Our bulldog mascot peeking over the frame" />
          </div>
          {hero && (
            <Link to={`/products/${hero.product_id}`} className="scrap hero-caption">
              <span className="tape" aria-hidden="true" />
              the vintage bulldog crew · {formatPrice(hero.price)}
            </Link>
          )}
          <span className="stitch-badge" aria-hidden="true">
            New Haven
            <br />
            CT
          </span>
        </div>
      </section>

      {/* ---------- Ribbon ---------- */}
      <div className="ribbon" aria-hidden="true">
        <div className="ribbon-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              Hoodies ✦ Crewnecks ✦ Tees ✦ Quarter-zips ✦ Jackets ✦ Residential colleges ✦ Varsity
              sports ✦ Graduate schools ✦{' '}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Curated edit ---------- */}
      <section className="section">
        <Reveal className="section-heading">
          <div>
            <p className="eyebrow">01 · The edit</p>
            <h2 className="section-title">Curated by category</h2>
          </div>
          <Link to="/products" className="text-link">
            View all {products.length || ''} pieces →
          </Link>
        </Reveal>
        <div className="edit-grid">
          {CATEGORIES.map((category, i) => {
            const image = byId.get(CATEGORY_IMAGES[category.key])
            return (
              <Reveal key={category.key} delay={i * 70} className={`edit-tile edit-tile-${i}`}>
                <Link to={`/products?category=${category.key}`}>
                  <div className="edit-image">{image && <img src={image.image_url} alt="" loading="lazy" />}</div>
                  <div className="edit-caption">
                    <h3>{category.label}</h3>
                    {counts[category.key] && <span className="pennant pennant-small">{counts[category.key]} styles</span>}
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Bulldog-approved ---------- */}
      {approved && (
        <section className="section">
          <Reveal className="approved">
            <div className="approved-image stitched">
              <img src={approved.image_url} alt={approved.name} loading="lazy" />
              <span className="approved-stamp" aria-hidden="true">
                <span>Bulldog</span>
                <strong>approved</strong>
                <span>✦ ✦ ✦</span>
              </span>
            </div>
            <div className="approved-copy">
              <p className="eyebrow">02 · Bulldog-approved</p>
              <h2>{approved.name}</h2>
              <p>{approved.description}</p>
              <p className="scrap approved-note">the one our mascot would wear to every game</p>
              <div className="approved-buy">
                <span className="approved-price">{formatPrice(approved.price)}</span>
                <Link to={`/products/${approved.product_id}`} className="button">
                  Shop it
                </Link>
              </div>
              <div className="approved-dog">
                <Bulldog pose="pennant" size={130} />
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------- Our picks ---------- */}
      {favorites.length > 0 && (
        <section className="section">
          <Reveal className="section-heading">
            <div>
              <p className="eyebrow">03 · Our picks</p>
              <h2 className="section-title">Four to start with</h2>
            </div>
          </Reveal>
          <div className="product-grid">
            {favorites.map((product, i) => (
              <Reveal key={product.product_id} delay={i * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Campus scrapbook ---------- */}
      <section className="collage-section">
        <Skyline className="collage-skyline" />
        <div className="collage-inner">
          <Reveal className="collage-copy">
            <p className="eyebrow">04 · Campus scrapbook</p>
            <h2>From the dining hall to the Bowl.</h2>
            <p>
              Pieces for every corner of the day. Pick a college, a sport or a school, and wear it
              your way.
            </p>
            <button
              type="button"
              className="button button-light"
              onClick={() => askAssistant('Show me gifts under $40')}
            >
              Ask the bulldog for gift ideas
            </button>
          </Reveal>
          <div className="collage">
            {COLLAGE.map((item, i) => {
              const product = byId.get(item.id)
              if (!product) return null
              return (
                <Reveal key={item.id} delay={i * 90} className={`polaroid polaroid-${i}`}>
                  <Link to={`/products/${item.id}`}>
                    <span className="tape" aria-hidden="true" />
                    <span className="polaroid-photo">
                      <img src={product.image_url} alt={product.name} loading="lazy" />
                    </span>
                    <span className="scrap">{item.caption}</span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Promise ---------- */}
      <section className="section promise">
        <Reveal className="promise-item">
          <span className="promise-icon">✦</span>
          <h3>Honest stock, every size</h3>
          <p>Sizes show live stock, and sold-out sizes say so, never “maybe”.</p>
        </Reveal>
        <Reveal className="promise-item" delay={80}>
          <span className="promise-icon">↺</span>
          <h3>30-day returns</h3>
          <p>Unworn with tags? Send it back within 30 days of shipping.</p>
        </Reveal>
        <Reveal className="promise-item" delay={160}>
          <span className="promise-icon">✉</span>
          <h3>A concierge with a tail</h3>
          <p>Our chat checks prices and stock for you, and finds similar styles in your size.</p>
        </Reveal>
      </section>
    </div>
  )
}
