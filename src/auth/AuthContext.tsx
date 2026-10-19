import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../api/authApi'
import {
  AUTH_UNAUTHORIZED_EVENT,
  ApiError,
  getErrorMessage,
} from '../api/apiClient'
import type { AuthenticatedUser, LoginRequest } from '../types/api'

interface AuthContextValue {
  user: AuthenticatedUser | null
  isLoading: boolean
  restoreError: string | null
  login: (request: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const restore = useCallback(async () => {
    setIsLoading(true)
    setRestoreError(null)

    try {
      setUser(await getCurrentUser())
    } catch (error) {
      setUser(null)

      if (!(error instanceof ApiError && error.status === 401)) {
        setRestoreError(getErrorMessage(error))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void restore()
  }, [restore])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setRestoreError(null)
      setIsLoading(false)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const authenticatedUser = await loginRequest(request)
    setUser(authenticatedUser)
    setRestoreError(null)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    setRestoreError(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, restoreError, login, logout, restore }),
    [user, isLoading, restoreError, login, logout, restore],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

