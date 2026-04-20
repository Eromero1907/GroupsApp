"use client"

import { useState } from "react"
import { Pencil, Trash2, X, Check, AlertTriangle, FileText, Download } from "lucide-react"
import { PresenceIndicator } from "@/components/presence-indicator"
import type { Message, User, PresenceStatus } from "@/lib/api"

interface MessageItemProps {
  message: Message
  sender?: User
  isOwnMessage: boolean
  showHeader: boolean
  presenceStatus?: PresenceStatus
  onUpdate: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
}

function MediaAttachment({ url, mimeType, filename }: { url: string; mimeType: string; filename: string }) {
  const isImage = mimeType?.startsWith("image/")
  const isPdf = mimeType === "application/pdf"
  const isLocalUrl = url?.includes("media.groupsapp.local")

  if (isImage && !isLocalUrl) {
    return (
      <div className="mt-1.5 max-w-sm">
        <img
          src={url}
          alt={filename}
          className="rounded-lg max-h-64 object-contain border border-border cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(url, "_blank")}
          onError={e => {
            const parent = (e.target as HTMLImageElement).parentElement
            if (parent) parent.innerHTML = `<div class="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded border border-border"><span>📎</span><span>${filename}</span></div>`
          }}
        />
      </div>
    )
  }

  return (
    <a
      href={isLocalUrl ? "#" : url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors text-sm text-foreground max-w-xs"
      onClick={isLocalUrl ? e => e.preventDefault() : undefined}
    >
      {isPdf ? <FileText className="h-4 w-4 text-red-500 flex-shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      <span className="truncate">{filename}</span>
      {!isLocalUrl && <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-auto" />}
    </a>
  )
}

export function MessageItem({
  message, sender, isOwnMessage, showHeader, presenceStatus, onUpdate, onDelete,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  const formatDate = (d: string) => {
    const date = new Date(d)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await onUpdate(message.id, editContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => { setEditContent(message.content); setIsEditing(false) }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try { await onDelete(message.id) }
    finally { setIsDeleting(false); setShowDeleteConfirm(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
    else if (e.key === "Escape") handleCancelEdit()
  }

  const hasMedia = !!(message as any).mediaUrl
  const mediaUrl = (message as any).mediaUrl as string | undefined
  const mediaMimeType = (message as any).mediaMimeType as string | undefined
  const mediaFilename = message.content.startsWith("📎 ")
    ? message.content.slice(3)
    : (mediaUrl?.split("/").pop() || "file")

  return (
    <>
      <div
        className={`group relative flex gap-3 py-1 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors ${showHeader ? "mt-4" : ""}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {showHeader ? (
          <div className="relative flex-shrink-0">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-medium text-sm ${
              isOwnMessage ? "bg-slack-green text-white" : "bg-sidebar-active text-white"
            }`}>
              {sender?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            {presenceStatus && (
              <PresenceIndicator status={presenceStatus} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
            )}
          </div>
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {showHeader && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-semibold text-foreground text-sm">
                {sender?.username || "Unknown"}
                {isOwnMessage && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
              </span>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSaveEdit} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-slack-green hover:bg-slack-green-hover rounded">
                  <Check className="h-3 w-3" /> Save
                </button>
                <button onClick={handleCancelEdit} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Text content — hide if it's just the file placeholder */}
              {message.content && !message.content.startsWith("📎 ") && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {message.content}
                  {message.isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
                </p>
              )}
              {/* Media attachment */}
              {hasMedia && mediaUrl && (
                <MediaAttachment
                  url={mediaUrl}
                  mimeType={mediaMimeType || "application/octet-stream"}
                  filename={mediaFilename}
                />
              )}
            </div>
          )}
        </div>

        {isOwnMessage && showActions && !isEditing && !showDeleteConfirm && (
          <div className="absolute -top-2 right-2 flex items-center gap-0.5 bg-white border border-border rounded-md shadow-sm">
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-md">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-r-md">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!showHeader && showActions && !showDeleteConfirm && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="mx-2 my-1 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-foreground flex-1">
            Delete this message? <span className="text-muted-foreground">This cannot be undone.</span>
          </p>
          <button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs font-semibold text-white rounded disabled:opacity-50"
            style={{ backgroundColor: "#dc2626" }}
          >
            {isDeleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded">
            Cancel
          </button>
        </div>
      )}
    </>
  )
}