import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, authApi, messagesApi } from "./api"

describe("ApiError", () => {
  it("expone status y message", () => {
    const e = new ApiError(404, "not found")
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe("ApiError")
    expect(e.status).toBe(404)
    expect(e.message).toBe("not found")
  })
})

describe("authApi (fetch mockeado)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("register devuelve el cuerpo JSON en 200", async () => {
    const body = {
      access_token: "tok",
      user: { id: "1", username: "u", email: "u@e.com" },
    }
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    } as Response)

    const r = await authApi.register("u", "u@e.com", "12345678")
    expect(r).toEqual(body)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/register$/),
      expect.objectContaining({ method: "POST" })
    )
  })

  it("register lanza ApiError con status en error HTTP", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "taken" }),
    } as Response)

    const err = await authApi
      .register("u", "u@e.com", "12345678")
      .then(
        () => {
          throw new Error("se esperaba ApiError")
        },
        (e: unknown) => e
      )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(400)
    expect((err as ApiError).message).toBe("taken")
  })
})

describe("messagesApi.getByGroup (fetch mockeado)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("extrae messages del envelope { messages, total }", async () => {
    const msg = {
      id: "m1",
      content: "hola",
      groupId: "g1",
      senderId: "s1",
      isEdited: false,
      createdAt: new Date().toISOString(),
    }
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [msg], total: 1 }),
    } as Response)

    const out = await messagesApi.getByGroup("g1", 50, 0)
    expect(out).toEqual([msg])
  })
})
