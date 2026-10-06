import type { ReactNode } from 'react'
import Bulldog, { type BulldogPose } from './Bulldog'
import Skyline from './Skyline'

// Split screen for Log in and Create account: the form on one side, a
// full-height Yale-blue panel with the bulldog on the other.
export default function AuthLayout({
  children,
  pose,
  caption,
  panelTitle,
}: {
  children: ReactNode
  pose: BulldogPose
  caption: string
  panelTitle: string
}) {
  return (
    <div className="auth-split">
      <div className="auth-form-side">{children}</div>
      <aside className="auth-panel" aria-hidden="true">
        <div className="auth-panel-frame">
          <p className="auth-panel-title">{panelTitle}</p>
          <div className={`auth-panel-dog auth-panel-dog-${pose}`}>
            <Bulldog pose={pose} size={300} />
          </div>
          <p className="scrap auth-panel-caption">{caption}</p>
        </div>
        <Skyline className="auth-skyline" />
      </aside>
    </div>
  )
}
