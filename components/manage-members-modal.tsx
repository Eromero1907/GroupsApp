"use client"

import { useState, useEffect, useCallback } from "react"
import { X, UserPlus, UserMinus, Search, Hash, Shield, ChevronDown, Globe, Lock, CheckCircle, XCircle } from "lucide-react"
import { groupsApi, type Group, type GroupMember, type User, type GroupSettings, type JoinRequest } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

interface ManageMembersModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  allUsers: User[]
  userContacts: Set<string>
}

type Tab = "members" | "add" | "requests" | "settings"

export function ManageMembersModal({ isOpen, onClose, group, allUsers, userContacts }: ManageMembersModalProps) {
  const { user: currentUser } = useAuth()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("members")
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    visibility: "public" as "public" | "private",
    joinPolicy: "open" as "open" | "approval" | "invite",
    maxMembers: "",
    rules: "",
  })

  const isAdmin = members.some(m => m.userId === currentUser?.id && m.role === "admin")

  const fetchData = useCallback(async () => {
    try {
      const [fetchedMembers, fetchedSettings, fetchedRequests] = await Promise.all([
        groupsApi.getMembers(group.id),
        groupsApi.getSettings(group.id),
        groupsApi.getJoinRequests(group.id),
      ])
      setMembers(fetchedMembers)
      setSettings(fetchedSettings)
      setJoinRequests(fetchedRequests)
      setSettingsForm({
        visibility: fetchedSettings.visibility,
        joinPolicy: fetchedSettings.joinPolicy,
        maxMembers: fetchedSettings.maxMembers?.toString() || "",
        rules: fetchedSettings.rules || "",
      })
    } catch (e) {
      console.error("Failed to fetch group data", e)
    } finally {
      setIsLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    if (isOpen) { setIsLoading(true); fetchData() }
  }, [isOpen, fetchData])

  useEffect(() => {
    if (!isOpen) { setSearchQuery(""); setActiveTab("members") }
  }, [isOpen])

  const memberUserIds = new Set(members.map(m => m.userId))
  const nonMembers = allUsers.filter(u => !memberUserIds.has(u.id) && userContacts.has(u.id))

  const filteredMembers = members.filter(m => {
    const user = allUsers.find(u => u.id === m.userId)
    return user?.username.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredNonMembers = nonMembers.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddMember = async (userId: string) => {
    setActionInProgress(userId)
    try {
      // Admin adds directly without respecting joinPolicy
      if (isAdmin) {
        await groupsApi.addMemberDirect(group.id, userId)
      } else {
        await groupsApi.addMember(group.id, userId)
      }
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleReviewRequest = async (requestId: string, approved: boolean) => {
    setActionInProgress(requestId)
    try {
      await groupsApi.reviewJoinRequest(requestId, approved ? "approved" : "rejected")
      if (approved) {
        await fetchData()
      } else {
        setJoinRequests(prev => prev.filter(r => r.id !== requestId))
      }
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleRemoveMember = async (userId: string) => {
    setActionInProgress(userId)
    try {
      await groupsApi.removeMember(group.id, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handlePromote = async (userId: string) => {
    setActionInProgress(`promote-${userId}`)
    try {
      await groupsApi.promoteToAdmin(group.id, userId)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleDemoteFromAdmin = async (userId: string) => {
    setActionInProgress(`demote-${userId}`)
    try {
      await groupsApi.demoteFromAdmin(group.id, userId)
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await groupsApi.update(group.id, {
        visibility: settingsForm.visibility,
        joinPolicy: settingsForm.joinPolicy,
        maxMembers: settingsForm.maxMembers ? parseInt(settingsForm.maxMembers) : null,
        rules: settingsForm.rules || null,
      })
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingSettings(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{group.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["members", "add", ...(isAdmin && settings?.joinPolicy === "approval" ? ["requests"] : []), ...(isAdmin ? ["settings"] : [])] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-sidebar-active border-b-2 border-sidebar-active"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "members" ? `Members (${members.length})` : tab === "add" ? "Add people" : tab === "requests" ? `Requests (${joinRequests.filter(r => r.status === "pending").length})` : "Settings"}
            </button>
          ))}
        </div>

        {/* Search (only for members/add tabs) */}
        {(activeTab === "members" || activeTab === "add") && (
          <div className="px-6 py-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === "members" ? "Search members…" : "Search users to add…"}
                className="w-full rounded-lg border border-input bg-white pl-9 pr-4 py-2 text-sm focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sidebar-active border-t-transparent" />
            </div>
          ) : activeTab === "members" ? (
            filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "No members found" : "No members yet"}
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredMembers.map(member => {
                  const user = allUsers.find(u => u.id === member.userId)
                  if (!user) return null
                  const isSelf = user.id === currentUser?.id
                  return (
                    <li key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-active text-white font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user.username}
                            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === "admin" ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Shield className="h-3 w-3" /> Admin
                            </span>
                            {isAdmin && !isSelf && user.id !== group.createdBy && (
                              <button
                                onClick={() => handleDemoteFromAdmin(user.id)}
                                disabled={actionInProgress === `demote-${user.id}`}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                                title="Remove admin"
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ) : isAdmin && !isSelf ? (
                          <button
                            onClick={() => handlePromote(user.id)}
                            disabled={actionInProgress === `promote-${user.id}`}
                            className="text-xs text-muted-foreground hover:text-sidebar-active transition-colors px-2 py-1 rounded hover:bg-muted"
                            title="Make admin"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2">Member</span>
                        )}
                        {isAdmin && !isSelf && member.role !== "admin" && (
                          <button
                            onClick={() => handleRemoveMember(user.id)}
                            disabled={!!actionInProgress}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : activeTab === "add" ? (
            filteredNonMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "No users found" : "Everyone is already a member"}
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredNonMembers.map(user => (
                  <li key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground font-medium text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      disabled={!!actionInProgress}
                      className="p-2 text-muted-foreground hover:text-slack-green hover:bg-slack-green/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Add to channel"
                    >
                      {actionInProgress === user.id
                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        : <UserPlus className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : activeTab === "requests" ? (
            <div className="p-4">
              {joinRequests.filter(r => r.status === "pending").length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {joinRequests.filter(r => r.status === "pending").map(req => {
                    const user = allUsers.find(u => u.id === req.userId)
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground font-medium text-xs">
                            {user?.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user?.username}</p>
                            {req.message && <p className="text-xs text-muted-foreground mt-0.5">{req.message}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleReviewRequest(req.id, true)}
                            disabled={actionInProgress === req.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReviewRequest(req.id, false)}
                            disabled={actionInProgress === req.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Settings tab */
            <div className="space-y-5">
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["public", "private"] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSettingsForm(f => ({ ...f, visibility: v }))}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        settingsForm.visibility === v
                          ? "border-sidebar-active bg-sidebar-active/5 text-sidebar-active"
                          : "border-border text-foreground hover:border-sidebar-active/50"
                      }`}
                    >
                      {v === "public" ? <Globe className="h-4 w-4 flex-shrink-0" /> : <Lock className="h-4 w-4 flex-shrink-0" />}
                      <div>
                        <p className="font-medium capitalize">{v}</p>
                        <p className="text-xs text-muted-foreground">{v === "public" ? "Anyone can see" : "Hidden"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Join policy */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Membership policy</label>
                <select
                  value={settingsForm.joinPolicy}
                  onChange={e => setSettingsForm(f => ({ ...f, joinPolicy: e.target.value as any }))}
                  className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm focus:border-sidebar-active focus:outline-none"
                >
                  <option value="open">Open — anyone can join</option>
                  <option value="approval">Approval — admin approves requests</option>
                  <option value="invite">Invite only — admin invites directly</option>
                </select>
              </div>

              {/* Max members */}
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1.5">
                  Member limit <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={settingsForm.maxMembers}
                  onChange={e => setSettingsForm(f => ({ ...f, maxMembers: e.target.value }))}
                  min={2} max={10000}
                  placeholder="No limit"
                  className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm focus:border-sidebar-active focus:outline-none"
                />
              </div>

              {/* Rules */}
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1.5">
                  Channel rules <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={settingsForm.rules}
                  onChange={e => setSettingsForm(f => ({ ...f, rules: e.target.value }))}
                  placeholder="Describe the rules for this channel…"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm focus:border-sidebar-active focus:outline-none resize-none"
                  maxLength={2000}
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full py-2.5 text-sm font-medium text-white bg-slack-green hover:bg-slack-green-hover rounded-lg disabled:opacity-50 transition-colors"
              >
                {savingSettings ? "Saving…" : "Save settings"}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}