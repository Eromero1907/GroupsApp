const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  displayName?: string
  bio?: string
  avatar?: string
  status?: string
  createdAt: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface Group {
  id: string
  name: string
  description?: string
  createdBy: string
  visibility: "public" | "private"
  joinPolicy: "open" | "approval" | "invite"
  maxMembers?: number | null
  rules?: string | null
  createdAt: string
  updatedAt?: string
  members?: GroupMember[]
}

export interface GroupMember {
  id: string
  userId: string
  role: "admin" | "member"
  joinedAt: string
  user?: User
}

export interface GroupSettings {
  id: string
  visibility: "public" | "private"
  joinPolicy: "open" | "approval" | "invite"
  maxMembers: number | null
  rules: string | null
}

export interface JoinRequest {
  id: string
  userId: string
  status: "pending" | "approved" | "rejected"
  message?: string
  reviewedBy?: string
  createdAt: string
}

export interface Message {
  id: string
  content: string
  groupId: string
  senderId: string
  isEdited: boolean
  mediaId?: string | null
  createdAt: string
  updatedAt?: string
  sender?: User
}

export interface MessageStatus {
  id: string
  messageId: string
  userId: string
  status: "sent" | "delivered" | "read"
  createdAt: string
}

export interface DirectMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  isEdited: boolean
  status: "sent" | "delivered" | "read"
  mediaId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface Conversation {
  partnerId: string
  lastMessage: DirectMessage | null
  unreadCount: number
  lastAt: string
}

export type PresenceStatus = "online" | "offline" | "away" | "dnd"

export interface Presence {
  userId: string
  status: PresenceStatus
  lastSeen?: string | null
  updatedAt?: string
}

export type ContactStatus = "pending" | "accepted" | "blocked"

export interface Contact {
  id: string
  ownerId: string
  contactId: string
  status: ContactStatus
  nickname?: string | null
  createdAt: string
}

