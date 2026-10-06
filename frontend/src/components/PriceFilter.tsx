import { useEffect, useRef, useState, type FormEvent } from 'react'

type Props = {
  min: number
  max: number
  // Cheapest and dearest prices in the catalogue, shown as placeholders.
  low: number
  high: number
  onApply: (min: number, max: number) => void
}

const PRESETS = [
  { label: 'Under $40', min: 0, max: 40 },
  { label: '$40–$70', min: 40, max: 70 },
  { label: '$70 & up', min: 70, max: 0 },
]

function rangeLabel(min: number, max: number): string {
  if (min && max) return `$${min}–$${max}`
  if (min) return `$${min} & up`
  if (max) return `Up to $${max}`
  return 'Any price'
}

// A "Price" dropdown where shoppers type their own range and press Apply.
// 0 means "no limit" for either end.
export default function PriceFilter({ min, max, low, high, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="refine-field price-filter" ref={wrapRef}>
      <span>Price</span>
      <button
        type="button"
        className={min || max ? 'price-toggle is-set' : 'price-toggle'}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {rangeLabel(min, max)}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <PricePanel
          min={min}
          max={max}
          low={low}
          high={high}
          onApply={(a, b) => {
            onApply(a, b)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

// Mounted fresh each time the dropdown opens, so the fields start from the
// current range.
function PricePanel({ min, max, low, high, onApply }: Props) {
  const [from, setFrom] = useState(min ? String(min) : '')
  const [to, setTo] = useState(max ? String(max) : '')
  const [error, setError] = useState('')

  function apply(event: FormEvent) {
    event.preventDefault()
    const a = from.trim() === '' ? 0 : Number(from)
    const b = to.trim() === '' ? 0 : Number(to)
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      setError('Enter prices as whole dollar amounts.')
      return
    }
    if (a && b && a > b) {
      setError('The minimum must be less than the maximum.')
      return
    }
    onApply(Math.round(a), Math.round(b))
  }

  return (
    <form className="price-panel" role="dialog" aria-label="Choose a price range" onSubmit={apply}>
      <div className="price-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="chip"
            onClick={() => {
              setFrom(preset.min ? String(preset.min) : '')
              setTo(preset.max ? String(preset.max) : '')
              setError('')
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="price-inputs">
        <label>
          Min
          <span className="price-input">
            $
            <input
              inputMode="numeric"
              value={from}
              onChange={(event) => setFrom(event.target.value.replace(/[^\d]/g, ''))}
              placeholder={String(Math.floor(low))}
              aria-label="Minimum price in dollars"
              autoFocus
            />
          </span>
        </label>
        <span className="price-dash" aria-hidden="true">–</span>
        <label>
          Max
          <span className="price-input">
            $
            <input
              inputMode="numeric"
              value={to}
              onChange={(event) => setTo(event.target.value.replace(/[^\d]/g, ''))}
              placeholder={String(Math.ceil(high))}
              aria-label="Maximum price in dollars"
            />
          </span>
        </label>
      </div>
      {error && (
        <p className="price-error" role="alert">
          {error}
        </p>
      )}
      <div className="price-actions">
        <button
          type="button"
          className="text-link"
          onClick={() => {
            onApply(0, 0)
          }}
        >
          Clear
        </button>
        <button type="submit" className="button button-small">
          Apply
        </button>
      </div>
    </form>
  )
}
