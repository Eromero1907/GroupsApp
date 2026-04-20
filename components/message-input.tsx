"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Paperclip, X } from "lucide-react"
import { mediaApi } from "@/lib/api"

interface UploadedMedia {
  id: string
  name: string
  url: string
  mimeType: string
}

interface MessageInputProps {
  groupName: string
  groupId: string
  onSend: (content: string, mediaId?: string, mediaUrl?: string, mediaMimeType?: string) => Promise<void>
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export function MessageInput({ groupName, groupId, onSend, onStartTyping, onStopTyping }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 200)}px` }
  }, [message])

  const handleTyping = useCallback(() => {
    onStartTyping?.()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onStopTyping?.(), 2000)
  }, [onStartTyping, onStopTyping])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(file)
    try {
      const media = await mediaApi.uploadFile(file, groupId)
      setUploadedMedia({
        id: media.id,
        name: file.name,
        url: media.url,
        mimeType: media.mimeType,
      })
    } catch (err) {
      console.error("File upload failed", err)
    } finally {
      setUploadingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!message.trim() && !uploadedMedia) || isSending) return
    setIsSending(true)
    onStopTyping?.()
    try {
      await onSend(
        message.trim(),
        uploadedMedia?.id,
        uploadedMedia?.url,
        uploadedMedia?.mimeType,
      )
      setMessage("")
      setUploadedMedia(null)
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    } finally { setIsSending(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const isImage = uploadedMedia && uploadedMedia.mimeType.startsWith("image/")

  return (
    <div className="border-t border-border px-6 py-4">
      {/* File/image preview */}
      {(uploadingFile || uploadedMedia) && (
        <div className="mb-2 rounded-lg border border-border bg-muted overflow-hidden">
          {isImage ? (
            <div className="relative">
              <img
                src={uploadedMedia!.url}
                alt={uploadedMedia!.name}
                className="max-h-48 max-w-xs object-contain rounded-t-lg"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
              <button
                onClick={() => setUploadedMedia(null)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="px-3 py-1.5 text-xs text-muted-foreground">{uploadedMedia!.name}</div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-foreground">
                {uploadingFile ? `Uploading ${uploadingFile.name}…` : uploadedMedia?.name}
              </span>
              {uploadedMedia && (
                <button onClick={() => setUploadedMedia(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex items-end gap-2 rounded-lg border border-border bg-white shadow-sm focus-within:border-sidebar-active focus-within:ring-1 focus-within:ring-sidebar-active">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-3 text-muted-foreground hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx,.txt,.zip" onChange={handleFileChange} />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => { setMessage(e.target.value); handleTyping() }}
            onKeyDown={handleKeyDown}
            onBlur={() => onStopTyping?.()}
            placeholder={`Message #${groupName}`}
            className="flex-1 resize-none bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            rows={1}
            disabled={isSending}
          />

          <button
            type="submit"
            disabled={(!message.trim() && !uploadedMedia) || isSending}
            className="flex-shrink-0 p-3 text-muted-foreground hover:text-slack-green disabled:opacity-50 transition-colors"
          >
            {isSending
              ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> to send ·{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Shift+Enter</kbd> for new line
        </p>
      </form>
    </div>
  )
}