export interface MediaFile {
  id: string
  filename: string
  url: string
  s3Key?: string | null
  mimeType: string
  size: number
  uploadedBy: string
  groupId?: string | null
  messageId?: string | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getAuthHeadersNoContentType(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(response.status, errorData.message || `HTTP error ${response.status}`)
  }
  return response.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })
    return handleResponse<AuthResponse>(res)
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    return handleResponse<AuthResponse>(res)
  },
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  async getAll(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() })
    return handleResponse<User[]>(res)
  },

  async getById(id: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, { headers: getAuthHeaders() })
    return handleResponse<User>(res)
  },

  async updateProfile(id: string, data: Partial<Pick<User, "displayName" | "bio" | "avatar" | "status">>): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<User>(res)
  },
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const contactsApi = {
  async add(contactId: string, nickname?: string): Promise<Contact> {
    const res = await fetch(`${API_BASE_URL}/users/contacts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ contactId, nickname }),
    })
    return handleResponse<Contact>(res)
  },

  async getMyContacts(status?: ContactStatus): Promise<Contact[]> {
    const qs = status ? `?status=${status}` : ""
    const res = await fetch(`${API_BASE_URL}/users/contacts/me${qs}`, { headers: getAuthHeaders() })
    return handleResponse<Contact[]>(res)
  },

  async getPendingRequests(): Promise<Contact[]> {
    const res = await fetch(`${API_BASE_URL}/users/contacts/pending`, { headers: getAuthHeaders() })
    return handleResponse<Contact[]>(res)
  },

  async accept(contactId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/users/contacts/accept/${contactId}`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    return handleResponse(res)
  },

  async reject(contactId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/users/contacts/reject/${contactId}`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    return handleResponse(res)
  },

  async update(contactId: string, data: { status?: ContactStatus; nickname?: string }): Promise<Contact> {
    const res = await fetch(`${API_BASE_URL}/users/contacts/${contactId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Contact>(res)
  },

  async remove(contactId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/users/contacts/${contactId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to remove contact")
  },
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groupsApi = {
  async create(
    name: string,
    description?: string,
    options?: { visibility?: "public" | "private"; joinPolicy?: "open" | "approval" | "invite"; maxMembers?: number; rules?: string }
  ): Promise<Group> {
    const res = await fetch(`${API_BASE_URL}/groups`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description, ...options }),
    })
    return handleResponse<Group>(res)
  },

  async getAll(): Promise<Group[]> {
    const res = await fetch(`${API_BASE_URL}/groups`, { headers: getAuthHeaders() })
    return handleResponse<Group[]>(res)
  },

  async getById(id: string): Promise<Group> {
    const res = await fetch(`${API_BASE_URL}/groups/${id}`, { headers: getAuthHeaders() })
    return handleResponse<Group>(res)
  },

  async getSettings(id: string): Promise<GroupSettings> {
    const res = await fetch(`${API_BASE_URL}/groups/${id}/settings`, { headers: getAuthHeaders() })
    return handleResponse<GroupSettings>(res)
  },

  async update(
    id: string,
    data: { name?: string; description?: string; visibility?: string; joinPolicy?: string; maxMembers?: number | null; rules?: string | null }
  ): Promise<Group> {
    const res = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Group>(res)
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/groups/${id}`, { method: "DELETE", headers: getAuthHeaders() })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new ApiError(res.status, (errorData as { message?: string }).message || "Failed to delete group")
    }
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, { headers: getAuthHeaders() })
    return handleResponse<GroupMember[]>(res)
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember | JoinRequest> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
      method: "POST", headers: getAuthHeaders(),
    })
    return handleResponse(res)
  },

  async addMemberDirect(groupId: string, userId: string): Promise<GroupMember> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}/direct`, {
      method: "POST", headers: getAuthHeaders(),
    })
    return handleResponse<GroupMember>(res)
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
      method: "DELETE", headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to remove member")
  },

  async promoteToAdmin(groupId: string, userId: string): Promise<GroupMember> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}/promote`, {
      method: "PUT", headers: getAuthHeaders(),
    })
    return handleResponse<GroupMember>(res)
  },

  async demoteFromAdmin(groupId: string, userId: string): Promise<GroupMember> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}/demote`, {
      method: "PUT", headers: getAuthHeaders(),
    })
    return handleResponse<GroupMember>(res)
  },

  // Join requests
  async getJoinRequests(groupId: string, status?: string): Promise<JoinRequest[]> {
    const qs = status ? `?status=${status}` : ""
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/join-requests${qs}`, { headers: getAuthHeaders() })
    return handleResponse<JoinRequest[]>(res)
  },

  async requestToJoin(groupId: string, message?: string): Promise<JoinRequest> {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/join-requests`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    })
    return handleResponse<JoinRequest>(res)
  },

  async reviewJoinRequest(requestId: string, status: "approved" | "rejected"): Promise<{ requestId: string; status: string }> {
    const res = await fetch(`${API_BASE_URL}/groups/join-requests/${requestId}/review`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    })
    return handleResponse(res)
  },
}

// ─── Messages (grupal) ────────────────────────────────────────────────────────

export const messagesApi = {
  async send(content: string, groupId: string, mediaId?: string, mediaUrl?: string, mediaMimeType?: string): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, groupId, mediaId, mediaUrl, mediaMimeType }),
    })
    return handleResponse<Message>(res)
  },

  async getByGroup(groupId: string, limit = 50, offset = 0): Promise<Message[]> {
    const res = await fetch(
      `${API_BASE_URL}/messages/group/${groupId}?limit=${limit}&offset=${offset}`,
      { headers: getAuthHeaders() }
    )
    const data = await handleResponse<{ messages: Message[]; total: number }>(res)
    return data.messages
  },

  async update(id: string, content: string): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ content }),
    })
    return handleResponse<Message>(res)
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: "DELETE", headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to delete message")
  },

  async getStatus(id: string): Promise<MessageStatus[]> {
    const res = await fetch(`${API_BASE_URL}/messages/${id}/status`, { headers: getAuthHeaders() })
    return handleResponse<MessageStatus[]>(res)
  },

  async markAsRead(id: string): Promise<MessageStatus> {
    const res = await fetch(`${API_BASE_URL}/messages/${id}/read`, {
      method: "POST", headers: getAuthHeaders(),
    })
    return handleResponse<MessageStatus>(res)
  },
}

