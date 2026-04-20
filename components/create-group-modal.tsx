"use client"

import { useState, useEffect, useRef } from "react"
import { X, Hash, Lock, Globe } from "lucide-react"
import { groupsApi, type Group } from "@/lib/api"

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: (group: Group) => void
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")
  const [joinPolicy, setJoinPolicy] = useState<"open" | "approval" | "invite">("open")
  const [maxMembers, setMaxMembers] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100) }, [isOpen])
  useEffect(() => {
    if (!isOpen) { setName(""); setDescription(""); setVisibility("public"); setJoinPolicy("open"); setMaxMembers(""); setError(null) }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Channel name is required"); return }
    setIsSubmitting(true); setError(null)
    try {
      const newGroup = await groupsApi.create(name.trim(), description.trim() || undefined, {
        visibility,
        joinPolicy,
        maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
      })
      onGroupCreated(newGroup)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel")
    } finally { setIsSubmitting(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-foreground">Create a channel</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className="w-full rounded-lg border border-input bg-white pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
                placeholder="e.g. marketing"
                maxLength={80}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20 resize-none"
              placeholder="What's this channel about?"
              rows={2}
              maxLength={250}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              {(["public", "private"] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                    visibility === v
                      ? "border-sidebar-active bg-sidebar-active/5 text-sidebar-active"
                      : "border-border text-foreground hover:border-sidebar-active/50"
                  }`}
                >
                  {v === "public" ? <Globe className="h-4 w-4 flex-shrink-0" /> : <Lock className="h-4 w-4 flex-shrink-0" />}
                  <div>
                    <p className="font-medium capitalize">{v}</p>
                    <p className="text-xs text-muted-foreground">{v === "public" ? "Anyone can join" : "Invite only"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Join Policy */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Membership</label>
            <select
              value={joinPolicy}
              onChange={e => setJoinPolicy(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm text-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
            >
              <option value="open">Open — anyone can join</option>
              <option value="approval">Approval — admin must approve requests</option>
              <option value="invite">Invite — admin must invite directly</option>
            </select>
          </div>

          {/* Max members */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1.5">
              Member limit <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={maxMembers}
              onChange={e => setMaxMembers(e.target.value)}
              min={2}
              max={10000}
              placeholder="No limit"
              className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slack-green hover:bg-slack-green-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating…
                </span>
              ) : "Create channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
