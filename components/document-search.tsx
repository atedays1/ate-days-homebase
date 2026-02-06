"use client"

import { useState, FormEvent, useEffect } from "react"
import { Search, Loader2, FileText, ExternalLink, ChevronDown, ChevronUp, Eye, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import dynamic from "next/dynamic"

// Load DocumentViewer only on client side
const DocumentViewer = dynamic(
  () => import("@/components/document-viewer").then(mod => mod.DocumentViewer),
  { ssr: false }
)

interface Source {
  documentId: string
  documentName: string
  excerpt: string
  pageNumber?: number
}

interface SearchResult {
  content: string
  sources: Source[]
}

interface ViewingDocument {
  id: string
  name: string
  type: string
}

export function DocumentSearch() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingDocument, setViewingDocument] = useState<ViewingDocument | null>(null)
  const [documentTypes, setDocumentTypes] = useState<Record<string, string>>({})

  // Fetch document types when sources change
  useEffect(() => {
    if (!result?.sources) return
    
    const fetchTypes = async () => {
      const ids = result.sources
        .filter(s => s.documentId !== "timeline")
        .map(s => s.documentId)
      
      if (ids.length === 0) return
      
      try {
        const response = await fetch(`/api/documents?ids=${ids.join(",")}`)
        if (response.ok) {
          const data = await response.json()
          const types: Record<string, string> = {}
          for (const doc of data.documents || []) {
            types[doc.id] = doc.type
          }
          setDocumentTypes(types)
        }
      } catch (err) {
        console.error("Failed to fetch document types:", err)
      }
    }
    
    fetchTypes()
  }, [result?.sources])

  const handleOpenDocument = (source: Source) => {
    // Don't open timeline as a document
    if (source.documentId === "timeline") return
    
    setViewingDocument({
      id: source.documentId,
      name: source.documentName,
      type: documentTypes[source.documentId] || "PDF",
    })
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) return

    setIsSearching(true)
    setResult(null)
    setError(null)
    setShowSources(false)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search documents. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery("")
    setResult(null)
    setError(null)
    setShowSources(false)
  }

  return (
    <Card className="border border-neutral-200/60 shadow-none bg-white">
      <CardContent className="p-5">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
            <Search className="h-4 w-4 text-neutral-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-neutral-900">Ask Anything</h3>
            <p className="text-[11px] text-neutral-400">Search all documents and planning timelines</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="What's our target market? What ingredients are we using?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 text-[13px] pr-10 bg-white border-neutral-200 focus:border-neutral-400 focus:ring-neutral-200 placeholder:text-neutral-400"
              disabled={isSearching}
            />
            {query && !isSearching && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                ×
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isSearching || !query.trim()}
            className="h-9 px-4 text-[13px] bg-neutral-900 hover:bg-neutral-800"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </form>

        {/* Error State */}
        {error && (
          <div className="mt-4 p-3 bg-red-50/50 border border-red-100 rounded-lg text-[12px] text-red-600">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-4 space-y-3">
            {/* Answer */}
            <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-lg">
              <p className="text-[13px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {result.content}
              </p>
            </div>

            {/* Sources Toggle */}
            {result.sources && result.sources.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showSources ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {result.sources.length} source{result.sources.length !== 1 ? "s" : ""}
                </button>

                {/* Sources List */}
                {showSources && (
                  <div className="mt-2 space-y-2">
                    {result.sources.map((source, i) => {
                      const isTimeline = source.documentId === "timeline"
                      const isClickable = !isTimeline
                      
                      return (
                        <div
                          key={`${source.documentId}-${i}`}
                          onClick={() => isClickable && handleOpenDocument(source)}
                          className={`p-3 bg-neutral-50/50 border border-neutral-100 rounded-lg transition-colors ${
                            isClickable 
                              ? "cursor-pointer hover:bg-neutral-100/50 hover:border-neutral-200" 
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {isTimeline ? (
                                <Table className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <FileText className="h-3 w-3 text-neutral-400" />
                              )}
                              <span className="text-[11px] font-medium text-neutral-600">
                                {source.documentName}
                              </span>
                              {source.pageNumber && (
                                <span className="text-[10px] text-neutral-400">
                                  Page {source.pageNumber}
                                </span>
                              )}
                            </div>
                            {isClickable && (
                              <Eye className="h-3 w-3 text-neutral-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-2">
                            {source.excerpt}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Link to Knowledge Base */}
            <div className="pt-3 border-t border-neutral-100">
              <Link
                href={`/knowledge-base?q=${encodeURIComponent(query)}`}
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Continue in Knowledge Base
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {viewingDocument && (
          <DocumentViewer
            documentId={viewingDocument.id}
            documentName={viewingDocument.name}
            documentType={viewingDocument.type}
            onClose={() => setViewingDocument(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
