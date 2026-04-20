"use client"

import { useState } from "react"
import { Hash, Plus, LogOut, ChevronDown, Search, X, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { PresenceIndicator } from "@/components/presence-indicator"
import type { Group, Presence, User } from "@/lib/api"

interface SidebarProps {
  groups: Group[]
  selectedGroup: Group | null
  onSelectGroup: (group: Group) => void
  onCreateGroup: () => void
  presenceMap: Map<string, Presence>
  currentUser: User | null
  onSelectDm: (partnerId: string) => void
  activeDmPartnerId: string | null
  dmUnread: Map<string, number>
  dmPartners: Set<string>
  users: User[]
  onOpenContacts: () => void
  contactsActive: boolean
}

export function Sidebar({
  groups, selectedGroup, onSelectGroup, onCreateGroup,
  presenceMap, currentUser, onSelectDm, activeDmPartnerId,
  dmUnread, dmPartners, users, onOpenContacts, contactsActive,
}: SidebarProps) {
  const { logout } = useAuth()
  const [showDms, setShowDms] = useState(true)
  const [dmSearch, setDmSearch] = useState("")
  const [searchingDm, setSearchingDm] = useState(false)
  const currentPresence = currentUser ? presenceMap.get(currentUser.id) : null

  const otherUsers = users.filter(u => u.id !== currentUser?.id)

  const dmCandidates = searchingDm && dmSearch
    ? otherUsers.filter(u => {
        const name = (u.displayName || u.username).toLowerCase()
        return name.includes(dmSearch.toLowerCase()) || u.username.toLowerCase().includes(dmSearch.toLowerCase())
      })
    : otherUsers.filter(u => dmPartners.has(u.id) || dmUnread.has(u.id) || presenceMap.get(u.id)?.status === "online")

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-bg text-sidebar-text">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Hash className="h-5 w-5 text-sidebar-bg" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">GroupsApp</h1>
            <span className="text-xs text-sidebar-text/70">Workspace</span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-sidebar-text/70" />
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scrollbar px-2 py-3 space-y-4">
        {/* Contacts button */}
        <div className="px-1">
          <button
            onClick={onOpenContacts}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
              contactsActive ? "bg-sidebar-active text-white" : "hover:bg-sidebar-hover text-sidebar-text"
            }`}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-sidebar-text/70">Channels</span>
            <button onClick={onCreateGroup} className="p-1 rounded hover:bg-sidebar-hover transition-colors" title="New channel">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {groups.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-sidebar-text/60">
              <button onClick={onCreateGroup} className="hover:text-white transition-colors">Create your first channel</button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {groups.map(group => (
                <li key={group.id}>
                  <button
                    onClick={() => onSelectGroup(group)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      selectedGroup?.id === group.id ? "bg-sidebar-active text-white" : "hover:bg-sidebar-hover text-sidebar-text"
                    }`}
                  >
                    <Hash className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate flex-1">{group.name}</span>
                    {group.visibility === "private" && <span className="text-[9px] opacity-60">🔒</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Direct Messages */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <button onClick={() => setShowDms(!showDms)} className="flex items-center gap-1">
              <ChevronDown className={`h-3 w-3 transition-transform ${showDms ? "" : "-rotate-90"}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-sidebar-text/70">Direct Messages</span>
            </button>
            <button
              onClick={() => { setSearchingDm(!searchingDm); setDmSearch("") }}
              className="p-1 rounded hover:bg-sidebar-hover transition-colors"
            >
              {searchingDm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {searchingDm && (
            <div className="px-2 mb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-sidebar-text/50" />
                <input
                  autoFocus
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  placeholder="Search users…"
                  className="w-full rounded bg-sidebar-hover text-sidebar-text text-xs pl-6 pr-2 py-1.5 focus:outline-none placeholder:text-sidebar-text/40"
                />
              </div>
            </div>
          )}

          {showDms && (
            <ul className="space-y-0.5">
              {dmCandidates.length === 0 && (
                <li className="px-2 py-1 text-xs text-sidebar-text/50">
                  {dmSearch ? "No users found" : "No active conversations"}
                </li>
              )}
              {dmCandidates.slice(0, 15).map(u => {
                const presence = presenceMap.get(u.id)
                const unread = dmUnread.get(u.id) || 0
                const isActive = activeDmPartnerId === u.id
                const name = u.displayName || u.username
                return (
                  <li key={u.id}>
                    <button
                      onClick={() => { onSelectDm(u.id); setSearchingDm(false); setDmSearch("") }}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        isActive ? "bg-sidebar-active text-white" : "hover:bg-sidebar-hover text-sidebar-text"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-sidebar-hover text-white text-xs font-medium">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {presence && (
                          <PresenceIndicator status={presence.status} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-sidebar-bg" />
                        )}
                      </div>
                      <span className="truncate flex-1">{name}</span>
                      {unread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
              {!searchingDm && (
                <li>
                  <button onClick={() => setSearchingDm(true)} className="w-full px-2 py-1 text-left text-xs text-sidebar-text/40 hover:text-sidebar-text/70 transition-colors">
                    + New message
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-hover text-white font-medium">
                {currentUser?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              {currentPresence && (
                <PresenceIndicator status={currentPresence.status} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-sidebar-bg" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.username || "User"}</p>
              <p className="text-xs text-sidebar-text/70 capitalize">{currentPresence?.status || "online"}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded hover:bg-sidebar-hover transition-colors flex-shrink-0" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}