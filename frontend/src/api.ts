// Calls to the FastAPI backend. Vite proxies /api and /media to port 8000.

import type { PageContext } from './chat/pageContext'

export type SizeStock = {
  size: string
  quantity: number
}

export type Product = {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  image_file_path: string
  image_url: string
  price: number
  inventory: SizeStock[]
  total_stock: number
}

// POST /api/chat response. When `products` is non-empty the site shows them
// as product cards on the page under `results_title`.
export type ChatReply = {
  reply: string
  results_title: string | null
  products: Product[]
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  results_title?: string | null
  products?: Product[]
}

export type User = {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
  created_at: string
}

export type SignupDetails = {
  first_name: string
  last_name: string
  email: string
  password: string
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  password: 'Password',
}

// FastAPI sends either {"detail": "message"} or, for validation errors,
// {"detail": [{"loc": [..., "field"], "msg": "Value error, ..."}]}.
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0]
      const field = FIELD_LABELS[first.loc?.at(-1)] ?? 'A field'
      return `${field} ${String(first.msg).replace(/^Value error, /, '')}.`
    }
  } catch {
    // fall through to the generic message
  }
  return `Something went wrong (${response.status}). Please try again.`
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return response.json() as Promise<T>
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

// The session lives in an HttpOnly cookie set by the backend, so the browser
// sends it automatically and page scripts never see it.
export function signup(details: SignupDetails): Promise<User> {
  return postJson<User>('/api/auth/signup', details)
}

export function login(email: string, password: string): Promise<User> {
  return postJson<User>('/api/auth/login', { email, password })
}

export function logout(): Promise<void> {
  return postJson<void>('/api/auth/logout')
}

export async function fetchCurrentUser(): Promise<User | null> {
  return getJson<User | null>('/api/auth/me')
}

export function fetchProducts(): Promise<Product[]> {
  return getJson<Product[]>('/api/products')
}

export function fetchProduct(productId: string): Promise<Product> {
  return getJson<Product>(`/api/products/${encodeURIComponent(productId)}`)
}

// Sends the new message, the page the shopper is on, and (for guests) the
// earlier turns so the agent can follow up. A signed-in shopper's history is
// read from the database by the backend, so `history` is empty for them.
// Product cards go back as ids only; the backend looks them up again.
export function sendChatMessage(
  message: string,
  history: ChatMessage[],
  page: PageContext,
): Promise<ChatReply> {
  return postJson<ChatReply>('/api/chat', {
    message,
    page,
    history: history.map((turn) => ({
      role: turn.role,
      content: turn.content,
      product_ids: (turn.products ?? []).map((p) => p.product_id),
    })),
  })
}

// Saved conversation for the signed-in shopper.
export function fetchChatHistory(): Promise<ChatMessage[]> {
  return getJson<ChatMessage[]>('/api/chat/history')
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

// garment_type uses many inconsistent labels, so group them into a few
// shopper-facing categories by keyword.
export const CATEGORIES = [
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'crewnecks', label: 'Crewnecks' },
  { key: 'tees', label: 'Tees' },
  { key: 'quarter-zips', label: 'Quarter-Zips' },
  { key: 'jackets', label: 'Jackets' },
] as const

export type CategoryKey = (typeof CATEGORIES)[number]['key']

export function categoryOf(product: Product): CategoryKey {
  const type = product.garment_type.toLowerCase()
  if (type.includes('quarter-zip')) return 'quarter-zips'
  if (type.includes('jacket')) return 'jackets'
  if (type.includes('hood')) return 'hoodies'
  if (type.includes('t-shirt') || type.includes('performance shirt')) return 'tees'
  return 'crewnecks'
}

// Similar in-stock products (in `size`, if given) for the product page.
export function fetchAlternatives(productId: string, size?: string): Promise<Product[]> {
  const query = size ? `?size=${encodeURIComponent(size)}` : ''
  return getJson<Product[]>(`/api/products/${encodeURIComponent(productId)}/alternatives${query}`)
}

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

// Catalogue colour names grouped into families shoppers think in (same
// rules as color_family in backend/tools.py). Checked in order, so
// "navy blue" lands in navy rather than blue.
export const COLOR_FAMILIES = [
  { key: 'navy', label: 'Navy', swatch: '#1f2f57', words: ['navy'] },
  { key: 'blue', label: 'Blue', swatch: '#3b73c4', words: ['blue'] },
  { key: 'gray', label: 'Gray', swatch: '#9aa0a8', words: ['gray', 'grey', 'charcoal'] },
  { key: 'white', label: 'White', swatch: '#ffffff', words: ['white', 'cream', 'ivory'] },
  { key: 'black', label: 'Black', swatch: '#1b1b1b', words: ['black'] },
  { key: 'red', label: 'Red', swatch: '#c8323c', words: ['red', 'coral'] },
  { key: 'yellow', label: 'Yellow & gold', swatch: '#e8b923', words: ['yellow', 'gold'] },
  { key: 'green', label: 'Green', swatch: '#2f7d4f', words: ['green'] },
] as const

export type ColorFamily = (typeof COLOR_FAMILIES)[number]['key'] | 'other'

export function colorFamily(color: string): ColorFamily {
  const text = color.toLowerCase()
  const family = COLOR_FAMILIES.find((f) => f.words.some((word) => text.includes(word)))
  return family?.key ?? 'other'
}

export function colorFamilies(product: Product): ColorFamily[] {
  return [...new Set(product.colors.map(colorFamily))]
}

export function stockInSize(product: Product, size: string): number {
  return product.inventory.find((item) => item.size === size)?.quantity ?? 0
}