// ─── Direct Messages (1-1) ────────────────────────────────────────────────────

export const dmApi = {
  async send(receiverId: string, content: string, mediaId?: string): Promise<DirectMessage> {
    const res = await fetch(`${API_BASE_URL}/direct-messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ receiverId, content, mediaId }),
    })
    return handleResponse<DirectMessage>(res)
  },

  async getConversation(partnerId: string, limit = 50, offset = 0): Promise<{ messages: DirectMessage[]; total: number }> {
    const res = await fetch(
      `${API_BASE_URL}/direct-messages/with/${partnerId}?limit=${limit}&offset=${offset}`,
      { headers: getAuthHeaders() }
    )
    return handleResponse(res)
  },

  async getConversationList(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE_URL}/direct-messages/conversations`, { headers: getAuthHeaders() })
    return handleResponse<Conversation[]>(res)
  },

  async update(id: string, content: string): Promise<DirectMessage> {
    const res = await fetch(`${API_BASE_URL}/direct-messages/${id}`, {
      method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ content }),
    })
    return handleResponse<DirectMessage>(res)
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/direct-messages/${id}`, {
      method: "DELETE", headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to delete DM")
  },

  async markAsRead(id: string): Promise<DirectMessage> {
    const res = await fetch(`${API_BASE_URL}/direct-messages/${id}/read`, {
      method: "POST", headers: getAuthHeaders(),
    })
    return handleResponse<DirectMessage>(res)
  },

  async markConversationAsRead(senderId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/direct-messages/with/${senderId}/read`, {
      method: "POST", headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to mark conversation as read")
  },
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export const presenceApi = {
  async getAll(): Promise<Presence[]> {
    const res = await fetch(`${API_BASE_URL}/presence`, { headers: getAuthHeaders() })
    return handleResponse<Presence[]>(res)
  },

  async getByUser(userId: string): Promise<Presence> {
    const res = await fetch(`${API_BASE_URL}/presence/${userId}`, { headers: getAuthHeaders() })
    return handleResponse<Presence>(res)
  },

  async setStatus(userId: string, status: PresenceStatus): Promise<Presence> {
    const res = await fetch(`${API_BASE_URL}/presence/${userId}/status`, {
      method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ status }),
    })
    return handleResponse<Presence>(res)
  },

  async heartbeat(userId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/presence/${userId}/heartbeat`, {
      method: "POST", headers: getAuthHeaders(),
    })
  },
}

// ─── Media ────────────────────────────────────────────────────────────────────

export const mediaApi = {
  /** Upload real con archivo binario */
  async uploadFile(file: File, groupId?: string, messageId?: string): Promise<MediaFile> {
    const form = new FormData()
    form.append("file", file)
    if (groupId) form.append("groupId", groupId)
    if (messageId) form.append("messageId", messageId)

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const res = await fetch(`${API_BASE_URL}/media/upload-file`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    return handleResponse<MediaFile>(res)
  },

  /** Upload JSON (desarrollo/compat) */
  async upload(filename: string, groupId?: string): Promise<MediaFile> {
    const res = await fetch(`${API_BASE_URL}/media/upload`, {
      method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ filename, groupId }),
    })
    return handleResponse<MediaFile>(res)
  },

  async getById(id: string): Promise<MediaFile> {
    const res = await fetch(`${API_BASE_URL}/media/${id}`, { headers: getAuthHeaders() })
    return handleResponse<MediaFile>(res)
  },

  async getPresignedUrl(id: string, expiresIn = 3600): Promise<{ url: string; presigned: boolean }> {
    const res = await fetch(`${API_BASE_URL}/media/${id}/presigned?expiresIn=${expiresIn}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse(res)
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/media/${id}`, {
      method: "DELETE", headers: getAuthHeaders(),
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to delete media")
  },
}