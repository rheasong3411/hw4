import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useBag } from '../bag/BagContext'
import { useChatResults } from '../chat/ChatResultsContext'
import Bulldog from './Bulldog'

// The nav lists exactly the site's five standalone pages: these three, plus
// Log In and Create Account on the right. Categories live on the Products page.
const MAIN_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function Navbar() {
  const { user, checking, logout } = useAuth()
  const { count, setOpen: setBagOpen, addedTick } = useBag()
  const { clearResults } = useChatResults()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bump, setBump] = useState(false)

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    const id = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(id)
  }, [location.pathname, location.search])

  // Make the bag badge jump when something is added.
  useEffect(() => {
    if (!addedTick) return
    const on = setTimeout(() => setBump(true), 0)
    const off = setTimeout(() => setBump(false), 600)
    return () => {
      clearTimeout(on)
      clearTimeout(off)
    }
  }, [addedTick])

  async function handleLogout() {
    await logout()
    clearResults()
    navigate('/')
  }

  // Products stays active on category views and single product pages too.
  function isActive(to: string) {
    return to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  }

  return (
    <header className="site-header">
      <div className="announcement">
        <span>57 Broadway, New Haven</span>
        <span className="announcement-dot" aria-hidden="true">✦</span>
        <span>Returns within 30 days</span>
        <span className="announcement-dot" aria-hidden="true">✦</span>
        <span>Ask our bulldog concierge about sizes &amp; stock</span>
      </div>
      <nav className="navbar" aria-label="Main">
        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span />
          <span />
          <span />
        </button>

        <ul id="main-menu" className={menuOpen ? 'nav-links is-open' : 'nav-links'}>
          {MAIN_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={() => (isActive(link.to) ? 'nav-link active' : 'nav-link')}>
                {link.label}
              </NavLink>
            </li>
          ))}
          <li className="nav-links-account">
            {user ? (
              <button type="button" className="nav-link" onClick={handleLogout}>
                Log out ({user.first_name})
              </button>
            ) : (
              <>
                <NavLink to="/login" className="nav-link">Log In</NavLink>
                <NavLink to="/create-account" className="nav-link">Create Account</NavLink>
              </>
            )}
          </li>
        </ul>

        <Link to="/" className="brand" aria-label="Campus Customs home">
          <Bulldog pose="head" size={40} />
          <span className="brand-text">
            Campus Customs
            <small>Bulldog Blue Shop · New Haven</small>
          </span>
        </Link>

        <div className="nav-actions">
          <div className="nav-account">
            {checking ? null : user ? (
              <>
                <span className="nav-greeting">Hi, {user.first_name}</span>
                <button type="button" className="nav-link nav-text-button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive: on }) => (on ? 'nav-link active' : 'nav-link')}>
                  Log In
                </NavLink>
                <NavLink to="/create-account" className="button button-small">
                  Create Account
                </NavLink>
              </>
            )}
          </div>
          <button
            type="button"
            className={bump ? 'bag-button bump' : 'bag-button'}
            onClick={() => setBagOpen(true)}
            aria-label={`Shopping bag, ${count} ${count === 1 ? 'item' : 'items'}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span className="bag-label">Bag</span>
            <span className="bag-count">{count}</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
