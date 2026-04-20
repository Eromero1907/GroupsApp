"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Paperclip } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { dmApi, mediaApi, type DirectMessage, type User, type Presence } from "@/lib/api"
import { PresenceIndicator } from "@/components/presence-indicator"

interface DirectMessagePanelProps {
  partnerId: string
  partner?: User
  presenceMap: Map<string, Presence>
  currentUser: User | null
}

export function DirectMessagePanel({ partnerId, partner, presenceMap, currentUser }: DirectMessagePanelProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const presence = presenceMap.get(partnerId)

  const fetchMessages = useCallback(async () => {
    try {
      const { messages: msgs } = await dmApi.getConversation(partnerId, 50, 0)
      setMessages([...msgs].reverse())
      // Mark all as read
      await dmApi.markConversationAsRead(partnerId).catch(() => {})
    } catch (e) { console.error("DM fetch", e) }
  }, [partnerId])

  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    fetchMessages().finally(() => setIsLoading(false))
  }, [partnerId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || isSending) return
    setIsSending(true)
    try {
      const sent = await dmApi.send(partnerId, message.trim())
      setMessages(prev => [...prev, sent])
      setMessage("")
    } catch (e) { console.error("DM send", e) }
    finally { setIsSending(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const media = await mediaApi.uploadFile(file)
      const sent = await dmApi.send(partnerId, `📎 ${file.name}`, media.id)
      setMessages(prev => [...prev, sent])
    } catch (e) { console.error("DM file upload", e) }
    finally { if (fileInputRef.current) fileInputRef.current.value = "" }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  const partnerName = partner?.displayName || partner?.username || "User"

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-active text-white font-medium text-sm">
            {partnerName.charAt(0).toUpperCase()}
          </div>
          {presence && (
            <PresenceIndicator
              status={presence.status}
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white"
            />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{partnerName}</p>
          <p className="text-xs text-muted-foreground capitalize">{presence?.status || "offline"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sidebar-active border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar-active text-white text-2xl font-bold">
              {partnerName.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-foreground">{partnerName}</p>
            <p className="text-sm text-muted-foreground">This is the beginning of your conversation with {partnerName}.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUser?.id
            const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId
            return (
              <div key={msg.id} className={`flex gap-3 py-0.5 ${showHeader ? "mt-3" : ""}`}>
                {!isOwn && showHeader ? (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-sidebar-active text-white text-xs font-medium flex items-center justify-center mt-0.5">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                ) : <div className="w-8 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {showHeader && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{isOwn ? "You" : partnerName}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                      {msg.status === "read" && isOwn && (
                        <span className="text-xs text-muted-foreground ml-auto">✓✓</span>
                      )}
                    </div>
                  )}
                  <p className={`text-sm whitespace-pre-wrap break-words rounded-lg px-3 py-2 inline-block max-w-[80%] ${
                    isOwn
                      ? "bg-sidebar-active text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    {msg.content}
                    {msg.isEdited && <span className="ml-1 text-xs opacity-70">(edited)</span>}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-white shadow-sm focus-within:border-sidebar-active focus-within:ring-1 focus-within:ring-sidebar-active">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-3 text-muted-foreground hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${partnerName}`}
            className="flex-1 resize-none bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            rows={1}
            disabled={isSending}
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="flex-shrink-0 p-3 text-muted-foreground hover:text-slack-green disabled:opacity-50 transition-colors"
          >
            {isSending
              ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
