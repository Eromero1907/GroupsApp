"use client"

import { useState, useEffect, useCallback } from "react"
import { UserPlus, UserCheck, UserX, Search, Users, Clock, Ban } from "lucide-react"
import { contactsApi, usersApi, type Contact, type User } from "@/lib/api"

interface ContactsPanelProps {
  currentUserId: string
  allUsers: User[]
  onStartDm: (userId: string) => void
}

type ContactTab = "contacts" | "pending" | "add"

export function ContactsPanel({ currentUserId, allUsers, onStartDm }: ContactsPanelProps) {
  const [activeTab, setActiveTab] = useState<ContactTab>("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pendingRequests, setPendingRequests] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  // Cache of users fetched on demand (for users not in allUsers)
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map())

  // Build a combined user lookup: allUsers + fetched cache
  const getUserById = useCallback((id: string): User | undefined => {
    return allUsers.find(u => u.id === id) || userCache.get(id)
  }, [allUsers, userCache])

  // Fetch a user by ID if not already known
  const ensureUser = useCallback(async (id: string) => {
    if (!id || getUserById(id)) return
    try {
      const user = await usersApi.getById(id)
      setUserCache(prev => new Map(prev).set(id, user))
    } catch (e) { /* silent */ }
  }, [getUserById])

  const fetchContacts = useCallback(async () => {
    try {
      const [accepted, sentPending, pending] = await Promise.all([
        contactsApi.getMyContacts("accepted"),
        contactsApi.getMyContacts("pending"),
        contactsApi.getPendingRequests(),
      ])
      setContacts([...accepted, ...sentPending])
      setPendingRequests(pending)

      // Ensure all referenced users are in cache
      const allIds = [
        ...accepted.map(c => c.contactId),
        ...sentPending.map(c => c.contactId),
        ...pending.map(c => c.ownerId),
      ]
      await Promise.all([...new Set(allIds)].map(ensureUser))
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [ensureUser])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleAddContact = async (userId: string) => {
    setActionInProgress(userId)
    try {
      await contactsApi.add(userId)
    } catch (e: any) {
      if (!e?.message?.toLowerCase().includes("existe") && !e?.message?.toLowerCase().includes("exist")) {
        console.error(e)
      }
    } finally {
      await fetchContacts()
      setActionInProgress(null)
    }
  }

  const handleAccept = async (senderId: string) => {
    setActionInProgress(senderId)
    try {
      await contactsApi.accept(senderId)
      await fetchContacts()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleReject = async (senderId: string) => {
    setActionInProgress(`reject-${senderId}`)
    try {
      await contactsApi.reject(senderId)
      await fetchContacts()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleBlock = async (contactId: string) => {
    setActionInProgress(`block-${contactId}`)
    try {
      await contactsApi.update(contactId, { status: "blocked" })
      await fetchContacts()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const handleRemove = async (contactId: string) => {
    setActionInProgress(`remove-${contactId}`)
    try {
      await contactsApi.remove(contactId)
      await fetchContacts()
    } catch (e) { console.error(e) }
    finally { setActionInProgress(null) }
  }

  const contactUserIds = new Set(contacts.map(c => c.contactId))
  const pendingUserIds = new Set(pendingRequests.map(r => r.ownerId))
  const otherUsers = allUsers.filter(u => u.id !== currentUserId)

  const filteredContacts = contacts.filter(c => {
    const user = getUserById(c.contactId)
    if (!user) return true // show even if not found yet
    const name = (user.displayName || user.username).toLowerCase()
    return name.includes(searchQuery.toLowerCase()) || user.username.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const nonContacts = otherUsers.filter(u =>
    !contactUserIds.has(u.id) &&
    !pendingUserIds.has(u.id) &&
    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const UserAvatar = ({ userId, size = "md" }: { userId: string; size?: "sm" | "md" }) => {
    const user = getUserById(userId)
    const name = user ? (user.displayName || user.username) : userId.slice(0, 8)
    const cls = size === "sm"
      ? "flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-active text-white font-medium text-xs"
      : "flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-active text-white font-medium text-sm"
    return <div className={cls}>{name.charAt(0).toUpperCase()}</div>
  }

  const UserName = ({ userId }: { userId: string }) => {
    const user = getUserById(userId)
    if (!user) return <span className="text-sm font-medium text-muted-foreground">Loading…</span>
    return (
      <div>
        <p className="text-sm font-medium text-foreground">{user.displayName || user.username}</p>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Contacts</h2>
      </div>

      <div className="flex border-b border-border">
        {([
          { key: "contacts" as ContactTab, label: `My contacts (${contacts.length})` },
          { key: "pending" as ContactTab, label: `Pending (${pendingRequests.length})` },
          { key: "add" as ContactTab, label: "Add contact" },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-sidebar-active border-b-2 border-sidebar-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-input bg-white pl-9 pr-4 py-2 text-sm focus:border-sidebar-active focus:outline-none focus:ring-2 focus:ring-sidebar-active/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sidebar-active border-t-transparent" />
          </div>
        ) : activeTab === "contacts" ? (
          filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <p className="font-medium text-foreground">No contacts yet</p>
              <p className="text-sm text-muted-foreground">Add people to start building your contact list.</p>
              <button onClick={() => setActiveTab("add")} className="text-sm text-sidebar-active hover:underline">
                Add your first contact
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredContacts.map(contact => {
                const isPending = contact.status === "pending"
                return (
                  <li key={contact.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={contact.contactId} />
                      <div>
                        <div className="flex items-center gap-2">
                          <UserName userId={contact.contactId} />
                          {isPending && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Request sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isPending && (
                        <button
                          onClick={() => onStartDm(contact.contactId)}
                          className="px-3 py-1.5 text-xs font-medium text-sidebar-active border border-sidebar-active/30 hover:bg-sidebar-active/5 rounded-lg transition-colors"
                        >
                          Message
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(contact.contactId)}
                        disabled={!!actionInProgress}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        ) : activeTab === "pending" ? (
          pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Clock className="h-12 w-12 text-muted-foreground/30" />
              <p className="font-medium text-foreground">No pending requests</p>
              <p className="text-sm text-muted-foreground">Contact requests from others will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {pendingRequests.map(req => {
                const senderId = req.ownerId
                return (
                  <li key={req.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={senderId} />
                      <div>
                        <UserName userId={senderId} />
                        <p className="text-xs text-muted-foreground mt-0.5">wants to connect</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(senderId)}
                        disabled={!!actionInProgress}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slack-green hover:bg-slack-green-hover rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleReject(senderId)}
                        disabled={!!actionInProgress}
                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        ) : (
          nonContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No users found" : "No more users to add"}
            </div>
          ) : (
            <ul className="space-y-1">
              {nonContacts.slice(0, 20).map(user => (
                <li key={user.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground font-medium text-sm">
                      {(user.displayName || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.displayName || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddContact(user.id)}
                    disabled={!!actionInProgress}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sidebar-active border border-sidebar-active/30 hover:bg-sidebar-active/5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {actionInProgress === user.id
                      ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sidebar-active border-t-transparent" />
                      : <UserPlus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  )
}