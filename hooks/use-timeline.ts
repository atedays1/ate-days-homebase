"use client"

import { useState, useEffect, useCallback } from "react"
import { TimelineData, TimelineTask } from "@/lib/timeline-types"

interface UseTimelineResult {
  data: TimelineData | null
  tasks: TimelineTask[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
  refresh: () => Promise<void>
}

export function useTimeline(): UseTimelineResult {
  const [data, setData] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useServiceAccount, setUseServiceAccount] = useState(false)
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null)

  // Check service account config and get spreadsheet ID
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if service account is configured
        const configResponse = await fetch("/api/sheets/config")
        const configData = await configResponse.json()
        setUseServiceAccount(configData.serviceAccountConfigured)
        
        // Get spreadsheet ID from database
        const settingsResponse = await fetch("/api/settings?key=timeline_spreadsheet_id")
        const settingsData = await settingsResponse.json()
        
        if (settingsData.value) {
          setSpreadsheetId(settingsData.value)
          localStorage.setItem("timeline_spreadsheet_id", settingsData.value)
        } else {
          // Fallback to localStorage
          const localId = localStorage.getItem("timeline_spreadsheet_id")
          if (localId) setSpreadsheetId(localId)
        }
      } catch (err) {
        console.error("Error initializing timeline:", err)
      }
    }
    
    initialize()
  }, [])

  const getOAuthCredentials = useCallback(() => {
    const accessToken = localStorage.getItem("google_access_token")
    const tokenExpiry = localStorage.getItem("google_token_expiry")

    // Check if token is expired
    if (accessToken && tokenExpiry) {
      const expiry = parseInt(tokenExpiry, 10)
      if (Date.now() >= expiry) {
        localStorage.removeItem("google_access_token")
        localStorage.removeItem("google_token_expiry")
        return null
      }
      return accessToken
    }
    return null
  }, [])

  const fetchTimeline = useCallback(async () => {
    if (!spreadsheetId) {
      setIsLoading(false)
      setData(null)
      return
    }

    // With service account, we don't need OAuth token
    // Without service account, we need valid OAuth token
    const accessToken = getOAuthCredentials()
    if (!useServiceAccount && !accessToken) {
      setIsLoading(false)
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {}
      
      // Only include Authorization header if using OAuth
      if (!useServiceAccount && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      
      const response = await fetch(
        `/api/sheets/timeline?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
        { headers }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch timeline")
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [spreadsheetId, useServiceAccount, getOAuthCredentials])

  // Fetch when spreadsheetId or auth changes
  useEffect(() => {
    if (spreadsheetId) {
      fetchTimeline()
    }
  }, [spreadsheetId, useServiceAccount, fetchTimeline])

  // Listen for storage changes (when user connects on another page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "google_access_token" ||
        e.key === "timeline_spreadsheet_id"
      ) {
        if (e.key === "timeline_spreadsheet_id" && e.newValue) {
          setSpreadsheetId(e.newValue)
        }
        fetchTimeline()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [fetchTimeline])

  // Connected if we have spreadsheet ID and either service account or valid OAuth
  const isConnected = !!spreadsheetId && (useServiceAccount || !!getOAuthCredentials())

  return {
    data,
    tasks: data?.tasks || [],
    isLoading,
    error,
    isConnected,
    refresh: fetchTimeline,
  }
}

// Get current month's tasks
export function getCurrentMonthTasks(tasks: TimelineTask[]): TimelineTask[] {
  return tasks.filter((t) => t.status === "in-progress")
}

// Get tasks due this week/month that need attention
export function getActionableTasks(tasks: TimelineTask[]): TimelineTask[] {
  const inProgress = tasks.filter((t) => t.status === "in-progress")
  // Sort by end month (most urgent first)
  return inProgress.sort((a, b) => a.endMonth - b.endMonth)
}

// Get next milestone (first upcoming task) - kept for backwards compatibility
export function getNextMilestone(tasks: TimelineTask[]): {
  name: string
  month: number
  workstream: TimelineTask["workstream"]
} | null {
  const milestones = getUpcomingMilestones(tasks, 1)
  return milestones.length > 0 ? milestones[0] : null
}

// Get multiple upcoming milestones
export function getUpcomingMilestones(tasks: TimelineTask[], limit: number = 5): {
  name: string
  month: number
  workstream: TimelineTask["workstream"]
}[] {
  // Find upcoming tasks
  const upcomingTasks = tasks.filter((t) => t.status === "upcoming")
  if (upcomingTasks.length === 0) return []

  // Sort by start month and take the first N
  const sorted = upcomingTasks.sort((a, b) => a.startMonth - b.startMonth)
  
  return sorted.slice(0, limit).map(t => ({
    name: t.name,
    month: t.startMonth,
    workstream: t.workstream,
  }))
}
