import { useEffect, useState } from 'react'
import { useBag } from '../bag/BagContext'
import Bulldog from './Bulldog'

// The bulldog pops up and cheers whenever something is added to the bag.
export default function BagToast() {
  const { addedTick, lastAdded, setOpen } = useBag()
  const [visibleTick, setVisibleTick] = useState(0)

  useEffect(() => {
    if (addedTick === 0) return
    const show = setTimeout(() => setVisibleTick(addedTick), 0)
    const hide = setTimeout(() => setVisibleTick(0), 3800)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [addedTick])

  if (!visibleTick || !lastAdded) return null

  return (
    <div className="bag-toast" role="status" key={visibleTick}>
      <Bulldog pose="head" mood="happy" size={64} />
      <div>
        <strong>Woof! Added to your bag.</strong>
        <span>
          {lastAdded.name} · Size {lastAdded.size}
        </span>
      </div>
      <button type="button" className="button button-small" onClick={() => setOpen(true)}>
        View bag
      </button>
    </div>
  )
}
