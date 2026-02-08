"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  X, 
  Loader2,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Competitor } from "@/components/competitor-card"

interface CompetitorFormProps {
  competitor?: Competitor | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { id: "multi", label: "Multi-purpose" },
  { id: "sleep", label: "Sleep" },
  { id: "focus", label: "Focus" },
  { id: "calm", label: "Calm" },
  { id: "general", label: "General" },
]

export function CompetitorForm({ competitor, onClose, onSuccess }: CompetitorFormProps) {
  const isEditing = !!competitor
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  
  // Form state - simplified to just URL and category for new competitors
  const [url, setUrl] = useState(competitor?.website_url || "")
  const [category, setCategory] = useState(competitor?.category || "multi")
  
  // Edit mode fields (shown only when editing)
  const [name, setName] = useState(competitor?.name || "")
  const [description, setDescription] = useState(competitor?.description || "")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus(null)
    
    if (isEditing) {
      // Editing existing competitor - use the regular update endpoint
      if (!name.trim()) {
        setError("Name is required")
        return
      }
      
      setIsSubmitting(true)
      
      try {
        const response = await fetch(`/api/competitors/${competitor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            category,
          }),
        })
        
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || "Failed to update competitor")
        }
        
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Adding new competitor - use AI scraping
      if (!url.trim()) {
        setError("URL is required")
        return
      }
      
      setIsSubmitting(true)
      setStatus("Fetching website...")
      
      try {
        // Add https:// if not present
        let cleanUrl = url.trim()
        if (!cleanUrl.startsWith('http')) {
          cleanUrl = `https://${cleanUrl}`
        }
        
        setStatus("Analyzing content with AI...")
        
        const response = await fetch("/api/competitors/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cleanUrl, category }),
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || "Failed to add competitor")
        }
        
        setStatus(`Added "${result.competitor.name}" successfully!`)
        
        // Wait a moment to show success message
        setTimeout(() => {
          onSuccess()
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setStatus(null)
      } finally {
        setIsSubmitting(false)
      }
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Globe className="h-5 w-5 text-neutral-600" />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-500" />
            )}
            <h2 className="text-[16px] font-semibold text-neutral-900">
              {isEditing ? "Edit Competitor" : "Add Competitor"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}
          
          {/* Status message */}
          {status && !error && (
            <div className={cn(
              "flex items-start gap-2 p-3 rounded-lg border",
              status.includes("success") 
                ? "bg-emerald-50 border-emerald-100" 
                : "bg-blue-50 border-blue-100"
            )}>
              {status.includes("success") ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />
              )}
              <p className={cn(
                "text-[13px]",
                status.includes("success") ? "text-emerald-700" : "text-blue-700"
              )}>
                {status}
              </p>
            </div>
          )}
          
          {isEditing ? (
            // Edit mode - show name and description fields
            <>
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Company Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ritual"
                  className="h-10 text-[14px]"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            // Add mode - just URL and category
            <>
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="ritual.com"
                    className="h-10 pl-10 text-[14px]"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-400">
                  AI will automatically extract company info, logo, and social links
                </p>
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Category (optional)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-neutral-400">
                  AI will suggest the best category based on the website content
                </p>
              </div>
            </>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 text-[13px] gap-2 bg-neutral-900 hover:bg-neutral-800 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditing ? "Saving..." : "Analyzing..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Add with AI
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
