import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) {
    return <Navigate to="/products" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout pose="sit" panelTitle="Varsity since day one" caption="saved your seat (and your chat history)">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Log in</p>
        <h1>Welcome back to the pack.</h1>
        <p className="auth-sub">Sign in to pick up your chat where you left off.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="status status-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <p className="auth-switch">
          New here? <Link to="/create-account">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
