import type { PresenceStatus } from "@/lib/api"

interface PresenceIndicatorProps {
  status: PresenceStatus
  className?: string
  size?: "sm" | "md" | "lg"
}

export function PresenceIndicator({ status, className = "", size = "sm" }: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  }

  const statusColors = {
    online: "bg-status-online",
    away: "bg-status-away",
    dnd: "bg-status-dnd",
    offline: "bg-status-offline",
  }

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${statusColors[status]} ${className}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  )
}
