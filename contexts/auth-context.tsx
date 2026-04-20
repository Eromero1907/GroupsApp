"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { authApi, type User, type AuthResponse, ApiError } from "@/lib/api"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Each browser tab gets a unique ID so it can ignore its own storage events
// (storage events only fire in OTHER tabs, not the one that wrote)
const TAB_ID = Math.random().toString(36).slice(2)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  // Listen for storage changes from OTHER tabs — but only sync logout, not login
  // This way closing a session in tab A doesn't affect tab B's session
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // Only react to explicit logout (token removed), not to a different user logging in
      if (e.key === "token" && e.newValue === null && e.oldValue !== null) {
        // Another tab logged out — do NOT propagate. Each tab manages its own session.
        // If you want cross-tab logout, uncomment the lines below:
        // setToken(null)
        // setUser(null)
      }
      // Ignore all other storage changes from other tabs
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleAuthSuccess = useCallback((response: AuthResponse) => {
    setToken(response.access_token)
    setUser(response.user)
    localStorage.setItem("token", response.access_token)
    localStorage.setItem("user", JSON.stringify(response.user))
    setError(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login(email, password)
      handleAuthSuccess(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "An unexpected error occurred")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [handleAuthSuccess])

  const register = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Register creates the account but does NOT auto-login
      // User must go to login page to authenticate
      await authApi.register(username, email, password)
      // Success - the component will handle switching to login mode
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "An unexpected error occurred")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!token && !!user,
      login, register, logout, error, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}