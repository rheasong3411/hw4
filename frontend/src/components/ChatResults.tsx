import { CHAT_RESULTS_ID, useChatResults } from '../chat/ChatResultsContext'
import ProductCard from './ProductCard'

// The "matching items" section: product cards the chat agent found, shown on
// every page above the footer. Each card links to its product page.
export default function ChatResults() {
  const { results, clearResults } = useChatResults()
  if (!results) return null

  const count = results.products.length

  return (
    <section
      id={CHAT_RESULTS_ID}
      key={results.version}
      className="chat-results"
      aria-live="polite"
      aria-label="Items from your chat"
    >
      <div className="chat-results-inner">
        <div className="chat-results-heading">
          <div>
            <p className="eyebrow">From your chat</p>
            <h2>{results.title}</h2>
            <p className="result-count">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button type="button" className="chip" onClick={clearResults}>
            Clear
          </button>
        </div>
        <div className="product-grid">
          {results.products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
