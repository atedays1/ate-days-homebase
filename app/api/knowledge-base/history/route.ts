import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { createServiceClient } from "@/lib/supabase-server"

interface HistoryMessageInput {
  role: "user" | "assistant"
  content: string
  sources?: unknown
}

async function ensureConversation(serviceClient: Awaited<ReturnType<typeof createServiceClient>>, userEmail: string) {
  const { data: existing, error: findError } = await serviceClient
    .from("kb_conversations")
    .select("id")
    .eq("user_email", userEmail)
    .maybeSingle()

  if (findError) throw findError
  if (existing?.id) return existing.id as string

  const { data: created, error: createError } = await serviceClient
    .from("kb_conversations")
    .insert({ user_email: userEmail, title: "Knowledge Base Chat" })
    .select("id")
    .single()

  if (createError || !created?.id) throw createError || new Error("Failed to create conversation")
  return created.id as string
}

export async function GET() {
  try {
    const auth = await requireAuth()
    const serviceClient = await createServiceClient()
    const conversationId = await ensureConversation(serviceClient, auth.user.email)

    const { data: messages, error } = await serviceClient
      .from("kb_messages")
      .select("id, role, content, sources, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Failed to fetch KB history:", error)
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("KB history GET error:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const serviceClient = await createServiceClient()
    const body = (await request.json()) as { messages?: HistoryMessageInput[] }
    const incoming = Array.isArray(body.messages) ? body.messages : []

    const validMessages = incoming.filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0
    )

    if (validMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages to persist" }, { status: 400 })
    }

    const conversationId = await ensureConversation(serviceClient, auth.user.email)
    const rows = validMessages.map((m) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.content,
      sources: m.sources ?? null,
    }))

    const { error: insertError } = await serviceClient.from("kb_messages").insert(rows)
    if (insertError) {
      console.error("Failed to persist KB history:", insertError)
      return NextResponse.json({ error: "Failed to persist history" }, { status: 500 })
    }

    await serviceClient
      .from("kb_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("KB history POST error:", error)
    return NextResponse.json({ error: "Failed to persist history" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const auth = await requireAuth()
    const serviceClient = await createServiceClient()
    const conversationId = await ensureConversation(serviceClient, auth.user.email)

    const { error } = await serviceClient
      .from("kb_messages")
      .delete()
      .eq("conversation_id", conversationId)

    if (error) {
      console.error("Failed to clear KB history:", error)
      return NextResponse.json({ error: "Failed to clear history" }, { status: 500 })
    }

    await serviceClient
      .from("kb_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("KB history DELETE error:", error)
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 })
  }
}
