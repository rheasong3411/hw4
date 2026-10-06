import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router keeps the scroll position between pages, so a product card
// clicked at the bottom of the page would open the product page scrolled down.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
