"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  ExternalLink, 
  Plus, 
  X, 
  Loader2,
  Sparkles,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Discovery {
  id: string
  brand_name: string
  website_url: string | null
  description: string | null
  source_url: string | null
  relevance_score: number | null
  scan_query: string | null
  scan_date: string
  status: string
}

interface DiscoveryListProps {
  discoveries: Discovery[]
  onAdd: (id: string, data?: Record<string, unknown>) => Promise<void>
  onDismiss: (id: string, reason?: string) => Promise<void>
}

export function DiscoveryList({ discoveries, onAdd, onDismiss }: DiscoveryListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [action, setAction] = useState<"add" | "dismiss" | null>(null)
  
  const handleAdd = async (discovery: Discovery) => {
    setProcessingId(discovery.id)
    setAction("add")
    try {
      await onAdd(discovery.id)
    } finally {
      setProcessingId(null)
      setAction(null)
    }
  }
  
  const handleDismiss = async (discovery: Discovery) => {
    setProcessingId(discovery.id)
    setAction("dismiss")
    try {
      await onDismiss(discovery.id)
    } finally {
      setProcessingId(null)
      setAction(null)
    }
  }
  
  if (discoveries.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-neutral-200 rounded-lg">
        <Sparkles className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
        <p className="text-[13px] text-neutral-500">No pending discoveries</p>
        <p className="text-[12px] text-neutral-400 mt-1">
          Run a scan to discover new competitors
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {discoveries.map(discovery => {
        const isProcessing = processingId === discovery.id
        
        return (
          <div
            key={discovery.id}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border border-neutral-200 bg-white transition-opacity",
              isProcessing && "opacity-50"
            )}
          >
            {/* Logo placeholder */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[14px] font-medium text-neutral-900">
                    {discovery.brand_name}
                  </h4>
                  {discovery.website_url && (
                    <a
                      href={discovery.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-700"
                    >
                      <Globe className="h-3 w-3" />
                      {discovery.website_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                
                {discovery.relevance_score !== null && (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {Math.round(discovery.relevance_score * 100)}% relevant
                  </span>
                )}
              </div>
              
              {discovery.description && (
                <p className="mt-2 text-[12px] text-neutral-500 line-clamp-2">
                  {discovery.description}
                </p>
              )}
              
              {discovery.scan_query && (
                <p className="mt-2 text-[10px] text-neutral-400">
                  Found via: "{discovery.scan_query}"
                </p>
              )}
              
              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAdd(discovery)}
                  disabled={isProcessing}
                  className="h-7 text-[11px] gap-1.5 bg-neutral-900 hover:bg-neutral-800"
                >
                  {isProcessing && action === "add" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Add as Competitor
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(discovery)}
                  disabled={isProcessing}
                  className="h-7 text-[11px] gap-1.5 text-neutral-500 hover:text-neutral-700"
                >
                  {isProcessing && action === "dismiss" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
