import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../api'
import { ChatResultsContext, type ChatResults } from './ChatResultsContext'

// Holds the product matches from the latest chat reply, shared between the
// chat widget (which sets them) and the results section (which renders them).
export default function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResults | null>(null)

  const showResults = useCallback((title: string, products: Product[]) => {
    setResults((current) => ({ title, products, version: (current?.version ?? 0) + 1 }))
  }, [])

  const clearResults = useCallback(() => setResults(null), [])

  const value = useMemo(
    () => ({ results, showResults, clearResults }),
    [results, showResults, clearResults],
  )

  return <ChatResultsContext.Provider value={value}>{children}</ChatResultsContext.Provider>
}
