"use client"

import { useState } from "react"
import { 
  FileText, 
  Trash2, 
  FileSpreadsheet, 
  File, 
  Loader2,
  MoreHorizontal,
  Eye,
  FileType,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface DocumentListProps {
  documents: Document[]
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
  viewMode?: "grid" | "list"
  onSelect?: (doc: Document) => void
  onOpen?: (doc: Document) => void
  selectedId?: string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  selectionMode?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getFileIcon(type: string) {
  switch (type) {
    case "PDF":
      return FileText
    case "Excel":
    case "CSV":
    case "Google Sheet":
      return FileSpreadsheet
    case "Google Doc":
      return FileType
    default:
      return File
  }
}

function getFileColors(type: string) {
  switch (type) {
    case "PDF":
      return { bg: "bg-red-50", text: "text-red-600", badge: "bg-red-100 text-red-700" }
    case "Excel":
    case "Google Sheet":
      return { bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" }
    case "CSV":
      return { bg: "bg-orange-50", text: "text-orange-600", badge: "bg-orange-100 text-orange-700" }
    case "Google Doc":
      return { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" }
    default:
      return { bg: "bg-neutral-50", text: "text-neutral-600", badge: "bg-neutral-100 text-neutral-700" }
  }
}

export function DocumentList({ 
  documents, 
  onDelete, 
  isLoading,
  viewMode = "grid",
  onSelect,
  onOpen,
  selectedId,
  selectedIds = new Set(),
  onToggleSelect,
  selectionMode = false
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const handleCheckboxClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect?.(id)
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeletingId(id)
    setMenuOpenId(null)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpen = (doc: Document, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setMenuOpenId(null)
    onOpen?.(doc)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-neutral-400" />
        <p className="mt-3 text-sm font-medium text-neutral-600">No documents yet</p>
        <p className="mt-1 text-xs text-neutral-500">
          Upload PDFs or spreadsheets to get started
        </p>
      </div>
    )
  }

  // Grid View
  if (viewMode === "grid") {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {documents.map((doc) => {
          const Icon = getFileIcon(doc.type)
          const colors = getFileColors(doc.type)
          const isDeleting = deletingId === doc.id
          const isSelected = selectedId === doc.id
          const isChecked = selectedIds.has(doc.id)

          return (
            <div
              key={doc.id}
              onClick={() => selectionMode ? onToggleSelect?.(doc.id) : onSelect?.(doc)}
              onDoubleClick={(e) => !selectionMode && handleOpen(doc, e)}
              className={cn(
                "group relative flex cursor-pointer flex-col rounded-xl border bg-white p-4 transition-all hover:shadow-md",
                isSelected && !selectionMode
                  ? "border-neutral-900 ring-1 ring-neutral-900" 
                  : isChecked
                  ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50"
                  : "border-neutral-200 hover:border-neutral-300",
                isDeleting && "opacity-50 pointer-events-none"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => handleCheckboxClick(doc.id, e)}
                className={cn(
                  "absolute top-3 left-3 flex h-5 w-5 items-center justify-center rounded border transition-all",
                  isChecked
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-neutral-300 bg-white opacity-0 group-hover:opacity-100",
                  selectionMode && "opacity-100"
                )}
              >
                {isChecked && <Check className="h-3 w-3" />}
              </button>

              {/* Icon and Menu */}
              <div className="flex items-start justify-between">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  colors.bg
                )}>
                  <Icon className={cn("h-6 w-6", colors.text)} />
                </div>
                
                {/* Menu Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(menuOpenId === doc.id ? null : doc.id)
                    }}
                    className="rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-neutral-100 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4 text-neutral-500" />
                  </button>
                  
                  {menuOpenId === doc.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(null)
                        }} 
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                        {onOpen && (
                          <button
                            onClick={(e) => handleOpen(doc, e)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(doc.id, e)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Document Info */}
              <div className="mt-4 flex-1">
                <h3 className="line-clamp-2 text-[14px] font-medium text-neutral-900 leading-tight">
                  {doc.name}
                </h3>
                {doc.summary && (
                  <p className="mt-1.5 line-clamp-2 text-[12px] text-neutral-500 leading-relaxed">
                    {doc.summary}
                  </p>
                )}
              </div>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {doc.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag}
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 2 && (
                    <span className="text-[10px] text-neutral-400">
                      +{doc.tags.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  colors.badge
                )}>
                  {doc.type}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {formatDate(doc.created_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // List View
  return (
    <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.type)
        const colors = getFileColors(doc.type)
        const isDeleting = deletingId === doc.id
        const isSelected = selectedId === doc.id
        const isChecked = selectedIds.has(doc.id)

        return (
          <div
            key={doc.id}
            onClick={() => selectionMode ? onToggleSelect?.(doc.id) : onSelect?.(doc)}
            onDoubleClick={(e) => !selectionMode && handleOpen(doc, e)}
            className={cn(
              "group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-50",
              isSelected && !selectionMode && "bg-neutral-50",
              isChecked && "bg-blue-50/50",
              isDeleting && "opacity-50 pointer-events-none"
            )}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => handleCheckboxClick(doc.id, e)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                isChecked
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-neutral-300 bg-white opacity-0 group-hover:opacity-100",
                selectionMode && "opacity-100"
              )}
            >
              {isChecked && <Check className="h-3 w-3" />}
            </button>

            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              colors.bg
            )}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="truncate text-[14px] font-medium text-neutral-900">
                {doc.name}
              </p>
              <p className="text-[12px] text-neutral-500">
                {doc.type} • {formatFileSize(doc.size)} • {formatDate(doc.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              {onOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-neutral-400 hover:text-neutral-600"
                  onClick={(e) => handleOpen(doc, e)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-neutral-400 hover:text-red-600"
                onClick={(e) => handleDelete(doc.id, e)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
