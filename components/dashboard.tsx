"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { MessagePanel } from "@/components/message-panel"
import { DirectMessagePanel } from "@/components/direct-message-panel"
import { ContactsPanel } from "@/components/contacts-panel"
import { CreateGroupModal } from "@/components/create-group-modal"
import { ManageMembersModal } from "@/components/manage-members-modal"
import { usePresenceSocket } from "@/hooks/usePresenceSocket"
import { groupsApi, presenceApi, usersApi, dmApi, contactsApi, type Group, type Presence, type User } from "@/lib/api"

type View =
  | { type: "group"; group: Group }
  | { type: "dm"; partnerId: string }
  | { type: "contacts" }
  | null

export function Dashboard() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [currentView, setCurrentView] = useState<View>(null)
  const [presenceMap, setPresenceMap] = useState<Map<string, Presence>>(new Map())
  const [users, setUsers] = useState<User[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map())
  const [dmUnread, setDmUnread] = useState<Map<string, number>>(new Map())
  const [dmPartners, setDmPartners] = useState<Set<string>>(new Set())
  const [contacts, setContacts] = useState<Set<string>>(new Set())

  const { joinRoom, leaveRoom, startTyping, stopTyping } = usePresenceSocket({
    userId: user?.id || null,
    onPresenceUpdate: useCallback((presence: Presence) => {
      setPresenceMap(prev => new Map(prev).set(presence.userId, presence))
    }, []),
    onDmNew: useCallback((message: any) => {
      const partnerId = message.senderId
      setDmPartners(prev => new Set(prev).add(partnerId))
      setDmUnread(prev => {
        const next = new Map(prev)
        next.set(partnerId, (next.get(partnerId) || 0) + 1)
        return next
      })
    }, []),
    onTyping: useCallback((payload: { userId: string; groupId: string; typing: boolean }) => {
      setTypingUsers(prev => {
        const next = new Map(prev)
        const set = new Set(next.get(payload.groupId) || [])
        if (payload.typing) set.add(payload.userId)
        else set.delete(payload.userId)
        next.set(payload.groupId, set)
        return next
      })
    }, []),
  })

  const fetchGroups = useCallback(async () => {
    try {
      const fetched = await groupsApi.getAll()
      setGroups(fetched)
      if (!currentView && fetched.length > 0) setCurrentView({ type: "group", group: fetched[0] })
    } catch (e) { console.error(e) }
  }, [currentView])

  const fetchPresence = useCallback(async () => {
    try {
      const list = await presenceApi.getAll()
      const map = new Map<string, Presence>()
      list.forEach(p => map.set(p.userId, p))
      setPresenceMap(map)
    } catch (e) { console.error(e) }
  }, [])

  const fetchUsers = useCallback(async () => {
    try { setUsers(await usersApi.getAll()) }
    catch (e) { console.error(e) }
  }, [])

  const fetchDmConversations = useCallback(async () => {
    try {
      const conversations = await dmApi.getConversationList()
      const partners = new Set(conversations.map(c => c.partnerId))
      setDmPartners(partners)
      const unreadMap = new Map<string, number>()
      conversations.forEach(c => { if (c.unreadCount > 0) unreadMap.set(c.partnerId, c.unreadCount) })
      setDmUnread(unreadMap)
    } catch (e) { console.error(e) }
  }, [])

  const fetchContacts = useCallback(async () => {
    try {
      const myContacts = await contactsApi.getMyContacts('accepted')
      const contactIds = new Set(myContacts.map(c => c.contactId))
      setContacts(contactIds)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([fetchGroups(), fetchPresence(), fetchUsers(), fetchDmConversations(), fetchContacts()])
      setIsLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentView?.type === "group") {
      joinRoom(currentView.group.id)
      return () => leaveRoom(currentView.group.id)
    }
  }, [currentView, joinRoom, leaveRoom])

  const handleGroupCreated = (newGroup: Group) => {
    setGroups(prev => [...prev, newGroup])
    setCurrentView({ type: "group", group: newGroup })
    setIsCreateModalOpen(false)
  }

  const handleSelectDm = (partnerId: string) => {
    setDmUnread(prev => { const n = new Map(prev); n.delete(partnerId); return n })
    setDmPartners(prev => new Set(prev).add(partnerId))
    setCurrentView({ type: "dm", partnerId })
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sidebar-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sidebar-text border-t-transparent" />
          <span className="text-sidebar-text">Loading workspace...</span>
        </div>
      </div>
    )
  }

  const selectedGroup = currentView?.type === "group" ? currentView.group : null
  const dmPartnerId = currentView?.type === "dm" ? currentView.partnerId : null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={g => setCurrentView({ type: "group", group: g })}
        onCreateGroup={() => setIsCreateModalOpen(true)}
        presenceMap={presenceMap}
        currentUser={user}
        onSelectDm={handleSelectDm}
        activeDmPartnerId={dmPartnerId}
        dmUnread={dmUnread}
        dmPartners={dmPartners}
        users={users}
        onOpenContacts={() => setCurrentView({ type: "contacts" })}
        contactsActive={currentView?.type === "contacts"}
      />

      {currentView?.type === "group" && (
        <MessagePanel
          group={currentView.group}
          presenceMap={presenceMap}
          users={users}
          onManageMembers={() => setIsManageMembersOpen(true)}
          typingUserIds={typingUsers.get(currentView.group.id) || new Set()}
          onStartTyping={() => startTyping(currentView.group.id)}
          onStopTyping={() => stopTyping(currentView.group.id)}
        />
      )}

      {currentView?.type === "dm" && (
        <DirectMessagePanel
          partnerId={currentView.partnerId}
          partner={users.find(u => u.id === currentView.partnerId)}
          presenceMap={presenceMap}
          currentUser={user}
        />
      )}

      {currentView?.type === "contacts" && user && (
        <ContactsPanel
          currentUserId={user.id}
          allUsers={users}
          onStartDm={partnerId => handleSelectDm(partnerId)}
        />
      )}

      {!currentView && (
        <div className="flex flex-1 items-center justify-center bg-white">
          <p className="text-muted-foreground text-sm">Select a channel or start a direct message</p>
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {selectedGroup && (
        <ManageMembersModal
          isOpen={isManageMembersOpen}
          onClose={() => setIsManageMembersOpen(false)}
          group={selectedGroup}
          allUsers={users}
          userContacts={contacts}
        />
      )}
    </div>
  )
}