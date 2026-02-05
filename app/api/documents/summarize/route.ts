import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateDocumentSummary, isAnthropicConfigured } from "@/lib/anthropic"
import { requireAuth } from "@/lib/api-auth"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/documents/summarize - Generate and store document summary
export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    // Check if Anthropic is configured
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      )
    }

    // Fetch all documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, name")
      .order("created_at", { ascending: false })

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`)
    }

    if (!documents || documents.length === 0) {
      // No documents - store empty summary
      const emptySummary = {
        summary_type: "main",
        executive_summary: "No documents have been uploaded yet. Upload company documents to generate insights.",
        key_insights: [],
        action_items: [],
        key_themes: [],
        important_dates: [],
        document_count: 0,
        generated_at: new Date().toISOString(),
      }

      const { error: upsertError } = await supabase
        .from("document_summary")
        .upsert(emptySummary, { onConflict: "summary_type" })

      if (upsertError) {
        throw new Error(`Failed to store summary: ${upsertError.message}`)
      }

      return NextResponse.json({ success: true, summary: emptySummary })
    }

    // Fetch representative chunks from each document (max 3 chunks per doc, max 50 total)
    const documentChunks: { content: string; documentName: string }[] = []
    const maxChunksPerDoc = 3
    const maxTotalChunks = 50

    for (const doc of documents) {
      if (documentChunks.length >= maxTotalChunks) break

      const { data: chunks, error: chunksError } = await supabase
        .from("document_chunks")
        .select("content")
        .eq("document_id", doc.id)
        .order("page_number", { ascending: true })
        .limit(maxChunksPerDoc)

      if (chunksError) {
        console.error(`Error fetching chunks for ${doc.name}:`, chunksError)
        continue
      }

      if (chunks) {
        for (const chunk of chunks) {
          documentChunks.push({
            content: chunk.content,
            documentName: doc.name,
          })
        }
      }
    }

    if (documentChunks.length === 0) {
      return NextResponse.json(
        { error: "No document content found to summarize" },
        { status: 400 }
      )
    }

    // Generate summary using Claude
    console.log("[Summarize] Generating summary from", documentChunks.length, "chunks")
    const summary = await generateDocumentSummary(documentChunks)
    console.log("[Summarize] Generated summary with", summary.key_insights?.length || 0, "insights")

    // Store in database - delete old first to ensure clean update
    await supabase
      .from("document_summary")
      .delete()
      .eq("summary_type", "main")
    
    const summaryRecord = {
      summary_type: "main",
      executive_summary: summary.executive_summary,
      key_insights: summary.key_insights || [],
      action_items: summary.action_items || [],
      key_themes: summary.key_themes || [],
      important_dates: summary.important_dates || [],
      document_count: documents.length,
      generated_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase
      .from("document_summary")
      .insert(summaryRecord)

    if (insertError) {
      console.error("[Summarize] Insert error:", insertError)
      throw new Error(`Failed to store summary: ${insertError.message}`)
    }
    
    console.log("[Summarize] Summary saved successfully")

    return NextResponse.json({ success: true, summary: summaryRecord })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error generating summary:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate summary" },
      { status: 500 }
    )
  }
}
