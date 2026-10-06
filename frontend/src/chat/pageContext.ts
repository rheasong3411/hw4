import { matchPath } from 'react-router-dom'

// Sent with every chat message so the agent knows what "this" means.
export type PageContext = {
  path: string
  page_type: 'home' | 'products' | 'product' | 'about' | 'login' | 'create-account' | 'other'
  product_id: string | null
  category: string | null
}

const SIMPLE_PAGES: Record<string, PageContext['page_type']> = {
  '/': 'home',
  '/products': 'products',
  '/about': 'about',
  '/login': 'login',
  '/create-account': 'create-account',
}

export function pageContextFrom(pathname: string, search: string): PageContext {
  const product = matchPath('/products/:productId', pathname)
  return {
    path: pathname,
    page_type: product ? 'product' : (SIMPLE_PAGES[pathname] ?? 'other'),
    product_id: product?.params.productId ?? null,
    category: pathname === '/products' ? new URLSearchParams(search).get('category') : null,
  }
}
