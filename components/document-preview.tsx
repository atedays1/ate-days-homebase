"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  File,
  FileType,
  Calendar,
  HardDrive,
  Trash2,
  MessageSquare,
  Loader2,
  ChevronRight,
  Eye
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

interface DocumentPreviewProps {
  document: Document | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onTagsUpdated?: () => void
  onOpenViewer?: () => void
  contentPreview?: string
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
    weekday: "short",
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
      return { bg: "bg-red-50", text: "text-red-600" }
    case "Excel":
    case "Google Sheet":
      return { bg: "bg-emerald-50", text: "text-emerald-600" }
    case "CSV":
      return { bg: "bg-orange-50", text: "text-orange-600" }
    case "Google Doc":
      return { bg: "bg-blue-50", text: "text-blue-600" }
    default:
      return { bg: "bg-neutral-50", text: "text-neutral-600" }
  }
}

export function DocumentPreview({ 
  document, 
  onClose, 
  onDelete,
  onTagsUpdated,
  onOpenViewer,
  contentPreview 
}: DocumentPreviewProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>(document?.tags || [])

  // Update current tags when document changes
  useState(() => {
    setCurrentTags(document?.tags || [])
  })

  if (!document) return null

  const Icon = getFileIcon(document.type)
  const colors = getFileColors(document.type)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(document.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTag = async (tag: string) => {
    if (currentTags.includes(tag)) return
    
    try {
      const response = await fetch("/api/documents/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id, tag })
      })
      
      if (response.ok) {
        setCurrentTags(prev => [...prev, tag])
        onTagsUpdated?.()
      }
    } catch (error) {
      console.error("Failed to add tag:", error)
    }
  }

  const handleRemoveTag = async (tag: string) => {
    try {
      const response = await fetch(
        `/api/documents/tags?documentId=${document.id}&tag=${encodeURIComponent(tag)}`,
        { method: "DELETE" }
      )
      
      if (response.ok) {
        setCurrentTags(prev => prev.filter(t => t !== tag))
        onTagsUpdated?.()
      }
    } catch (error) {
      console.error("Failed to remove tag:", error)
    }
  }

  const availableTagsToAdd = PREDEFINED_TAGS.filter(t => !currentTags.includes(t))

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h2 className="text-[14px] font-medium text-neutral-900">Document Details</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Document Icon & Name */}
        <div className="border-b border-neutral-100 px-4 py-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
              colors.bg
            )}>
              <Icon className={cn("h-7 w-7", colors.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-neutral-900 leading-tight">
                {document.name}
              </h3>
              <p className="mt-1 text-[13px] text-neutral-500">
                {document.type} document
              </p>
            </div>
          </div>
          
          {/* Open Document Button */}
          {onOpenViewer && (
            <Button
              onClick={onOpenViewer}
              className="w-full mt-4 gap-2"
            >
              <Eye className="h-4 w-4" />
              Open Document
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="border-b border-neutral-100 px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Uploaded</p>
                <p className="text-[13px] text-neutral-900">{formatDate(document.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Size</p>
                <p className="text-[13px] text-neutral-900">{formatFileSize(document.size)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="border-b border-neutral-100 px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
              Tags
            </h4>
            <div className="relative">
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="text-[11px] text-neutral-500 hover:text-neutral-700"
              >
                + Add tag
              </button>
              {showTagMenu && availableTagsToAdd.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowTagMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-36 max-h-48 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {availableTagsToAdd.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          handleAddTag(tag)
                          setShowTagMenu(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {currentTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {currentTags.map(tag => (
                <span 
                  key={tag}
                  className="group flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-neutral-400">No tags yet</p>
          )}
        </div>

        {/* AI Summary */}
        {document.summary && (
          <div className="border-b border-neutral-100 px-4 py-4">
            <h4 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
              AI Summary
            </h4>
            <p className="text-[13px] text-neutral-700 leading-relaxed">
              {document.summary}
            </p>
          </div>
        )}

        {/* Content Preview */}
        {contentPreview && (
          <div className="border-b border-neutral-100 px-4 py-4">
            <h4 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
              Content Preview
            </h4>
            <div className="rounded-lg bg-neutral-50 p-3 max-h-64 overflow-y-auto">
              <p className="text-[12px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {contentPreview}
              </p>
            </div>
          </div>
        )}

        {/* Ask About Document */}
        <div className="px-4 py-4">
          <Link
            href={`/knowledge-base?doc=${encodeURIComponent(document.name)}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition-colors hover:bg-neutral-100"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-neutral-500" />
              <span className="text-[13px] font-medium text-neutral-700">
                Ask about this document
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          </Link>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-neutral-200 px-4 py-3">
        <Button
          variant="outline"
          className="w-full justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete Document
        </Button>
      </div>
    </div>
  )
}
