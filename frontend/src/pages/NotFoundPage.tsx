import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page page-narrow">
      <h1>Page not found</h1>
      <p>That page wandered off campus.</p>
      <Link to="/" className="button">
        Back to home
      </Link>
    </div>
  )
}
