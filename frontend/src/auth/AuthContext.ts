import { createContext, useContext } from 'react'
import type { SignupDetails, User } from '../api'

export type AuthState = {
  user: User | null
  // True until we have asked the backend whether a session cookie is valid.
  checking: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (details: SignupDetails) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
