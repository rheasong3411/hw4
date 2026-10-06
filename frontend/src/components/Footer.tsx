import { Link } from 'react-router-dom'
import Bulldog from './Bulldog'
import Skyline from './Skyline'

export default function Footer() {
  return (
    <footer className="site-footer">
      <Skyline className="footer-skyline" />
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-wordmark">Campus Customs</span>
          <p>A little Yale. Everywhere. Bulldog spirit for students, families and alumni.</p>
          <p>57 Broadway, New Haven, CT 06511</p>
          <div className="footer-dog">
            <Bulldog pose="peek" size={120} />
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?category=hoodies">Hoodies</Link>
          <Link to="/products?category=crewnecks">Crewnecks</Link>
          <Link to="/products?category=tees">Tees</Link>
          <Link to="/products?category=quarter-zips">Quarter-zips</Link>
          <Link to="/products?category=jackets">Jackets</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/about">About us</Link>
          <span>Returns within 30 days on unworn items with tags</span>
          <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a>
          <a href="tel:+14753014205">(475) 301-4205</a>
        </div>
        <div>
          <h4>Your account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/create-account">Join the pack</Link>
        </div>
      </div>
      <p className="footer-note">
        Campus Customs is a student project inspired by Yale spirit. It is not an official Yale
        University site.
      </p>
    </footer>
  )
}
