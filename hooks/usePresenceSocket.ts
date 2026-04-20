"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import type { Presence, PresenceStatus } from "@/lib/api"

const PRESENCE_WS_URL =
  (process.env.NEXT_PUBLIC_PRESENCE_WS_URL || "http://localhost:3006") + "/presence"
const HEARTBEAT_INTERVAL = 30_000 // 30 s

interface UsePresenceSocketOptions {
  userId: string | null
  onPresenceUpdate?: (presence: Presence) => void
  onMessageNew?: (groupId: string, message: any) => void
  onMessageRead?: (groupId: string, payload: { messageId: string; userId: string }) => void
  onDmNew?: (message: any) => void
  onDmRead?: (payload: { messageId: string; userId: string }) => void
  onTyping?: (payload: { userId: string; groupId: string; typing: boolean }) => void
}

export function usePresenceSocket({
  userId,
  onPresenceUpdate,
  onMessageNew,
  onMessageRead,
  onDmNew,
  onDmRead,
  onTyping,
}: UsePresenceSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Limpieza ──────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  // ── Conexión ──────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return
    disconnect()

    const socket = io(PRESENCE_WS_URL, {
      query: { userId },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("[WS] Conectado al presence gateway")
    })

    socket.on("disconnect", () => {
      console.log("[WS] Desconectado del presence gateway")
    })

    // Presencia en tiempo real (reemplaza polling de 5 s)
    socket.on("presence.update", (presence: Presence) => {
      onPresenceUpdate?.(presence)
    })

    // Nuevo mensaje en sala de grupo
    socket.on("message.new", (payload: any) => {
      onMessageNew?.(payload.groupId, payload)
    })

    // Lectura de mensaje grupal
    socket.on("message.read", (payload: { messageId: string; userId: string; groupId: string }) => {
      onMessageRead?.(payload.groupId, payload)
    })

    // Nuevo DM entrante
    socket.on("dm.new", (message: any) => {
      onDmNew?.(message)
    })

    // DM marcado como leído
    socket.on("dm.read", (payload: { messageId: string; userId: string }) => {
      onDmRead?.(payload)
    })

    // Indicador de escritura
    socket.on("typing", (payload: { userId: string; groupId: string; typing: boolean }) => {
      onTyping?.(payload)
    })

    // Heartbeat para mantener TTL en Redis
    heartbeatRef.current = setInterval(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/presence/${userId}/heartbeat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      }).catch(() => {})
    }, HEARTBEAT_INTERVAL)

    // Marcar offline al cerrar la ventana
    const handleBeforeUnload = () => {
      socket.emit("presence.set", { status: "offline" })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      disconnect()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── API pública ───────────────────────────────────────────────

  const joinRoom = useCallback((groupId: string) => {
    socketRef.current?.emit("join.room", { groupId })
  }, [])

  const leaveRoom = useCallback((groupId: string) => {
    socketRef.current?.emit("leave.room", { groupId })
  }, [])

  const setStatus = useCallback((status: PresenceStatus) => {
    socketRef.current?.emit("presence.set", { status })
  }, [])

  const startTyping = useCallback((groupId: string) => {
    socketRef.current?.emit("typing.start", { groupId })
  }, [])

  const stopTyping = useCallback((groupId: string) => {
    socketRef.current?.emit("typing.stop", { groupId })
  }, [])

  return { joinRoom, leaveRoom, setStatus, startTyping, stopTyping }
}
