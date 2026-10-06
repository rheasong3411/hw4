import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchChatHistory, sendChatMessage, type ChatMessage } from '../api'
import { useAuth } from '../auth/AuthContext'
import { scrollToChatResults, useChatResults } from '../chat/ChatResultsContext'
import { useChatPanel } from '../chat/ChatPanelContext'
import { pageContextFrom } from '../chat/pageContext'
import { suggestionsFor } from '../chat/suggestions'
import Bulldog from './Bulldog'

// Error notices are shown in the panel but never sent back to the agent.
type WidgetMessage = ChatMessage & { error?: boolean }

const GREETING: WidgetMessage = {
  role: 'assistant',
  content:
    "Woof, hi! I'm the Campus Customs bulldog concierge. Ask me about hoodies, sizes, prices or what's in stock.",
}

// App remounts this widget (via `key`) whenever the signed-in user changes,
// so each shopper starts from their own saved history.
export default function ChatWidget() {
  const { user } = useAuth()
  const { showResults } = useChatResults()
  const location = useLocation()
  const { open, setOpen, pendingQuestion, clearPendingQuestion } = useChatPanel()
  // The greeting is shown in the panel but never sent to the agent.
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    fetchChatHistory()
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [user])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open, sending])

  const page = pageContextFrom(location.pathname, location.search)
  const suggestions = suggestionsFor(page, Boolean(user))

  async function send(question: string) {
    const text = question.trim()
    if (!text || sending) return

    // Guests send their turns; signed-in history comes from the database.
    const history = user ? [] : messages.filter((message) => !message.error)
    setDraft('')
    setMessages((current) => [...current, { role: 'user', content: text }])
    setSending(true)
    try {
      const { reply, results_title, products } = await sendChatMessage(text, history, page)
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: reply, results_title, products },
      ])
      // Matches go to the page as product cards; replies without any leave
      // the current results in place.
      if (products.length > 0) {
        showResults(results_title ?? 'Matching items', products)
        scrollToChatResults()
      }
    } catch (err) {
      const content =
        err instanceof Error ? err.message : 'Sorry, I could not reach the shop just now.'
      setMessages((current) => [...current, { role: 'assistant', content, error: true }])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    send(draft)
  }

  // A page asked a question for the shopper (e.g. "Ask about size L"). If a
  // reply is still loading, this runs again once it finishes.
  useEffect(() => {
    if (!pendingQuestion || sending) return
    clearPendingQuestion()
    send(pendingQuestion)
    // send is recreated each render; only a new question or the end of a
    // send should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion, sending])

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Shopping assistant chat">
          <header className="chat-header">
            <Bulldog pose="head" mood="wink" size={48} />
            <div className="chat-header-text">
              <strong>Bulldog Concierge</strong>
              <span>Live prices, sizes and stock</span>
            </div>
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>
          <div className="chat-messages" ref={listRef}>
            {[GREETING, ...messages].map((message, index) => (
              <div key={index} className={`chat-turn chat-turn-${message.role}`}>
                <div className={`chat-bubble chat-${message.role}`}>{message.content}</div>
                {message.products && message.products.length > 0 && (
                  <button
                    type="button"
                    className="chat-results-link"
                    onClick={() => {
                      showResults(message.results_title ?? 'Items from your chat', message.products!)
                      scrollToChatResults()
                    }}
                  >
                    View {message.products.length}{' '}
                    {message.products.length === 1 ? 'item' : 'items'} on the page ↓
                  </button>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-assistant chat-typing" aria-label="Assistant is typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>
          {!sending && (
            <div className="chat-suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about our merch…"
              aria-label="Chat message"
              maxLength={1000}
            />
            <button type="submit" className="button" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Bulldog pose="head" size={34} />
        <span>{open ? 'Close chat' : 'Ask the bulldog'}</span>
      </button>
    </div>
  )
}
