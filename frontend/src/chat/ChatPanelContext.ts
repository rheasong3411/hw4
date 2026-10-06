import { createContext, useContext } from 'react'

export type ChatPanelState = {
  open: boolean
  setOpen: (open: boolean) => void
  // A question another part of the page wants sent ("Ask about size L").
  pendingQuestion: string | null
  askAssistant: (question: string) => void
  clearPendingQuestion: () => void
}

export const ChatPanelContext = createContext<ChatPanelState | null>(null)

export function useChatPanel(): ChatPanelState {
  const state = useContext(ChatPanelContext)
  if (!state) throw new Error('useChatPanel must be used inside <ChatPanelProvider>')
  return state
}
