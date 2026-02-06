import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createEmbedding, isOpenAIConfigured } from "@/lib/embeddings"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Check if OpenAI is configured for semantic search
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "Search not configured (OpenAI API key required)" },
        { status: 500 }
      )
    }

    // Create embedding for the search query
    const queryEmbedding = await createEmbedding(query)

    // Search document chunks using vector similarity
    const { data: matches, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Lower threshold for broader results
      match_count: 20,
    })

    if (error) {
      console.error("Search error:", error)
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      )
    }

    // Get unique document IDs from matches
    const documentIds = [...new Set(matches.map((m: any) => m.document_id))]

    if (documentIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Fetch full document details
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .in("id", documentIds)

    if (docsError) {
      console.error("Error fetching documents:", docsError)
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      )
    }

    // Fetch tags for these documents
    const { data: tags } = await supabase
      .from("document_tags")
      .select("document_id, tag")
      .in("document_id", documentIds)

    // Map tags to documents
    const tagsByDoc = (tags || []).reduce((acc, t) => {
      if (!acc[t.document_id]) acc[t.document_id] = []
      acc[t.document_id].push(t.tag)
      return acc
    }, {} as Record<string, string[]>)

    // Calculate relevance score for each document (sum of chunk similarities)
    const docScores = matches.reduce((acc: Record<string, number>, match: any) => {
      acc[match.document_id] = (acc[match.document_id] || 0) + match.similarity
      return acc
    }, {})

    // Get preview snippets for each document
    const docSnippets = matches.reduce((acc: Record<string, string>, match: any) => {
      if (!acc[match.document_id]) {
        // Get a snippet around the match
        const content = match.content || ""
        acc[match.document_id] = content.slice(0, 200) + (content.length > 200 ? "..." : "")
      }
      return acc
    }, {})

    // Sort documents by relevance score and add metadata
    const results = (documents || [])
      .map(doc => ({
        ...doc,
        tags: tagsByDoc[doc.id] || [],
        relevanceScore: docScores[doc.id] || 0,
        matchSnippet: docSnippets[doc.id] || null,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({ 
      results,
      query,
      totalMatches: matches.length 
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}
