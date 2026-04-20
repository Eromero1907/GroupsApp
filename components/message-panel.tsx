"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Hash, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { MessageItem } from "@/components/message-item"
import { MessageInput } from "@/components/message-input"
import { messagesApi, type Group, type Message, type Presence, type User } from "@/lib/api"

interface MessagePanelProps {
  group: Group
  presenceMap: Map<string, Presence>
  users: User[]
  onManageMembers: () => void
  typingUserIds: Set<string>
  onStartTyping: () => void
  onStopTyping: () => void
}

export function MessagePanel({
  group, presenceMap, users, onManageMembers,
  typingUserIds, onStartTyping, onStopTyping,
}: MessagePanelProps) {
  const { user: currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const usersMap = new Map(users.map(u => [u.id, u]))

  const fetchMessages = useCallback(async () => {
    if (!group) return
    try {
      const fetched = await messagesApi.getByGroup(group.id, 100, 0)
      setMessages([...fetched].reverse())
    } catch (e) { console.error("fetchMessages", e) }
  }, [group])

  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    fetchMessages().finally(() => setIsLoading(false))
  }, [group.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    if (isAtBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isAtBottom])

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100)
    }
  }

  const handleSend = async (content: string, mediaId?: string, mediaUrl?: string, mediaMimeType?: string) => {
    const newMsg = await messagesApi.send(content, group.id, mediaId, mediaUrl, mediaMimeType)
    setMessages(prev => [...prev, newMsg])
  }

  const handleUpdate = async (id: string, content: string) => {
    const updated = await messagesApi.update(id, content)
    setMessages(prev => prev.map(m => m.id === id ? updated : m))
  }

  const handleDelete = async (id: string) => {
    await messagesApi.delete(id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const typingNames = [...typingUserIds].map(uid => usersMap.get(uid)?.username).filter(Boolean)
  const typingLabel =
    typingNames.length === 0 ? null
    : typingNames.length === 1 ? `${typingNames[0]} is typing…`
    : typingNames.length === 2 ? `${typingNames[0]} and ${typingNames[1]} are typing…`
    : "Several people are typing…"

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{group.name}</h2>
          {group.description && (
            <span className="text-sm text-muted-foreground border-l border-border pl-2">{group.description}</span>
          )}
        </div>
        <button onClick={onManageMembers} className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <Users className="h-4 w-4" />
          <span>{group.members?.length ?? 0}</span>
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sidebar-active border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Hash className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">Welcome to #{group.name}!</p>
            <p className="text-sm text-muted-foreground">This is the beginning of the channel.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const sender = usersMap.get(msg.senderId)
            const isOwn = msg.senderId === currentUser?.id
            const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId ||
              new Date(msg.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() > 5 * 60_000
            return (
              <MessageItem
                key={msg.id}
                message={msg}
                sender={sender}
                isOwnMessage={isOwn}
                showHeader={showHeader}
                presenceStatus={sender ? presenceMap.get(sender.id)?.status : undefined}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {typingLabel && (
        <div className="px-6 pb-1 text-xs text-muted-foreground italic flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          {typingLabel}
        </div>
      )}

      <MessageInput
        groupName={group.name}
        groupId={group.id}
        onSend={handleSend}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
      />
    </div>
  )
}