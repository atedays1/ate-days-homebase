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

    const trimmedQuery = query.trim()
    
    // Run keyword search and semantic search in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      // 1. Keyword search - find exact matches in document chunks
      performKeywordSearch(trimmedQuery),
      // 2. Semantic search - find conceptually similar content
      isOpenAIConfigured() ? performSemanticSearch(trimmedQuery) : Promise.resolve({ matches: [], error: null }),
    ])

    // Merge results from both searches
    const allDocumentIds = new Set<string>()
    const docScores: Record<string, number> = {}
    const docSnippets: Record<string, string> = {}
    const docMatchTypes: Record<string, string[]> = {}

    // Process keyword matches (higher weight for exact matches)
    for (const match of keywordResults.matches) {
      allDocumentIds.add(match.document_id)
      // Keyword matches get a base score of 1.0 per match
      docScores[match.document_id] = (docScores[match.document_id] || 0) + 1.0
      
      if (!docSnippets[match.document_id]) {
        // Try to highlight the match in context
        const content = match.content || ""
        const lowerContent = content.toLowerCase()
        const lowerQuery = trimmedQuery.toLowerCase()
        const matchIndex = lowerContent.indexOf(lowerQuery)
        
        if (matchIndex !== -1) {
          // Show context around the match
          const start = Math.max(0, matchIndex - 50)
          const end = Math.min(content.length, matchIndex + trimmedQuery.length + 150)
          const snippet = (start > 0 ? "..." : "") + 
                         content.slice(start, end) + 
                         (end < content.length ? "..." : "")
          docSnippets[match.document_id] = snippet
        } else {
          docSnippets[match.document_id] = content.slice(0, 200) + (content.length > 200 ? "..." : "")
        }
      }
      
      if (!docMatchTypes[match.document_id]) docMatchTypes[match.document_id] = []
      if (!docMatchTypes[match.document_id].includes("keyword")) {
        docMatchTypes[match.document_id].push("keyword")
      }
    }

    // Process semantic matches
    for (const match of semanticResults.matches) {
      allDocumentIds.add(match.document_id)
      // Semantic matches use their similarity score (0-1)
      docScores[match.document_id] = (docScores[match.document_id] || 0) + (match.similarity * 0.8)
      
      if (!docSnippets[match.document_id]) {
        const content = match.content || ""
        docSnippets[match.document_id] = content.slice(0, 200) + (content.length > 200 ? "..." : "")
      }
      
      if (!docMatchTypes[match.document_id]) docMatchTypes[match.document_id] = []
      if (!docMatchTypes[match.document_id].includes("semantic")) {
        docMatchTypes[match.document_id].push("semantic")
      }
    }

    if (allDocumentIds.size === 0) {
      return NextResponse.json({ results: [], query, totalMatches: 0 })
    }

    // Fetch full document details
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .in("id", Array.from(allDocumentIds))

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
      .in("document_id", Array.from(allDocumentIds))

    // Map tags to documents
    const tagsByDoc = (tags || []).reduce((acc, t) => {
      if (!acc[t.document_id]) acc[t.document_id] = []
      acc[t.document_id].push(t.tag)
      return acc
    }, {} as Record<string, string[]>)

    // Sort documents by relevance score and add metadata
    const results = (documents || [])
      .map(doc => ({
        ...doc,
        tags: tagsByDoc[doc.id] || [],
        relevanceScore: docScores[doc.id] || 0,
        matchSnippet: docSnippets[doc.id] || null,
        matchTypes: docMatchTypes[doc.id] || [],
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({ 
      results,
      query,
      totalMatches: keywordResults.matches.length + semanticResults.matches.length,
      keywordMatches: keywordResults.matches.length,
      semanticMatches: semanticResults.matches.length,
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

// Keyword search - finds exact text matches in document chunks
async function performKeywordSearch(query: string): Promise<{ matches: any[], error: any }> {
  try {
    // Search for the query in chunk content using case-insensitive match
    const { data: matches, error } = await supabase
      .from("document_chunks")
      .select("id, document_id, content, page_number")
      .ilike("content", `%${query}%`)
      .limit(50)

    if (error) {
      console.error("Keyword search error:", error)
      return { matches: [], error }
    }

    return { matches: matches || [], error: null }
  } catch (err) {
    console.error("Keyword search exception:", err)
    return { matches: [], error: err }
  }
}

// Semantic search - finds conceptually similar content using embeddings
async function performSemanticSearch(query: string): Promise<{ matches: any[], error: any }> {
  try {
    const queryEmbedding = await createEmbedding(query)

    const { data: matches, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 20,
    })

    if (error) {
      console.error("Semantic search error:", error)
      return { matches: [], error }
    }

    return { matches: matches || [], error: null }
  } catch (err) {
    console.error("Semantic search exception:", err)
    return { matches: [], error: err }
  }
}
