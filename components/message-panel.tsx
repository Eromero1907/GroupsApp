"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Hash, Users, LogIn } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"
import { MessageItem } from "@/components/message-item"
import { MessageInput } from "@/components/message-input"
import { messagesApi, groupsApi, type Group, type Message, type Presence, type User } from "@/lib/api"

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
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [hasRequestPending, setHasRequestPending] = useState(false)
  const [isRequestingToJoin, setIsRequestingToJoin] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const usersMap = new Map(users.map(u => [u.id, u]))

  const getMessageErrorText = (err: any): string => {
    // Check for specific error messages from the server
    const errorMsg = err?.message?.toLowerCase() || ""
    const statusCode = err?.status || err?.statusCode

    // Check for membership errors
    if (errorMsg.includes("not a member") || errorMsg.includes("no es miembro")) {
      return "You are not a member of this group"
    }
    if (errorMsg.includes("member")) {
      return "You need to join this group first to send messages"
    }

    // Check for permission errors
    if (statusCode === 403 || errorMsg.includes("forbidden") || errorMsg.includes("permission")) {
      return "You don't have permission to send messages in this group"
    }
    if (errorMsg.includes("write") || errorMsg.includes("send")) {
      return "You cannot send messages to this group"
    }

    // Check for group/user not found
    if (statusCode === 404 || errorMsg.includes("not found")) {
      return "This group or user no longer exists"
    }

    // Check for auth errors
    if (statusCode === 401 || errorMsg.includes("unauthorized")) {
      return "Your session has expired, please log in again"
    }

    // Default error message
    return "Failed to send message"
  }

  const fetchMessages = useCallback(async () => {
    if (!group) return
    try {
      const fetched = await messagesApi.getByGroup(group.id, 100, 0)
      setMessages([...fetched].reverse())
    } catch (e) { console.error("fetchMessages", e) }
  }, [group])

  const checkMembershipAndRequests = useCallback(async () => {
    if (!group || !currentUser) return
    try {
      const members = await groupsApi.getMembers(group.id)
      const isMemberOf = members.some(m => m.userId === currentUser.id)
      setIsMember(isMemberOf)

      if (!isMemberOf && group.joinPolicy === "approval") {
        const requests = await groupsApi.getJoinRequests(group.id)
        const hasPending = requests.some(r => r.userId === currentUser.id && r.status === "pending")
        setHasRequestPending(hasPending)
      }
    } catch (e) { console.error("checkMembership", e) }
  }, [group, currentUser])

  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    Promise.all([fetchMessages(), checkMembershipAndRequests()]).finally(() => setIsLoading(false))
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

  const handleRequestToJoin = async () => {
    if (!currentUser) return
    setIsRequestingToJoin(true)
    try {
      await groupsApi.requestToJoin(group.id, `Requesting to join ${group.name}`)
      setHasRequestPending(true)
      showToast("Join request sent", "success")
    } catch (err) {
      console.error("Failed to request join", err)
      showToast("Failed to send join request", "error")
    } finally {
      setIsRequestingToJoin(false)
    }
  }

  const handleSend = async (content: string, mediaId?: string, mediaUrl?: string, mediaMimeType?: string) => {
    try {
      // If group is public with open join policy, auto-join before sending
      if (group.visibility === "public" && group.joinPolicy === "open") {
        try {
          await groupsApi.addMember(group.id, currentUser?.id!)
        } catch (err) {
          // Might already be a member, ignore error
          console.debug("Auto-join failed (might already be member):", err)
        }
      }
      const newMsg = await messagesApi.send(content, group.id, mediaId, mediaUrl, mediaMimeType)
      setMessages(prev => [...prev, newMsg])
      showToast("Message sent", "success", 2000)
    } catch (err) {
      console.error("Failed to send message:", err)
      const errorMsg = getMessageErrorText(err)
      showToast(errorMsg, "error")
      throw err
    }
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

      {!isMember && group.joinPolicy === "approval" && (
        <div className="border-t border-border px-6 py-4 bg-muted/50">
          {hasRequestPending ? (
            <p className="text-sm text-muted-foreground text-center">✓ Request to join sent. Waiting for admin approval.</p>
          ) : (
            <button
              onClick={handleRequestToJoin}
              disabled={isRequestingToJoin}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slack-green py-2.5 px-4 text-white font-medium hover:bg-slack-green-hover focus:outline-none focus:ring-2 focus:ring-slack-green/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LogIn className="h-4 w-4" />
              {isRequestingToJoin ? "Sending request..." : "Request to join"}
            </button>
          )}
        </div>
      )}

      {!isMember && group.joinPolicy === "invite" && (
        <div className="border-t border-border px-6 py-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">You need an invitation from an admin to join this channel.</p>
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