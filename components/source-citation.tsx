"use client"

import { useState } from "react"
import { FileText, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface Source {
  documentId: string
  documentName: string
  excerpt: string
  pageNumber?: number
}

interface SourceCitationProps {
  sources: Source[]
}

export function SourceCitation({ sources }: SourceCitationProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!sources || sources.length === 0) {
    return null
  }

  // Deduplicate sources by documentId
  const uniqueSources = sources.reduce((acc: Source[], source) => {
    if (!acc.find((s) => s.documentId === source.documentId)) {
      acc.push(source)
    }
    return acc
  }, [])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <FileText className="h-3 w-3" />
        <span>
          {uniqueSources.length} source{uniqueSources.length !== 1 ? "s" : ""}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {uniqueSources.map((source, index) => (
          <div
            key={`${source.documentId}-${index}`}
            className="rounded-md border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700">
                  {source.documentName}
                </span>
                {source.pageNumber && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                    Page {source.pageNumber}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              "{source.excerpt}"
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Inline badge for showing sources count
export function SourceBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      <FileText className="h-3 w-3" />
      {count} source{count !== 1 ? "s" : ""}
    </span>
  )
}
