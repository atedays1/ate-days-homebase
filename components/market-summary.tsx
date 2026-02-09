"use client"

import { useState, useEffect } from "react"
import { 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  CreditCard,
  Pill,
  EyeOff,
  TrendingDown,
  Scan,
  Users,
  Map,
  Zap,
  LayoutGrid
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PainPointCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  competitor_count: number
}

interface WhiteSpaceOpportunity {
  id: string
  name: string
  slug: string
  description: string
  how_atedays_wins: string
  icon: string
  priority: number
  avg_score: number
}

interface MarketInsights {
  pain_points: PainPointCategory[]
  white_space: WhiteSpaceOpportunity[]
  summary: {
    total_competitors: number
    competitors_with_insights: number
    top_pain_point: string | null
    biggest_opportunity: string | null
    avg_opportunity_score: number
  }
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "credit-card": CreditCard,
  "pill": Pill,
  "alert-triangle": AlertTriangle,
  "eye-off": EyeOff,
  "trending-down": TrendingDown,
  "scan": Scan,
  "users": Users,
  "map": Map,
  "zap": Zap,
  "layout-grid": LayoutGrid,
  "lightbulb": Lightbulb,
}

const colorMap: Record<string, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
}

export function MarketSummary() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState<MarketInsights | null>(null)
  
  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch("/api/insights")
        if (response.ok) {
          const data = await response.json()
          setInsights(data)
        }
      } catch (error) {
        console.error("Failed to fetch market insights:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchInsights()
  }, [])
  
  if (isLoading) {
    return (
      <div className="mb-6 rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-6">
        <div className="flex items-center justify-center gap-2 text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">Loading market intelligence...</span>
        </div>
      </div>
    )
  }
  
  if (!insights || (insights.pain_points.length === 0 && insights.white_space.length === 0)) {
    return null
  }
  
  const { summary, pain_points, white_space } = insights
  
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-gradient-to-br from-amber-50/50 to-white overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <BarChart3 className="h-5 w-5 text-amber-700" />
          </div>
          <div className="text-left">
            <h3 className="text-[14px] font-semibold text-neutral-900">
              Market Intelligence
            </h3>
            <p className="text-[12px] text-neutral-500">
              {summary.competitors_with_insights} of {summary.total_competitors} competitors analyzed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Quick stats pills */}
          {!isExpanded && summary.top_pain_point && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-medium">
                <AlertTriangle className="h-3 w-3" />
                {summary.top_pain_point}
              </span>
              {summary.biggest_opportunity && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">
                  <TrendingUp className="h-3 w-3" />
                  {summary.biggest_opportunity}
                </span>
              )}
            </div>
          )}
          
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Key insight banner */}
          {summary.top_pain_point && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-100/80 to-orange-100/80 border border-amber-200/50">
              <p className="text-[13px] text-amber-900">
                <strong className="font-semibold">Key Insight:</strong>{" "}
                <span className="text-amber-800">
                  "{summary.top_pain_point}" is the most common pain point across tracked competitors.
                  {summary.biggest_opportunity && (
                    <> Your biggest opportunity is in "{summary.biggest_opportunity}" (avg score: {summary.avg_opportunity_score}/10).</>
                  )}
                </span>
              </p>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pain Points Section */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h4 className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Pain Points Heatmap
                  </h4>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 ml-6">
                  What's broken in the industry
                </p>
              </div>
              
              <div className="space-y-2">
                {pain_points.map(pp => {
                  const Icon = iconMap[pp.icon] || AlertTriangle
                  const maxCount = Math.max(...pain_points.map(p => p.competitor_count), 1)
                  const percentage = (pp.competitor_count / maxCount) * 100
                  
                  return (
                    <div key={pp.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded",
                            colorMap[pp.color] || colorMap.yellow
                          )}>
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="text-[12px] font-medium text-neutral-700">
                            {pp.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          {pp.competitor_count} competitors
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            pp.color === "red" ? "bg-red-400" :
                            pp.color === "orange" ? "bg-orange-400" : "bg-yellow-400"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* White Space Section */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider">
                    White Space Opportunities
                  </h4>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 ml-6">
                  Where AteDays can win
                </p>
              </div>
              
              <div className="space-y-2">
                {white_space.map(ws => {
                  const Icon = iconMap[ws.icon] || Lightbulb
                  
                  return (
                    <div key={ws.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="text-[12px] font-medium text-neutral-700">
                            {ws.name}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[11px] font-medium",
                          ws.avg_score >= 7 ? "text-emerald-600" :
                          ws.avg_score >= 4 ? "text-amber-600" : "text-neutral-500"
                        )}>
                          {ws.avg_score > 0 ? `${ws.avg_score}/10` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            ws.avg_score >= 7 ? "bg-emerald-400" :
                            ws.avg_score >= 4 ? "bg-amber-400" : "bg-neutral-300"
                          )}
                          style={{ width: `${(ws.avg_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
