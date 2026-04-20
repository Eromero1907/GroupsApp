"use client"

import { useState, useEffect } from "react"
import { useAuth, AuthProvider } from "@/contexts/auth-context"
import { AuthPage } from "@/components/auth-page"
import { Dashboard } from "@/components/dashboard"

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sidebar-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sidebar-text border-t-transparent" />
          <span className="text-sidebar-text">Loading...</span>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
