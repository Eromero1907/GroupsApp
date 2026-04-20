"use client"

import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react"
import { useToast } from "@/contexts/toast-context"

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5" />
      case "error":
        return <AlertCircle className="h-5 w-5" />
      case "warning":
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getColorClasses = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-900"
      case "error":
        return "bg-red-50 border-red-200 text-red-900"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900"
      default:
        return "bg-blue-50 border-blue-200 text-blue-900"
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`border rounded-lg px-4 py-3 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-top fade-in ${getColorClasses(toast.type)}`}
        >
          <span className={`flex-shrink-0 mt-0.5 ${getIconColor(toast.type)}`}>
            {getIcon(toast.type)}
          </span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
