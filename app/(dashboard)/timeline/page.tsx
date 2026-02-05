"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GanttChart } from "@/components/gantt-chart"
import { SheetsConnection } from "@/components/sheets-connection"
import { 
  TimelineTask, 
  TimelineData, 
  Workstream, 
  WORKSTREAMS,
} from "@/lib/timeline-types"
import { getCompletionStats } from "@/lib/timeline-parser"
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Loader2,
  Filter,
  LayoutGrid,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Simple admin check - add ?admin=true to URL to access admin features
// In the future, replace with proper Google Workspace auth
const ADMIN_PARAM = "admin"

export default function TimelinePage() {
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get(ADMIN_PARAM) === "true"
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null)
  const [filterWorkstream, setFilterWorkstream] = useState<Workstream | null>(null)
  const [useServiceAccount, setUseServiceAccount] = useState(false)

  // Load saved spreadsheet ID and check service account config on mount
  useEffect(() => {
    const initializeTimeline = async () => {
      try {
        // Check if service account is configured
        const configResponse = await fetch("/api/sheets/config")
        const configData = await configResponse.json()
        setUseServiceAccount(configData.serviceAccountConfigured)
        
        // Check for saved spreadsheet ID in database
        const response = await fetch("/api/settings?key=timeline_spreadsheet_id")
        const data = await response.json()
        
        if (data.value) {
          setSpreadsheetId(data.value)
          // Also save to localStorage for SheetsConnection component
          localStorage.setItem("timeline_spreadsheet_id", data.value)
        }

        // Only check for OAuth token if service account is not configured
        if (!configData.serviceAccountConfigured) {
          const savedToken = localStorage.getItem("google_access_token")
          const tokenExpiry = localStorage.getItem("google_token_expiry")
          
          if (savedToken && tokenExpiry) {
            const expiry = parseInt(tokenExpiry, 10)
            if (Date.now() < expiry) {
              setAccessToken(savedToken)
            }
          }
        }
      } catch (err) {
        console.error("Error loading saved settings:", err)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeTimeline()
  }, [])

  const fetchTimeline = useCallback(async () => {
    // With service account, we only need spreadsheetId
    // Without service account, we need both accessToken and spreadsheetId
    if (!spreadsheetId) return
    if (!useServiceAccount && !accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {}
      
      // Only include Authorization header if using OAuth (not service account)
      if (!useServiceAccount && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      
      const response = await fetch(
        `/api/sheets/timeline?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
        { headers }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch timeline")
      }

      setTimelineData(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline")
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, spreadsheetId, useServiceAccount])

  // Auto-fetch when connected
  useEffect(() => {
    if (spreadsheetId && !isInitializing) {
      // With service account, fetch immediately if spreadsheet ID is set
      // Without service account, wait for access token
      if (useServiceAccount || accessToken) {
        fetchTimeline()
      }
    }
  }, [accessToken, spreadsheetId, isInitializing, useServiceAccount, fetchTimeline])

  const handleConnected = useCallback(async (token: string, sheetId: string) => {
    setAccessToken(token)
    setSpreadsheetId(sheetId)
    
    // Save spreadsheet ID to database so it persists for all users
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "timeline_spreadsheet_id",
          value: sheetId,
        }),
      })
    } catch (err) {
      console.error("Error saving spreadsheet ID:", err)
    }
  }, [])

  const stats = timelineData ? getCompletionStats(timelineData.tasks) : null
  const filteredTasks = timelineData?.tasks.filter(
    (t) => !filterWorkstream || t.workstream === filterWorkstream
  ) || []

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Go-To-Market Timeline
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Strategic milestones synced from Google Sheets
          </p>
        </div>

        {timelineData && (
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] text-neutral-400">
                Last synced: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTimeline}
              disabled={isLoading}
              className="h-8 text-[12px]"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Refresh
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTimelineData(null)
                  setAccessToken(null)
                  setSpreadsheetId(null)
                  localStorage.removeItem("google_access_token")
                  localStorage.removeItem("google_token_expiry")
                  localStorage.removeItem("timeline_spreadsheet_id")
                }}
                className="h-8 text-[12px] text-neutral-500"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Change Spreadsheet
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Connection or Content */}
      {isInitializing ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !spreadsheetId || (!useServiceAccount && !accessToken) ? (
        isAdmin ? (
          <div className="max-w-lg">
            <SheetsConnection 
              onConnected={handleConnected}
              savedSpreadsheetId={spreadsheetId || undefined}
            />
          </div>
        ) : (
          <Card className="border border-neutral-200/60 shadow-none max-w-lg">
            <CardContent className="p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mx-auto mb-4">
                <LayoutGrid className="h-6 w-6 text-neutral-400" />
              </div>
              <h3 className="text-[14px] font-medium text-neutral-900 mb-1">
                Timeline Not Configured
              </h3>
              <p className="text-[12px] text-neutral-500">
                The timeline spreadsheet hasn&apos;t been connected yet. Please contact an administrator to set it up.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-neutral-200/60 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                      <LayoutGrid className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold text-neutral-900">
                        {stats.total}
                      </p>
                      <p className="text-[11px] text-neutral-500">Total Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-neutral-200/60 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold text-neutral-900">
                        {stats.completed}
                      </p>
                      <p className="text-[11px] text-neutral-500">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-neutral-200/60 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold text-neutral-900">
                        {stats.inProgress}
                      </p>
                      <p className="text-[11px] text-neutral-500">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-neutral-200/60 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                      <Circle className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold text-neutral-900">
                        {stats.upcoming}
                      </p>
                      <p className="text-[11px] text-neutral-500">Upcoming</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <span className="text-[12px] text-neutral-500 mr-2">Filter:</span>
            <Button
              variant={filterWorkstream === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterWorkstream(null)}
              className={cn(
                "h-7 text-[11px]",
                filterWorkstream === null && "bg-neutral-900"
              )}
            >
              All
            </Button>
            {WORKSTREAMS.map((ws) => (
              <Button
                key={ws.id}
                variant={filterWorkstream === ws.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterWorkstream(ws.id)}
                className={cn(
                  "h-7 text-[11px]",
                  filterWorkstream === ws.id && "bg-neutral-900"
                )}
              >
                {ws.label}
              </Button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && !timelineData && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Gantt Chart */}
          {timelineData && (
            <GanttChart
              tasks={filteredTasks}
              showLegend={true}
              showWorkstreamLabels={true}
              highlightCurrentMonth={true}
              filterWorkstream={filterWorkstream || undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}
