import { createContext, useContext } from 'react'
import type { Product } from '../api'

export type ChatResults = {
  title: string
  products: Product[]
  // Changes on every update, so the section can replay its entrance animation.
  version: number
}

export type ChatResultsState = {
  results: ChatResults | null
  showResults: (title: string, products: Product[]) => void
  clearResults: () => void
}

export const ChatResultsContext = createContext<ChatResultsState | null>(null)

export function useChatResults(): ChatResultsState {
  const state = useContext(ChatResultsContext)
  if (!state) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return state
}

export const CHAT_RESULTS_ID = 'chat-results'

export function scrollToChatResults() {
  // Wait a frame so a newly rendered section exists before scrolling to it.
  requestAnimationFrame(() =>
    document.getElementById(CHAT_RESULTS_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}
