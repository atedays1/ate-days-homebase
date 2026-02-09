"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Loader2,
  Globe,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  MessageSquareQuote,
  Bot
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Competitor } from "@/components/competitor-card"

interface PainPoint {
  id: string
  pain_point: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
  }
  severity: "high" | "medium" | "low"
  evidence: string | null
  source_url: string | null
  source_type: string | null
  ai_generated: boolean
}

interface WhiteSpaceScore {
  id: string
  white_space: {
    id: string
    name: string
    slug: string
    icon: string
    priority: number
  }
  score: number
  notes: string | null
}

interface CompetitorInsights {
  pain_points: PainPoint[]
  white_space_scores: WhiteSpaceScore[]
  ai_summary: string | null
  overall_opportunity_score: number | null
}

interface CompetitorDetailProps {
  competitor: Competitor
  onClose: () => void
}

const SEVERITY_CONFIG = {
  high: { 
    bg: "bg-red-50", 
    text: "text-red-700", 
    border: "border-red-200",
    badge: "bg-red-100 text-red-700" 
  },
  medium: { 
    bg: "bg-orange-50", 
    text: "text-orange-700", 
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700" 
  },
  low: { 
    bg: "bg-yellow-50", 
    text: "text-yellow-700", 
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700" 
  },
}

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  trustpilot: "Trustpilot",
  amazon: "Amazon",
  manual: "Manual Entry",
  ai_detected: "AI Detected",
}

export function CompetitorDetail({ competitor, onClose }: CompetitorDetailProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState<CompetitorInsights | null>(null)
  
  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch(`/api/competitors/${competitor.id}/insights`)
        if (response.ok) {
          const data = await response.json()
          setInsights(data)
        }
      } catch (error) {
        console.error("Failed to fetch competitor insights:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchInsights()
  }, [competitor.id])
  
  // Get initials for logo fallback
  const initials = competitor.name
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-200 shrink-0">
          <div className="flex items-start gap-4">
            {competitor.logo_url ? (
              <img 
                src={competitor.logo_url} 
                alt={`${competitor.name} logo`}
                className="h-14 w-14 rounded-xl object-contain bg-neutral-50 border border-neutral-100"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 font-semibold text-lg">
                {initials}
              </div>
            )}
            
            <div>
              <h2 className="text-[18px] font-semibold text-neutral-900">
                {competitor.name}
              </h2>
              {competitor.description && (
                <p className="text-[13px] text-neutral-500 mt-1 line-clamp-2 max-w-md">
                  {competitor.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {competitor.website_url && (
                  <a
                    href={competitor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700"
                  >
                    <Globe className="h-3 w-3" />
                    {new URL(competitor.website_url).hostname}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              {/* AI Summary */}
              {insights?.ai_summary && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
                        AI Analysis
                      </h4>
                      <p className="text-[13px] text-blue-800 leading-relaxed">
                        {insights.ai_summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pain Points */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-[13px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Pain Points
                  </h3>
                  {insights?.pain_points && insights.pain_points.length > 0 && (
                    <span className="text-[11px] text-neutral-400">
                      ({insights.pain_points.length} identified)
                    </span>
                  )}
                </div>
                
                {insights?.pain_points && insights.pain_points.length > 0 ? (
                  <div className="space-y-3">
                    {insights.pain_points.map(pp => {
                      const config = SEVERITY_CONFIG[pp.severity] || SEVERITY_CONFIG.medium
                      return (
                        <div 
                          key={pp.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            config.bg,
                            config.border
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                config.badge
                              )}>
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {pp.severity.toUpperCase()}
                              </span>
                              <span className={cn("text-[13px] font-medium", config.text)}>
                                {pp.pain_point.name}
                              </span>
                            </div>
                            {pp.ai_generated && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                                <Bot className="h-3 w-3" />
                                AI
                              </span>
                            )}
                          </div>
                          
                          {pp.evidence && (
                            <div className="flex items-start gap-2 mt-2">
                              <MessageSquareQuote className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
                              <p className="text-[12px] text-neutral-600 italic">
                                "{pp.evidence}"
                              </p>
                            </div>
                          )}
                          
                          {pp.source_url && (
                            <div className="mt-2 pt-2 border-t border-neutral-200/50">
                              <a
                                href={pp.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-700"
                              >
                                Source: {SOURCE_LABELS[pp.source_type || "manual"] || pp.source_type}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-neutral-400 italic">
                    No pain points identified yet.
                  </p>
                )}
              </div>
              
              {/* White Space Scores */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-[13px] font-semibold text-neutral-700 uppercase tracking-wider">
                    White Space Opportunities
                  </h3>
                </div>
                
                {insights?.white_space_scores && insights.white_space_scores.length > 0 ? (
                  <div className="space-y-3">
                    {insights.white_space_scores.map(ws => (
                      <div 
                        key={ws.id}
                        className="p-3 rounded-lg border border-neutral-200 bg-white"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-medium text-neutral-700">
                            {ws.white_space.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-neutral-100 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  ws.score >= 7 ? "bg-emerald-400" :
                                  ws.score >= 4 ? "bg-amber-400" : "bg-neutral-300"
                                )}
                                style={{ width: `${(ws.score / 10) * 100}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-[12px] font-semibold min-w-[24px]",
                              ws.score >= 7 ? "text-emerald-600" :
                              ws.score >= 4 ? "text-amber-600" : "text-neutral-500"
                            )}>
                              {ws.score}/10
                            </span>
                          </div>
                        </div>
                        
                        {ws.notes && (
                          <p className="text-[12px] text-neutral-500">
                            {ws.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-neutral-400 italic">
                    No white space scores assigned yet.
                  </p>
                )}
              </div>
              
              {/* Overall Opportunity */}
              {insights?.white_space_scores && insights.white_space_scores.length > 0 && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      <span className="text-[13px] font-medium text-emerald-900">
                        Overall Opportunity Score
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const avgScore = insights.white_space_scores.reduce((sum, ws) => sum + ws.score, 0) / insights.white_space_scores.length
                        return (
                          <>
                            <div className="w-24 h-2.5 rounded-full bg-emerald-200/50 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${(avgScore / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-[14px] font-bold text-emerald-700">
                              {avgScore.toFixed(1)}/10
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <p className="text-[12px] text-emerald-700 mt-2">
                    Higher scores indicate more opportunity for AteDays to differentiate.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
