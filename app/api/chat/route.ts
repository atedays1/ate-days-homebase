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

export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const { query } = await request.json()

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

    console.log("[Chat] Searching for:", query)
    
    // Fetch timeline data
    const timelineContext = await getTimelineContext()
    console.log("[Chat] Timeline context:", timelineContext ? "loaded" : "not available")
    
    // Use hybrid search: keyword + semantic in parallel
    const chunks = await performHybridSearch(query)

    // If we have timeline but no doc chunks, we can still answer
    if ((!chunks || chunks.length === 0) && !timelineContext) {
      return NextResponse.json({
        content: "No documents or timeline data found. Please upload documents or connect your timeline.",
        sources: [],
      })
    }

    // Build context for Claude
    const contexts: ChatContext[] = []
    
    // Add timeline as first context if available
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
async function performHybridSearch(query: string): Promise<any[]> {
  const seenChunkIds = new Set<string>()
  const allChunks: any[] = []
  
  // Run keyword and semantic search in parallel
  const [keywordChunks, semanticChunks] = await Promise.all([
    performKeywordSearch(query),
    isOpenAIConfigured() ? performSemanticSearch(query) : Promise.resolve([]),
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
async function performKeywordSearch(query: string): Promise<any[]> {
  try {
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("id, document_id, content, page_number")
      .ilike("content", `%${query}%`)
      .limit(20)
    
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
async function performSemanticSearch(query: string): Promise<any[]> {
  try {
    const queryEmbedding = await createEmbedding(query)
    const { data: chunks, error } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 10,
      }
    )
    
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
