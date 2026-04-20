"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Hash, MessageSquare, Users } from "lucide-react"

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, register, error, clearError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
    } catch {
      // Error is handled in the auth context
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    clearError()
    setEmail("")
    setPassword("")
    setUsername("")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-bg flex-col justify-center px-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white">
              <Hash className="h-7 w-7 text-sidebar-bg" />
            </div>
            <h1 className="text-3xl font-bold text-white">GroupsApp</h1>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Where work happens, together.
          </h2>
          
          <p className="text-sidebar-text text-lg mb-8">
            Connect with your team, share ideas, and move projects forward with real-time messaging.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sidebar-text">
              <MessageSquare className="h-5 w-5" />
              <span>Real-time group messaging</span>
            </div>
            <div className="flex items-center gap-3 text-sidebar-text">
              <Users className="h-5 w-5" />
              <span>Team collaboration made easy</span>
            </div>
            <div className="flex items-center gap-3 text-sidebar-text">
              <Hash className="h-5 w-5" />
              <span>Organized channels for every project</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-bg">
              <Hash className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">GroupsApp</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? "Sign in to your workspace" : "Create your account"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your teams"
                : "Join your team and start collaborating"}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
                placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
              />
              {!isLogin && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slack-green py-2.5 px-4 text-white font-medium hover:bg-slack-green-hover focus:outline-none focus:ring-2 focus:ring-slack-green/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-sidebar-active hover:underline"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
