import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { stockInSize, type Product } from '../api'
import { BagContext, type BagLine } from './BagContext'

const STORAGE_KEY = 'cc_bag'

function loadBag(): BagLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// The shopping bag lives in this browser (localStorage), so it survives a
// refresh. Quantities are capped at the stock in each size.
export default function BagProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BagLine[]>(loadBag)
  const [open, setOpen] = useState(false)
  const [addedTick, setAddedTick] = useState(0)
  const [lastAdded, setLastAdded] = useState<BagLine | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const add = useCallback(
    (product: Product, size: string, quantity = 1) => {
      const max = stockInSize(product, size)
      if (max === 0) return { ok: false, message: `Sorry, ${size} is sold out.` }
      const existing = lines.find((l) => l.product_id === product.product_id && l.size === size)
      const current = existing?.quantity ?? 0
      if (current >= max) {
        return { ok: false, message: `You already have all ${max} in ${size} in your bag.` }
      }
      const next = Math.min(current + quantity, max)
      const line: BagLine = {
        product_id: product.product_id,
        size,
        quantity: next,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        max,
      }
      setLines((all) =>
        existing
          ? all.map((l) => (l === existing ? line : l))
          : [...all, line],
      )
      setLastAdded(line)
      setAddedTick((t) => t + 1)
      return { ok: true, message: `Added ${product.name} (${size}) to your bag.` }
    },
    [lines],
  )

  const setQuantity = useCallback((productId: string, size: string, quantity: number) => {
    setLines((all) =>
      all.flatMap((l) => {
        if (l.product_id !== productId || l.size !== size) return [l]
        const q = Math.min(Math.max(quantity, 0), l.max)
        return q === 0 ? [] : [{ ...l, quantity: q }]
      }),
    )
  }, [])

  const remove = useCallback((productId: string, size: string) => {
    setLines((all) => all.filter((l) => l.product_id !== productId || l.size !== size))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0)
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0)
    return { lines, count, subtotal, open, setOpen, addedTick, lastAdded, add, setQuantity, remove, clear }
  }, [lines, open, addedTick, lastAdded, add, setQuantity, remove, clear])

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}
