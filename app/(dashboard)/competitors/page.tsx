"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { CompetitorCard, CompetitorCardSkeleton, Competitor } from "@/components/competitor-card"
import { CompetitorForm } from "@/components/competitor-form"
import { CompetitorDetail } from "@/components/competitor-detail"
import { MarketSummary } from "@/components/market-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Plus, 
  Users2, 
  Loader2,
  Filter,
  Moon,
  Zap,
  Heart,
  Layers,
  Sparkles,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "all", label: "All", icon: Layers },
  { id: "sleep", label: "Sleep", icon: Moon },
  { id: "focus", label: "Focus", icon: Zap },
  { id: "calm", label: "Calm", icon: Heart },
  { id: "multi", label: "Multi", icon: Users2 },
]

export default function CompetitorsPage() {
  const { userAccess } = useAuth()
  const isAdmin = userAccess?.role === "admin"
  
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [viewingCompetitor, setViewingCompetitor] = useState<Competitor | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{ analyzed: number; message: string } | null>(null)
  
  const fetchCompetitors = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory)
      }
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      
      const response = await fetch(`/api/competitors?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCompetitors(data.competitors || [])
      }
    } catch (error) {
      console.error("Failed to fetch competitors:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, searchQuery])
  
  useEffect(() => {
    fetchCompetitors()
  }, [fetchCompetitors])
  
  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor)
    setShowForm(true)
  }
  
  const handleViewDetails = (competitor: Competitor) => {
    setViewingCompetitor(competitor)
  }
  
  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      return
    }
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/competitors/${id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        setCompetitors(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete competitor:", error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }
  
  const handleFormClose = () => {
    setShowForm(false)
    setEditingCompetitor(null)
  }
  
  const handleFormSuccess = () => {
    handleFormClose()
    fetchCompetitors()
  }
  
  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true)
    setAnalysisResult(null)
    
    try {
      const response = await fetch("/api/competitors/analyze-all", {
        method: "POST",
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalysisResult({ analyzed: data.analyzed, message: data.message })
        // Refresh competitors to show new insights
        fetchCompetitors()
      } else {
        const error = await response.json()
        setAnalysisResult({ analyzed: 0, message: error.error || "Analysis failed" })
      }
    } catch (error) {
      console.error("Failed to analyze competitors:", error)
      setAnalysisResult({ analyzed: 0, message: "Analysis failed" })
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  // Filter competitors client-side for immediate search feedback
  const filteredCompetitors = competitors.filter(c => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.tags?.some(t => t.toLowerCase().includes(query))
      )
    }
    return true
  })
  
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Market Intelligence
            </p>
            <h1 className="mt-2 text-xl sm:text-2xl font-light tracking-tight text-neutral-900">
              Competitors
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Track competitors in the sleep, focus, and calm supplement market
            </p>
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing}
                variant="outline"
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze All
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="gap-2 bg-neutral-900 hover:bg-neutral-800"
              >
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Market Intelligence Summary */}
      <MarketSummary />
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search competitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-[13px] bg-white border-neutral-200"
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-neutral-400 shrink-0" />
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "h-8 text-[11px] gap-1.5 shrink-0",
                selectedCategory === cat.id && "bg-neutral-900"
              )}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 text-[12px] text-neutral-500">
        <span>
          <strong className="text-neutral-700">{filteredCompetitors.length}</strong> competitors
        </span>
        {selectedCategory !== "all" && (
          <span>
            in <strong className="text-neutral-700 capitalize">{selectedCategory}</strong>
          </span>
        )}
      </div>
      
      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <CompetitorCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCompetitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 mb-4">
            <Users2 className="h-7 w-7 text-neutral-400" />
          </div>
          <h3 className="text-[14px] font-medium text-neutral-900 mb-1">
            {searchQuery ? "No competitors found" : "No competitors yet"}
          </h3>
          <p className="text-[13px] text-neutral-500 max-w-sm">
            {searchQuery 
              ? `No competitors match "${searchQuery}". Try a different search term.`
              : isAdmin 
                ? "Add your first competitor to start tracking the market."
                : "Competitors will appear here once added by an admin."
            }
          </p>
          {isAdmin && !searchQuery && (
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Add First Competitor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCompetitors.map(competitor => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
      
      {/* Delete confirmation toast */}
      {deleteConfirm && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-[13px] text-neutral-700">
            Delete this competitor?
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(deleteConfirm)}
            disabled={isDeleting}
            className="h-7 text-[12px]"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteConfirm(null)}
            className="h-7 text-[12px]"
          >
            Cancel
          </Button>
        </div>
      )}
      
      {/* Analysis result toast */}
      {analysisResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full",
            analysisResult.analyzed > 0 ? "bg-emerald-100" : "bg-amber-100"
          )}>
            {analysisResult.analyzed > 0 ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            )}
          </div>
          <span className="text-[13px] text-neutral-700">
            {analysisResult.message}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAnalysisResult(null)}
            className="h-7 text-[12px]"
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {/* Add/Edit Form Modal */}
      {showForm && (
        <CompetitorForm
          competitor={editingCompetitor}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
      
      {/* Competitor Detail Modal */}
      {viewingCompetitor && (
        <CompetitorDetail
          competitor={viewingCompetitor}
          onClose={() => setViewingCompetitor(null)}
        />
      )}
    </div>
  )
}
