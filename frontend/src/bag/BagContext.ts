import { createContext, useContext } from 'react'
import type { Product } from '../api'

export type BagLine = {
  product_id: string
  size: string
  quantity: number
  // Copied when added so the bag renders without refetching; `max` is the
  // stock in that size at the time, and quantity can never exceed it.
  name: string
  price: number
  image_url: string
  max: number
}

export type BagState = {
  lines: BagLine[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (open: boolean) => void
  // Increments on every add, so the bulldog can react.
  addedTick: number
  lastAdded: BagLine | null
  add: (product: Product, size: string, quantity?: number) => { ok: boolean; message: string }
  setQuantity: (productId: string, size: string, quantity: number) => void
  remove: (productId: string, size: string) => void
  clear: () => void
}

export const BagContext = createContext<BagState | null>(null)

export function useBag(): BagState {
  const bag = useContext(BagContext)
  if (!bag) throw new Error('useBag must be used inside <BagProvider>')
  return bag
}
