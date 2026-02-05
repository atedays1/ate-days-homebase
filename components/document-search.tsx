"use client"

import { useState, FormEvent } from "react"
import { Search, Loader2, FileText, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

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

export function DocumentSearch() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
                    {result.sources.map((source, i) => (
                      <div
                        key={`${source.documentId}-${i}`}
                        className="p-3 bg-neutral-50/50 border border-neutral-100 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3 w-3 text-neutral-400" />
                          <span className="text-[11px] font-medium text-neutral-600">
                            {source.documentName}
                          </span>
                          {source.pageNumber && (
                            <span className="text-[10px] text-neutral-400">
                              Page {source.pageNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">
                          {source.excerpt}
                        </p>
                      </div>
                    ))}
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
      </CardContent>
    </Card>
  )
}
