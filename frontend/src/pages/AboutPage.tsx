import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, categoryOf, fetchProducts, type Product } from '../api'
import Bulldog from '../components/Bulldog'
import Reveal from '../components/Reveal'
import Skyline from '../components/Skyline'

const PENNANTS = ['Y', 'A', 'L', 'E', '✦', 'N', 'H', 'V', '✦', 'C', 'C']

const AUDIENCE = [
  { id: 'grace-hopper-logo-t-shirt', who: 'Students', note: 'stocking up for the semester' },
  { id: 'jonathan-edwards-college-crewneck', who: 'Families', note: 'visiting for the weekend' },
  { id: 'school-of-management-crest-t-shirt', who: 'Alumni', note: 'bringing a piece of New Haven home' },
]

export default function AboutPage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const byId = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => (c[categoryOf(p)] = (c[categoryOf(p)] ?? 0) + 1))
    return c
  }, [products])

  return (
    <div className="about">
      <div className="garland" aria-hidden="true">
        {PENNANTS.map((letter, i) => (
          <span key={i} className={`garland-flag garland-${i % 3}`}>
            {letter}
          </span>
        ))}
      </div>

      <header className="about-hero">
        <p className="eyebrow">About us</p>
        <h1>
          Made for everyone who calls <em>New Haven</em> home.
        </h1>
        <p className="scrap about-annotation">(yes, even if it was just for four years)</p>
        <div className="about-hero-dog">
          <Bulldog pose="wave" size={190} label="Our bulldog mascot waving hello" />
          <span className="scrap about-dog-note">our mascot · no official title, just very good</span>
        </div>
      </header>

      <section className="chapter">
        <Reveal className="chapter-number">01</Reveal>
        <Reveal className="chapter-body" delay={80}>
          <h2>The idea</h2>
          <p className="chapter-lead">
            Campus Customs is a concept store for Bulldog spirit: one place that gathers the
            sweatshirts, tees and layers people actually live in, in the colours that say Yale.
          </p>
          <p>
            We care about the everyday things: a crewneck heavy enough for a January walk across
            the green, a tee soft enough for the night before a deadline, and a hoodie that still
            looks right at the reunion. Deep Yale blue, crisp white and heather gray do most of the
            talking.
          </p>
        </Reveal>
      </section>

      <section className="chapter chapter-alt">
        <Reveal className="chapter-number">02</Reveal>
        <Reveal className="chapter-body" delay={80}>
          <h2>What&apos;s on the shelves</h2>
          <p className="chapter-lead">
            {products.length ? `${products.length} styles` : 'Our styles'} across the university,
            its varsity teams, the residential colleges and the graduate schools.
          </p>
          <ul className="shelf-list">
            {CATEGORIES.map((category) => (
              <li key={category.key}>
                <Link to={`/products?category=${category.key}`}>
                  <span>{category.label}</span>
                  <span className="shelf-dots" aria-hidden="true" />
                  <span className="shelf-count">{counts[category.key] ?? '—'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="chapter">
        <Reveal className="chapter-number">03</Reveal>
        <div className="chapter-body">
          <Reveal>
            <h2>Who we dress</h2>
          </Reveal>
          <div className="audience">
            {AUDIENCE.map((person, i) => {
              const product = byId.get(person.id)
              return (
                <Reveal key={person.who} delay={i * 90} className={`polaroid audience-${i}`}>
                  <Link to={`/products/${person.id}`}>
                    <span className="tape" aria-hidden="true" />
                    <span className="polaroid-photo">
                      {product && <img src={product.image_url} alt={product.name} loading="lazy" />}
                    </span>
                    <strong>{person.who}</strong>
                    <span className="scrap">{person.note}</span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="chapter chapter-alt">
        <Reveal className="chapter-number">04</Reveal>
        <Reveal className="chapter-body" delay={80}>
          <h2>Our promise</h2>
          <ol className="promise-list">
            <li>
              <strong>Honest prices and real stock.</strong> Every size shows what we actually
              have, and sold-out sizes say so.
            </li>
            <li>
              <strong>Easy returns.</strong> Unworn, unused items with original tags can come back
              within 30 days of shipping.
            </li>
            <li>
              <strong>Friendly help.</strong> In the shop, by email, or from our bulldog concierge
              in the chat.
            </li>
          </ol>
        </Reveal>
      </section>

      <section className="visit">
        <Skyline className="visit-skyline" />
        <Reveal className="visit-card stitched">
          <p className="eyebrow">05 · Come say hi</p>
          <h2>57 Broadway, New Haven, CT 06511</h2>
          <p>
            <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a> ·{' '}
            <a href="tel:+14753014205">(475) 301-4205</a>
          </p>
          <Link to="/products" className="button">
            Browse the shop
          </Link>
          <p className="about-disclaimer">
            Campus Customs is a student project inspired by Yale spirit. It is not affiliated with or
            endorsed by Yale University.
          </p>
        </Reveal>
      </section>
    </div>
  )
}
