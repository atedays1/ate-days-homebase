"use client"

import { useState } from "react"
import { FileText, Trash2, FileSpreadsheet, File, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  name: string
  type: string
  size: number
  created_at: string
}

interface DocumentListProps {
  documents: Document[]
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
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
      return FileSpreadsheet
    default:
      return File
  }
}

export function DocumentList({ documents, onDelete, isLoading }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">No documents yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Upload PDFs or spreadsheets to get started
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.type)
        const isDeleting = deletingId === doc.id

        return (
          <div
            key={doc.id}
            className={cn(
              "flex items-center gap-4 px-4 py-3 transition-colors",
              isDeleting && "opacity-50"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                doc.type === "PDF" && "bg-red-50",
                (doc.type === "Excel" || doc.type === "CSV") && "bg-emerald-50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  doc.type === "PDF" && "text-red-600",
                  (doc.type === "Excel" || doc.type === "CSV") && "text-emerald-600"
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {doc.name}
              </p>
              <p className="text-xs text-slate-500">
                {doc.type} • {formatFileSize(doc.size)} • {formatDate(doc.created_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-600"
              onClick={() => handleDelete(doc.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
