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
  AlertCircle,
  List,
  Link2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Competitor } from "@/components/competitor-card"

interface CompetitorFormProps {
  competitor?: Competitor | null
  onClose: () => void
  onSuccess: () => void
}

interface BulkResult {
  url: string
  success: boolean
  name?: string
  error?: string
}

const CATEGORIES = [
  { id: "multi", label: "Multi-purpose" },
  { id: "sleep", label: "Sleep" },
  { id: "focus", label: "Focus" },
  { id: "calm", label: "Calm" },
  { id: "general", label: "General" },
]

// Parse URLs from pasted text (handles newlines, commas, spaces)
function parseUrls(text: string): string[] {
  return text
    .split(/[\n,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(s))
}

export function CompetitorForm({ competitor, onClose, onSuccess }: CompetitorFormProps) {
  const isEditing = !!competitor
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  
  // Mode toggle (single vs bulk)
  const [bulkMode, setBulkMode] = useState(false)
  
  // Form state - simplified to just URL and category for new competitors
  const [url, setUrl] = useState(competitor?.website_url || "")
  const [bulkUrls, setBulkUrls] = useState("")
  const [category, setCategory] = useState(competitor?.category || "multi")
  
  // Bulk processing state
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalUrls, setTotalUrls] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  
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
    } else if (bulkMode) {
      // Bulk import mode
      const urls = parseUrls(bulkUrls)
      
      if (urls.length === 0) {
        setError("No valid URLs found. Please paste one URL per line.")
        return
      }
      
      setIsSubmitting(true)
      setBulkResults([])
      setTotalUrls(urls.length)
      setCurrentIndex(0)
      setIsComplete(false)
      
      const results: BulkResult[] = []
      
      for (let i = 0; i < urls.length; i++) {
        setCurrentIndex(i + 1)
        setStatus(`Processing ${i + 1} of ${urls.length}...`)
        
        let cleanUrl = urls[i].trim()
        if (!cleanUrl.startsWith('http')) {
          cleanUrl = `https://${cleanUrl}`
        }
        
        try {
          const response = await fetch("/api/competitors/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: cleanUrl, category }),
          })
          
          const result = await response.json()
          
          if (!response.ok) {
            results.push({
              url: cleanUrl,
              success: false,
              error: result.error || "Failed to add",
            })
          } else {
            results.push({
              url: cleanUrl,
              success: true,
              name: result.competitor?.name,
            })
          }
        } catch (err) {
          results.push({
            url: cleanUrl,
            success: false,
            error: err instanceof Error ? err.message : "Network error",
          })
        }
        
        setBulkResults([...results])
      }
      
      setIsSubmitting(false)
      setIsComplete(true)
      setStatus(null)
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      if (successCount > 0) {
        setStatus(`Added ${successCount} competitor${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`)
      } else {
        setError(`Failed to add any competitors. ${failCount} error${failCount > 1 ? 's' : ''}.`)
      }
    } else {
      // Adding new competitor - use AI scraping (single URL)
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
  
  const handleDone = () => {
    onSuccess()
  }
  
  const successCount = bulkResults.filter(r => r.success).length
  const failCount = bulkResults.filter(r => !r.success).length
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Globe className="h-5 w-5 text-neutral-600" />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-500" />
            )}
            <h2 className="text-[16px] font-semibold text-neutral-900">
              {isEditing ? "Edit Competitor" : bulkMode ? "Bulk Import" : "Add Competitor"}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
              status.includes("Added") 
                ? "bg-emerald-50 border-emerald-100" 
                : "bg-blue-50 border-blue-100"
            )}>
              {status.includes("Added") ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />
              )}
              <p className={cn(
                "text-[13px]",
                status.includes("Added") ? "text-emerald-700" : "text-blue-700"
              )}>
                {status}
              </p>
            </div>
          )}
          
          {/* Bulk results */}
          {bulkMode && bulkResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bulkResults.map((result, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg text-[12px]",
                    result.success 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "bg-red-50 text-red-700"
                  )}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {result.success ? result.name : new URL(result.url).hostname}
                    </p>
                    {!result.success && result.error && (
                      <p className="text-[11px] opacity-75 truncate">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress bar for bulk mode */}
          {bulkMode && isSubmitting && totalUrls > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-neutral-900 transition-all duration-300"
                  style={{ width: `${(currentIndex / totalUrls) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 text-center">
                {currentIndex} of {totalUrls}
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
          ) : isComplete ? (
            // Bulk complete - show summary
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                {successCount > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-[14px] font-medium">{successCount} added</span>
                  </div>
                )}
                {failCount > 0 && (
                  <div className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-[14px] font-medium">{failCount} failed</span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleDone}
                className="h-10 text-[13px] bg-neutral-900 hover:bg-neutral-800"
              >
                Done
              </Button>
            </div>
          ) : (
            // Add mode - URL input (single or bulk)
            <>
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-neutral-200 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                    !bulkMode 
                      ? "bg-neutral-900 text-white" 
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Single URL
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode(true)}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                    bulkMode 
                      ? "bg-neutral-900 text-white" 
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Bulk Import
                </button>
              </div>
              
              {bulkMode ? (
                // Bulk URL textarea
                <div>
                  <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                    Website URLs
                  </label>
                  <textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="Paste URLs here, one per line...

ritual.com
careofvitamins.com
hum.com"
                    rows={6}
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none disabled:opacity-50"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    {parseUrls(bulkUrls).length} URL{parseUrls(bulkUrls).length !== 1 ? 's' : ''} detected
                  </p>
                </div>
              ) : (
                // Single URL input
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
              )}
              
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
                  {bulkMode 
                    ? "Applied to all imported competitors" 
                    : "AI will suggest the best category based on the website content"
                  }
                </p>
              </div>
            </>
          )}
          
          {/* Actions */}
          {!isComplete && (
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
                disabled={isSubmitting || (bulkMode && parseUrls(bulkUrls).length === 0)}
                className="h-10 text-[13px] gap-2 bg-neutral-900 hover:bg-neutral-800 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {bulkMode ? `Processing...` : isEditing ? "Saving..." : "Analyzing..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : bulkMode ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Import {parseUrls(bulkUrls).length} URLs
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Add with AI
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
