import { Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import BagDrawer from './components/BagDrawer'
import BagToast from './components/BagToast'
import ChatResults from './components/ChatResults'
import ChatWidget from './components/ChatWidget'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import AboutPage from './pages/AboutPage'
import CreateAccountPage from './pages/CreateAccountPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductsPage from './pages/ProductsPage'

export default function App() {
  const { user } = useAuth()

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main className="main" id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <ChatResults />
      <Footer />
      <ChatWidget key={user?.id ?? 'guest'} />
      <BagDrawer />
      <BagToast />
    </div>
  )
}
