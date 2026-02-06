"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"
import { UploadZone } from "@/components/upload-zone"
import { DocumentList } from "@/components/document-list"
import { DocumentPreview } from "@/components/document-preview"
import { GoogleDrivePicker } from "@/components/google-drive-picker"

// Load DocumentViewer only on client side (react-pdf requires browser APIs)
const DocumentViewer = dynamic(
  () => import("@/components/document-viewer").then(mod => mod.DocumentViewer),
  { ssr: false }
)
import { 
  Search, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  Loader2,
  Upload,
  X,
  ChevronDown,
  Trash2,
  CheckSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  name: string
  type: string
  size: number
  created_at: string
  summary?: string
  tags?: string[]
}

const PREDEFINED_TAGS = [
  "Marketing",
  "Product", 
  "Finance",
  "Legal",
  "Research",
  "Timeline",
  "Brand",
  "Operations",
  "Sales",
  "HR"
]

interface PickedFile {
  id: string
  name: string
  mimeType: string
}

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "size"
type ViewMode = "grid" | "list"

const FILE_TYPES = [
  { id: "all", label: "All" },
  { id: "PDF", label: "PDF" },
  { id: "Excel", label: "Excel" },
  { id: "CSV", label: "CSV" },
  { id: "Google Doc", label: "Docs" },
  { id: "Google Sheet", label: "Sheets" },
]

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
  { id: "size", label: "Largest first" },
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("docs-view-mode") as ViewMode) || "grid"
    }
    return "grid"
  })
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [contentPreview, setContentPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  
  // Deep search state
  const [searchResults, setSearchResults] = useState<Document[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Persist view mode
  useEffect(() => {
    localStorage.setItem("docs-view-mode", viewMode)
  }, [viewMode])

  const fetchDocuments = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch("/api/documents", {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error("Failed to fetch documents:", response.status)
        setDocuments([])
        return
      }
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("doc-search")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Deep search function
  const performDeepSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      } else {
        // Fallback to client-side filtering if search fails
        setSearchResults(null)
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    
    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    // If query is empty, clear search results immediately
    if (!value.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    // Debounce deep search (wait 300ms after typing stops)
    const timer = setTimeout(() => {
      performDeepSearch(value)
    }, 300)
    
    setSearchDebounceTimer(timer)
  }, [searchDebounceTimer, performDeepSearch])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
        if (selectedDocument?.id === id) {
          setSelectedDocument(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  }

  const handleDriveFilesSelected = async (files: PickedFile[], accessToken: string) => {
    setIsImporting(true)
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setImportStatus(`Importing ${i + 1}/${files.length}: ${file.name}`)

      try {
        const response = await fetch("/api/documents/import-drive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: [file], accessToken }),
        })

        const data = await response.json()

        if (response.ok && data.results?.[0]?.success) {
          successCount++
        } else {
          failCount++
          const error = data.results?.[0]?.error || data.error || "Unknown error"
          errors.push(`${file.name}: ${error}`)
        }
      } catch (error) {
        failCount++
        errors.push(`${file.name}: Network error`)
      }
    }

    let finalStatus = `Imported ${successCount} file(s)`
    if (failCount > 0) {
      finalStatus += `, ${failCount} failed`
    }
    
    setImportStatus(finalStatus)
    fetchDocuments()
    
    setTimeout(() => {
      setImportStatus(null)
      setShowUpload(false)
    }, 3000)
    setIsImporting(false)
  }

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    // Use search results if available (deep search was performed)
    let filtered = searchResults !== null ? [...searchResults] : [...documents]

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(doc => doc.type === selectedType)
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc => 
        selectedTags.some(tag => doc.tags?.includes(tag))
      )
    }

    // Sort (only if not using search results, which are already sorted by relevance)
    if (searchResults === null) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          case "name-asc":
            return a.name.localeCompare(b.name)
          case "name-desc":
            return b.name.localeCompare(a.name)
          case "size":
            return b.size - a.size
          default:
            return 0
        }
      })
    }

    return filtered
  }, [documents, searchResults, selectedType, selectedTags, sortBy])

  // Get available types from documents
  const availableTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.type))
    return FILE_TYPES.filter(t => t.id === "all" || types.has(t.id))
  }, [documents])

  // Get available tags from documents
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    documents.forEach(d => d.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [documents])

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Fetch content preview when document is selected
  const handleSelectDocument = useCallback(async (doc: Document) => {
    setSelectedDocument(doc)
    setContentPreview(null)
    setLoadingPreview(true)
    
    try {
      const response = await fetch(`/api/documents/preview?id=${doc.id}`)
      if (response.ok) {
        const data = await response.json()
        setContentPreview(data.preview || null)
      }
    } catch (error) {
      console.error("Failed to fetch preview:", error)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  // Open document in full viewer
  const handleOpenDocument = useCallback((doc: Document) => {
    setViewingDocument(doc)
  }, [])

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDocuments.map(d => d.id)))
    }
  }, [filteredDocuments, selectedIds.size])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Batch delete handler
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`
    )
    if (!confirmed) return

    setIsDeleting(true)
    const idsToDelete = Array.from(selectedIds)
    let successCount = 0

    for (const id of idsToDelete) {
      try {
        const response = await fetch(`/api/documents?id=${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          successCount++
        }
      } catch (error) {
        console.error(`Failed to delete document ${id}:`, error)
      }
    }

    // Refresh documents and clear selection
    await fetchDocuments()
    setSelectedIds(new Set())
    setSelectedDocument(null)
    setIsDeleting(false)
  }, [selectedIds, fetchDocuments])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Documents</h1>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in your library
            </p>
          </div>
          <Button 
            onClick={() => setShowUpload(!showUpload)}
            className="gap-2"
          >
            {showUpload ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {showUpload ? "Close" : "Upload"}
          </Button>
        </div>
      </div>

      {/* Upload Panel (collapsible) */}
      {showUpload && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <UploadZone onUploadComplete={() => {
              fetchDocuments()
              setShowUpload(false)
            }} />
            
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs text-neutral-400">or import from</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
            
            <div className="flex justify-center">
              <GoogleDrivePicker 
                onFilesSelected={handleDriveFilesSelected}
                disabled={isImporting}
              />
            </div>
            
            {importStatus && (
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
                {isImporting && <Loader2 className="h-3 w-3 animate-spin" />}
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="doc-search"
              type="text"
              placeholder="Search document contents... (⌘K)"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 h-9 text-[13px] bg-neutral-50 border-neutral-200 focus:bg-white"
            />
            {isSearching && (
              <Loader2 className="absolute right-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-neutral-400" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {/* Search status indicator */}
          {searchResults !== null && !isSearching && (
            <div className="text-[12px] text-neutral-500">
              <span className="font-medium text-neutral-700">{searchResults.length}</span> results for "{searchQuery}"
            </div>
          )}

          {/* View Toggle & Sort */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-[13px]"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showSortDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSortDropdown(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSortBy(option.id)
                          setShowSortDropdown(false)
                        }}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50",
                          sortBy === option.id && "bg-neutral-50 font-medium"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "grid" 
                    ? "bg-neutral-900 text-white" 
                    : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list" 
                    ? "bg-neutral-900 text-white" 
                    : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wide mr-1">Type:</span>
          {availableTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                selectedType === type.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {type.label}
              {type.id !== "all" && (
                <span className="ml-1.5 opacity-60">
                  {documents.filter(d => d.type === type.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tag Filter Chips */}
        {availableTags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wide mr-1">Tags:</span>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                )}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[11px] text-neutral-400 hover:text-neutral-600 ml-1"
              >
                Clear tags
              </button>
            )}
          </div>
        )}
      </div>

      {/* Document Grid/List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {documents.length === 0 ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                  <Upload className="h-7 w-7 text-neutral-400" />
                </div>
                <h3 className="mt-4 text-[15px] font-medium text-neutral-900">No documents yet</h3>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Upload PDFs, spreadsheets, or import from Google Drive
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </Button>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                  <Search className="h-7 w-7 text-neutral-400" />
                </div>
                <h3 className="mt-4 text-[15px] font-medium text-neutral-900">No matches found</h3>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Try adjusting your search or filters
                </p>
                <Button 
                  variant="outline"
                  className="mt-4" 
                  onClick={() => {
                    handleSearchChange("")
                    setSelectedType("all")
                    setSelectedTags([])
                  }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <DocumentList
            documents={filteredDocuments}
            onDelete={handleDelete}
            isLoading={false}
            viewMode={viewMode}
            onSelect={handleSelectDocument}
            onOpen={handleOpenDocument}
            selectedId={selectedDocument?.id}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectionMode={selectedIds.size > 0}
          />
        )}
      </div>

      {/* Batch Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-[13px]">
            <CheckSquare className="h-4 w-4 text-neutral-500" />
            <span className="font-medium text-neutral-900">{selectedIds.size}</span>
            <span className="text-neutral-500">selected</span>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] h-8"
            onClick={handleSelectAll}
          >
            {selectedIds.size === filteredDocuments.length ? "Deselect all" : "Select all"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] h-8"
            onClick={handleClearSelection}
          >
            Clear
          </Button>
          <div className="h-4 w-px bg-neutral-200" />
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-[13px] h-8"
            onClick={handleBatchDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete {selectedIds.size}
          </Button>
        </div>
      )}

      {/* Document Preview Sidebar */}
      {selectedDocument && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedDocument(null)}
          />
          <DocumentPreview
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDelete={handleDelete}
            onTagsUpdated={fetchDocuments}
            onOpenViewer={() => {
              setViewingDocument(selectedDocument)
              setSelectedDocument(null)
            }}
            contentPreview={contentPreview || undefined}
          />
        </>
      )}

      {/* Full Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          documentName={viewingDocument.name}
          documentType={viewingDocument.type}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  )
}
