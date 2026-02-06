"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  FileText,
  ExternalLink,
  Rocket,
  CalendarDays,
  ArrowRight,
  Loader2,
  Sparkles,
  Lightbulb,
  ListTodo,
  Tag,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentSearch } from "@/components/document-search"
import { useTimeline, getActionableTasks, getUpcomingMilestones } from "@/hooks/use-timeline"
import { MONTHS, TimelineTask, getWorkstreamConfig } from "@/lib/timeline-types"
import { supabase } from "@/lib/supabase"

interface DocumentResource {
  id: string
  name: string
  type: string
}

interface DocumentSummary {
  executive_summary: string
  key_insights: string[]
  action_items: { task: string; source: string; priority: "high" | "medium" | "low" }[]
  key_themes: string[]
  important_dates: { date: string; description: string; source: string }[]
  document_count: number
  generated_at: string
}

export default function HomePage() {
  const { tasks, isLoading: timelineLoading, isConnected } = useTimeline()
  const [documents, setDocuments] = useState<DocumentResource[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [summary, setSummary] = useState<DocumentSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Fetch recent documents
  useEffect(() => {
    async function fetchDocs() {
      try {
        const { data } = await supabase
          .from("documents")
          .select("id, name, type")
          .order("created_at", { ascending: false })
          .limit(4)
        
        setDocuments(data || [])
      } catch (err) {
        console.error("Failed to fetch documents:", err)
      } finally {
        setDocsLoading(false)
      }
    }
    fetchDocs()
  }, [])

  // Fetch document summary
  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await fetch("/api/documents/summary")
        if (response.ok) {
          const data = await response.json()
          if (data.exists && data.summary) {
            setSummary(data.summary)
          }
        }
      } catch (err) {
        console.error("Failed to fetch summary:", err)
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchSummary()
  }, [])

  // Refresh summary
  const handleRefreshSummary = async () => {
    setIsRefreshing(true)
    setSummaryError(null)
    try {
      const response = await fetch("/api/documents/summarize", { method: "POST" })
      const data = await response.json()
      
      if (!response.ok) {
        setSummaryError(data.error || "Failed to generate insights")
        return
      }
      
      if (data.success && data.summary) {
        setSummary(data.summary)
      } else if (data.error) {
        setSummaryError(data.error)
      }
    } catch (err) {
      console.error("Failed to refresh summary:", err)
      setSummaryError(err instanceof Error ? err.message : "Failed to connect to server")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get action items from timeline
  const actionItems = getActionableTasks(tasks).slice(0, 5)
  const upcomingMilestones = getUpcomingMilestones(tasks, 4)

  // Calculate milestone date
  const getMilestoneDate = (month: number): string => {
    const monthName = MONTHS[month]
    return `${monthName} 2026`
  }

  const getDaysUntil = (month: number): number => {
    const now = new Date()
    const currentFiscalMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1
    
    // Calculate months difference
    let monthsDiff = month - currentFiscalMonth
    if (monthsDiff < 0) monthsDiff += 12
    
    // Rough estimate: 30 days per month
    return monthsDiff * 30
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Overview</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Key metrics and priorities for Ate Days
        </p>
      </div>

      {/* Document Search */}
      <div className="mb-8">
        <DocumentSearch />
      </div>

      {/* Document Insights Section - show when loading, has summary, or has documents */}
      {(summaryLoading || summary || (!docsLoading && documents.length > 0)) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-[14px] font-medium text-neutral-900">Document Insights</h2>
              {summary && (
                <span className="text-[11px] text-neutral-400">
                  {summary.document_count} document{summary.document_count !== 1 ? "s" : ""} analyzed
                </span>
              )}
            </div>
            {summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshSummary}
                disabled={isRefreshing}
                className="h-7 text-[11px] text-neutral-500"
              >
                {isRefreshing ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                )}
                Refresh
              </Button>
            )}
          </div>

          {summaryLoading ? (
            <Card className="border border-neutral-200/60 shadow-none bg-white">
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              </CardContent>
            </Card>
          ) : summary ? (
            <div className="space-y-4">
              {/* Executive Summary */}
              {summary.executive_summary && (
                <Card className="border border-amber-200/60 shadow-none bg-amber-50/30">
                  <CardContent className="py-4">
                    <p className="text-[13px] text-neutral-700 leading-relaxed">
                      {summary.executive_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Key Insights & Action Items Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Key Insights */}
                {summary.key_insights && summary.key_insights.length > 0 && (
                  <Card className="border border-neutral-200/60 shadow-none bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-[12px] font-medium text-neutral-900">
                          Key Insights
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.key_insights.slice(0, 5).map((insight, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[11px] font-medium text-amber-600 mt-0.5 shrink-0">
                              {i + 1}.
                            </span>
                            <span className="text-[12px] text-neutral-600 leading-relaxed">
                              {insight}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items from Documents */}
                {summary.action_items && summary.action_items.length > 0 && (
                  <Card className="border border-neutral-200/60 shadow-none bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-blue-500" />
                        <CardTitle className="text-[12px] font-medium text-neutral-900">
                          Action Items
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2.5">
                        {summary.action_items.slice(0, 5).map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                              item.priority === "high" ? "bg-red-400" :
                              item.priority === "medium" ? "bg-amber-400" :
                              "bg-neutral-300"
                            }`} />
                            <div className="min-w-0">
                              <span className="text-[12px] text-neutral-700 leading-relaxed block">
                                {item.task}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                From: {item.source}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Key Themes & Important Dates */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Key Themes */}
                {summary.key_themes && summary.key_themes.length > 0 && (
                  <Card className="border border-neutral-200/60 shadow-none bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-500" />
                        <CardTitle className="text-[12px] font-medium text-neutral-900">
                          Key Themes
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {summary.key_themes.map((theme, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-700"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Important Dates */}
                {summary.important_dates && summary.important_dates.length > 0 && (
                  <Card className="border border-neutral-200/60 shadow-none bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        <CardTitle className="text-[12px] font-medium text-neutral-900">
                          Important Dates
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.important_dates.slice(0, 4).map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[11px] font-medium text-emerald-600 shrink-0 mt-0.5">
                              {item.date}
                            </span>
                            <span className="text-[12px] text-neutral-600">
                              {item.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : documents.length > 0 ? (
            <Card className="border border-neutral-200/60 shadow-none bg-white">
              <CardContent className="py-6 text-center">
                {summaryError ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
                    <p className="text-[12px] text-red-600 mb-1">
                      Failed to generate insights
                    </p>
                    <p className="text-[11px] text-neutral-500 mb-3">
                      {summaryError}
                    </p>
                  </>
                ) : isRefreshing ? (
                  <>
                    <Loader2 className="h-5 w-5 text-amber-500 mx-auto mb-2 animate-spin" />
                    <p className="text-[12px] text-neutral-600 mb-1">
                      Analyzing your documents...
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      This may take 15-30 seconds
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-neutral-400 mx-auto mb-2" />
                    <p className="text-[12px] text-neutral-500">
                      No summary generated yet.
                    </p>
                  </>
                )}
                {!isRefreshing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSummary}
                    disabled={isRefreshing}
                    className="mt-3 h-8 text-[11px]"
                  >
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    {summaryError ? "Try Again" : "Generate Insights"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Action Items */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                <CheckCircle2 className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-medium text-neutral-900">
                  Current Tasks
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  {isConnected ? `${actionItems.length} in progress` : "Connect Google Sheets"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : !isConnected ? (
              <div className="text-[12px] text-neutral-500 py-2">
                <Link 
                  href="/timeline" 
                  className="text-neutral-900 hover:underline"
                >
                  Connect your timeline spreadsheet
                </Link>{" "}
                to see current tasks
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-[12px] text-neutral-500 py-2">
                No tasks currently in progress
              </div>
            ) : (
              <ul className="space-y-2.5">
                {actionItems.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-neutral-600 block truncate">
                        {task.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 capitalize">
                        {task.workstream}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {isConnected && actionItems.length > 0 && (
              <Link
                href="/timeline"
                className="mt-3 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                View full timeline
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                <Target className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-medium text-neutral-900">
                  Upcoming Milestones
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  {upcomingMilestones.length} upcoming
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : !isConnected || upcomingMilestones.length === 0 ? (
              <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Rocket className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Launch
                  </span>
                </div>
                <h3 className="mt-2 text-[13px] font-medium text-neutral-900">
                  Product Launch
                </h3>
                <p className="mt-1 text-[12px] text-neutral-500 leading-relaxed">
                  {isConnected 
                    ? "All milestones complete!"
                    : "Connect timeline to see milestones"
                  }
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-5 items-center rounded-full bg-neutral-900 px-2">
                    <span className="text-[10px] font-medium text-white">
                      Oct 2026
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMilestones.map((milestone, index) => (
                  <div 
                    key={`${milestone.name}-${index}`}
                    className="rounded-lg border p-3"
                    style={{ 
                      backgroundColor: getWorkstreamConfig(milestone.workstream)?.bgColor || "#f5f5f5",
                      borderColor: getWorkstreamConfig(milestone.workstream)?.bgColor || "#e5e5e5"
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2" style={{ color: getWorkstreamConfig(milestone.workstream)?.color }}>
                          <span className="text-[9px] font-medium uppercase tracking-wider">
                            {getWorkstreamConfig(milestone.workstream)?.label || "Task"}
                          </span>
                        </div>
                        <h3 className="mt-1 text-[12px] font-medium text-neutral-900 truncate">
                          {milestone.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <div className="flex h-5 items-center rounded-full bg-neutral-900 px-2">
                          <span className="text-[9px] font-medium text-white">
                            {getMilestoneDate(milestone.month)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link
                  href="/timeline"
                  className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 pt-1"
                >
                  View full timeline
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Resources */}
        <Card className="border border-neutral-200/60 shadow-none bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                <FileText className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-medium text-neutral-900">
                  Recent Documents
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  From your library
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-[12px] text-neutral-500 py-2">
                <Link 
                  href="/documents" 
                  className="text-neutral-900 hover:underline"
                >
                  Upload documents
                </Link>{" "}
                to see them here
              </div>
            ) : (
              <ul className="space-y-1">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href="/documents"
                      className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-neutral-400">
                          {doc.type}
                        </span>
                        <ExternalLink className="h-3 w-3 text-neutral-300" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {documents.length > 0 && (
              <Link
                href="/documents"
                className="mt-3 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                View all documents
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
