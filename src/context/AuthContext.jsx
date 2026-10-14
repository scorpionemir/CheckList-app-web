import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  loginRequest,
  getCurrentUser,
  clearAuth,
} from '../services/api'

const AuthContext = createContext(null)

const ALLOWED_WEB_ROLES = ['manager', 'admin']

function isAllowedWebUser(user) {
  return (
    user &&
    ALLOWED_WEB_ROLES.includes(
      String(user.role || '').toLowerCase()
    )
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const token = localStorage.getItem('checklist_web_token')

      if (!token) {
        if (active) setLoading(false)
        return
      }

      try {
        const result = await getCurrentUser()
        const currentUser = result?.user

        if (!isAllowedWebUser(currentUser)) {
          clearAuth()

          if (active) setUser(null)
          return
        }

        if (active) {
          setUser(currentUser)
        }
      } catch {
        clearAuth()

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    restoreSession()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials)

    if (!result?.token) {
      throw new Error('توکن ورود از سرور دریافت نشد.')
    }

    // جلوگیری از باقی ماندن نشست قبلی
    clearAuth()
    localStorage.setItem('checklist_web_token', result.token)

    try {
      const current = await getCurrentUser()
      const currentUser = current?.user || result.user

      if (!isAllowedWebUser(currentUser)) {
        clearAuth()
        setUser(null)
        throw new Error('این حساب اجازهٔ ورود به پنل وب را ندارد.')
      }

      localStorage.setItem(
        'checklist_web_user',
        JSON.stringify(currentUser)
      )

      setUser(currentUser)
      return currentUser
    } catch (error) {
      clearAuth()
      setUser(null)
      throw error
    }
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth باید داخل AuthProvider استفاده شود.')
  }

  return context
}