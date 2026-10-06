import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChatPanelContext } from './ChatPanelContext'

// Whether the chat panel is open, kept outside the widget so it survives the
// widget remounting on log-in, and so pages can open it with a question.
export default function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)

  const askAssistant = useCallback((question: string) => {
    setPendingQuestion(question)
    setOpen(true)
  }, [])

  const clearPendingQuestion = useCallback(() => setPendingQuestion(null), [])

  const value = useMemo(
    () => ({ open, setOpen, pendingQuestion, askAssistant, clearPendingQuestion }),
    [open, pendingQuestion, askAssistant, clearPendingQuestion],
  )

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>
}
