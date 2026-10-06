import './bulldog.css'

export type BulldogPose = 'sit' | 'wave' | 'pennant' | 'peek' | 'head'
export type BulldogMood = 'calm' | 'happy' | 'wink'

type Props = {
  pose?: BulldogPose
  mood?: BulldogMood
  // Width of the drawing in pixels; everything inside scales with it.
  size?: number
  className?: string
  // Short description for screen readers; omit for purely decorative uses.
  label?: string
}

// The Campus Customs bulldog: one character drawn in HTML/CSS, used in a few
// poses across the site (hero, account pages, chat avatar, bag reaction).
export default function Bulldog({ pose = 'sit', mood = 'calm', size = 160, className = '', label }: Props) {
  const showBody = pose === 'sit' || pose === 'wave' || pose === 'pennant'

  return (
    <div
      className={`dog dog-pose-${pose} dog-mood-${mood} ${className}`}
      style={{ fontSize: `${size / 10}px` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {showBody && (
        <>
          <div className="dog-arm dog-arm-left">
            <div className="dog-paw" />
          </div>
          {pose === 'pennant' && (
            <div className="dog-pennant">
              <span>YALE</span>
            </div>
          )}
          <div className="dog-arm dog-arm-right">
            <div className="dog-paw" />
          </div>
          <div className="dog-body">
            <span className="dog-letter">Y</span>
          </div>
          <div className="dog-foot dog-foot-left" />
          <div className="dog-foot dog-foot-right" />
        </>
      )}

      <div className="dog-head">
        <div className="dog-ear dog-ear-left" />
        <div className="dog-ear dog-ear-right" />
        <div className="dog-wrinkle" />
        <div className="dog-patch" />
        <div className="dog-eye dog-eye-left" />
        <div className="dog-eye dog-eye-right" />
        <div className="dog-cheek dog-cheek-left" />
        <div className="dog-cheek dog-cheek-right" />
        <div className="dog-muzzle">
          <div className="dog-nose" />
          <div className="dog-mouth">
            <span className="dog-tooth dog-tooth-left" />
            <span className="dog-tooth dog-tooth-right" />
            {mood === 'happy' && <span className="dog-tongue" />}
          </div>
        </div>
      </div>

      {pose === 'peek' && (
        <>
          <div className="dog-peek-paw dog-peek-paw-left" />
          <div className="dog-peek-paw dog-peek-paw-right" />
        </>
      )}
    </div>
  )
}
