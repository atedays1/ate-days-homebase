import { NextRequest, NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { createEmbedding, isOpenAIConfigured } from "@/lib/embeddings"
import { generateRAGResponse, isAnthropicConfigured, ChatContext } from "@/lib/anthropic"
import { getFullSheet, isServiceAccountConfigured } from "@/lib/google-sheets"
import { parseTimelineSheet } from "@/lib/timeline-parser"
import { MONTHS } from "@/lib/timeline-types"
import { requireAuth } from "@/lib/api-auth"

// Fetch timeline data from Google Sheets
async function getTimelineContext(): Promise<string | null> {
  try {
    // Get spreadsheet ID from settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "timeline_spreadsheet_id")
      .single()
    
    if (!setting?.value || !isServiceAccountConfigured()) {
      return null
    }
    
    const sheetData = await getFullSheet(setting.value)
    const timelineData = parseTimelineSheet(sheetData.values)
    
    if (!timelineData.tasks.length) return null
    
    // Format timeline as context
    const tasksByWorkstream: Record<string, any[]> = {}
    for (const task of timelineData.tasks) {
      if (!tasksByWorkstream[task.workstream]) {
        tasksByWorkstream[task.workstream] = []
      }
      tasksByWorkstream[task.workstream].push(task)
    }
    
    let context = "## COMPANY TIMELINE DATA\n\n"
    context += `Total tasks: ${timelineData.tasks.length}\n\n`
    
    for (const [workstream, tasks] of Object.entries(tasksByWorkstream)) {
      context += `### ${workstream.toUpperCase()} (${tasks.length} tasks)\n`
      for (const task of tasks) {
        const startMonth = MONTHS[task.startMonth] || "Unknown"
        const endMonth = MONTHS[task.endMonth] || startMonth
        const dateRange = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`
        context += `- ${task.name} [${dateRange}] (${task.status})\n`
      }
      context += "\n"
    }
    
    return context
  } catch (e) {
    console.error("[Chat] Error fetching timeline:", e)
    return null
  }
}

// Resolve document scope: documentIds array or documentFilter (e.g. recent 24h) to list of document IDs
async function resolveDocumentScope(
  documentIds?: string[],
  documentFilter?: { type: "recent"; hours: number }
): Promise<string[] | null> {
  if (documentIds && documentIds.length > 0) {
    return documentIds
  }
  if (documentFilter?.type === "recent" && documentFilter.hours > 0) {
    const since = new Date(Date.now() - documentFilter.hours * 60 * 60 * 1000).toISOString()
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[Chat] documentFilter resolve error:", error)
      return null
    }
    return (docs || []).map((d) => d.id)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const body = await request.json()
    const { query, documentIds: bodyDocumentIds, documentFilter } = body

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      )
    }

    // Check if services are configured
    if (!isSupabaseConfigured() || !isAnthropicConfigured()) {
      return NextResponse.json({
        content: "Services not configured. Check your environment variables.",
        sources: [],
      })
    }

    // Resolve document scope (specific IDs or "recent" filter)
    const scopeIds = await resolveDocumentScope(bodyDocumentIds, documentFilter)
    const hasScope = scopeIds && scopeIds.length > 0

    console.log("[Chat] Searching for:", query, hasScope ? `(scoped to ${scopeIds!.length} docs)` : "(all documents)")
    
    // Fetch timeline only when not scoped to specific documents
    const timelineContext = hasScope ? null : await getTimelineContext()
    console.log("[Chat] Timeline context:", timelineContext ? "loaded" : "not available")
    
    // Use hybrid search: keyword + semantic in parallel (optionally scoped)
    let chunks = await performHybridSearch(query, scopeIds)

    // When user scoped to specific doc(s) but query didn't match (e.g. "summarize this document"),
    // fallback to fetching chunks from those docs so we have context to summarize
    if (hasScope && scopeIds && (!chunks || chunks.length === 0)) {
      console.log("[Chat] No hybrid matches for scoped query; falling back to chunks from selected doc(s)")
      chunks = await getChunksFromDocuments(scopeIds, 20)
    }

    // If we have timeline but no doc chunks, we can still answer (when not scoped)
    if ((!chunks || chunks.length === 0) && !timelineContext) {
      return NextResponse.json({
        content: hasScope
          ? "No matching content found in the selected document(s). Try different documents or a broader question."
          : "No documents or timeline data found. Please upload documents or connect your timeline.",
        sources: [],
      })
    }

    // Build context for Claude
    const contexts: ChatContext[] = []
    
    // Add timeline as first context if available (only when not scoped)
    if (timelineContext) {
      contexts.push({
        documentId: "timeline",
        documentName: "Company Timeline (Google Sheets)",
        content: timelineContext,
        pageNumber: undefined,
      })
    }
    
    // Add document chunks
    if (chunks && chunks.length > 0) {
      const documentIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))]
      const { data: documents } = await supabase
        .from("documents")
        .select("id, name")
        .in("id", documentIds)

      const docNameMap = new Map(documents?.map((d) => [d.id, d.name]) || [])

      for (const chunk of chunks) {
        contexts.push({
          documentId: chunk.document_id,
          documentName: docNameMap.get(chunk.document_id) || "Unknown Document",
          content: chunk.content,
          pageNumber: chunk.page_number || undefined,
        })
      }
    }

    // Generate response with Claude
    const response = await generateRAGResponse(query, contexts)

    return NextResponse.json({
      content: response.content,
      sources: response.sources.map((s) => ({
        documentId: s.documentId,
        documentName: s.documentName,
        excerpt: s.content.substring(0, 200) + (s.content.length > 200 ? "..." : ""),
        pageNumber: s.pageNumber,
      })),
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    )
  }
}

// Hybrid search: combines keyword and semantic search for better coverage
async function performHybridSearch(query: string, documentIds: string[] | null = null): Promise<any[]> {
  const seenChunkIds = new Set<string>()
  const allChunks: any[] = []
  
  // Run keyword and semantic search in parallel (optionally scoped to documentIds)
  const [keywordChunks, semanticChunks] = await Promise.all([
    performKeywordSearch(query, documentIds),
    isOpenAIConfigured() ? performSemanticSearch(query, documentIds) : Promise.resolve([]),
  ])
  
  console.log("[Chat] Keyword search found", keywordChunks.length, "chunks")
  console.log("[Chat] Semantic search found", semanticChunks.length, "chunks")
  
  // Add keyword matches first (higher priority for exact matches)
  for (const chunk of keywordChunks) {
    if (!seenChunkIds.has(chunk.id)) {
      seenChunkIds.add(chunk.id)
      allChunks.push(chunk)
    }
  }
  
  // Add semantic matches
  for (const chunk of semanticChunks) {
    if (!seenChunkIds.has(chunk.id)) {
      seenChunkIds.add(chunk.id)
      allChunks.push(chunk)
    }
  }
  
  // Limit to top 15 chunks for context window
  return allChunks.slice(0, 15)
}

// Keyword search - finds exact text matches
async function performKeywordSearch(query: string, documentIds: string[] | null = null): Promise<any[]> {
  try {
    let q = supabase
      .from("document_chunks")
      .select("id, document_id, content, page_number")
      .ilike("content", `%${query}%`)
      .limit(20)
    if (documentIds && documentIds.length > 0) {
      q = q.in("document_id", documentIds)
    }
    const { data: chunks, error } = await q
    
    if (error) {
      console.error("[Chat] Keyword search error:", error)
      return []
    }
    
    return chunks || []
  } catch (e) {
    console.error("[Chat] Keyword search exception:", e)
    return []
  }
}

// Semantic search - finds conceptually similar content
async function performSemanticSearch(query: string, documentIds: string[] | null = null): Promise<any[]> {
  try {
    const queryEmbedding = await createEmbedding(query)
    const params: Record<string, unknown> = {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 10,
    }
    const rpcName = documentIds && documentIds.length > 0 ? "match_document_chunks_filtered" : "match_document_chunks"
    if (rpcName === "match_document_chunks_filtered") {
      params.document_ids = documentIds
    }
    const { data: chunks, error } = await supabase.rpc(rpcName, params)
    
    if (error) {
      console.error("[Chat] Semantic search error:", error)
      return []
    }
    
    return chunks || []
  } catch (e) {
    console.error("[Chat] Semantic search exception:", e)
    return []
  }
}

// Fallback: get chunks from selected documents without query matching (for "summarize this document" etc.)
async function getChunksFromDocuments(documentIds: string[], limit: number): Promise<any[]> {
  try {
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("id, document_id, content, page_number")
      .in("document_id", documentIds)
      .order("document_id", { ascending: true })
      .order("page_number", { ascending: true, nullsFirst: false })
      .limit(limit)
    if (error) {
      console.error("[Chat] getChunksFromDocuments error:", error)
      return []
    }
    return chunks || []
  } catch (e) {
    console.error("[Chat] getChunksFromDocuments exception:", e)
    return []
  }
}
