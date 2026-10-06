import type { PageContext } from './pageContext'

// Quick questions shown above the chat input, chosen for the page the shopper
// is on, so they can start without knowing what to ask.
// On a product page the page context tells the agent what "this" means.
export function suggestionsFor(page: PageContext, signedIn: boolean): string[] {
  if (page.page_type === 'product') {
    return [
      'Which sizes of this are in stock?',
      'What colours does this come in?',
      'Show me similar styles in stock',
    ]
  }
  if (page.page_type === 'products' && page.category) {
    return [
      `What ${page.category} do you have under $60?`,
      `Which ${page.category} are in stock in M?`,
      'What is your return policy?',
    ]
  }
  return [
    'What hoodies do you have?',
    'Show me gifts under $40',
    signedIn ? 'What was I looking at last time?' : 'What is your return policy?',
  ]
}
