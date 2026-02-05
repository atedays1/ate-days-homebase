import { useState, useEffect, useCallback } from "react"

export interface TaskMetadata {
  id?: string
  task_id: string
  description?: string | null
  status?: "completed" | "in-progress" | "not-started" | null
  start_date?: string | null
  end_date?: string | null
  priority?: "low" | "medium" | "high" | "urgent" | null
  assignee?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

interface UseTaskMetadataResult {
  metadata: Record<string, TaskMetadata>
  isLoading: boolean
  error: string | null
  getMetadata: (taskId: string) => TaskMetadata | undefined
  saveMetadata: (data: TaskMetadata) => Promise<boolean>
  refreshMetadata: () => Promise<void>
}

export function useTaskMetadata(): UseTaskMetadataResult {
  const [metadata, setMetadata] = useState<Record<string, TaskMetadata>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all metadata on mount
  const refreshMetadata = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/tasks/metadata")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch metadata")
      }

      // Index by task_id for quick lookup
      const indexed: Record<string, TaskMetadata> = {}
      for (const item of result.data || []) {
        indexed[item.task_id] = item
      }
      setMetadata(indexed)
    } catch (err) {
      console.error("Error fetching task metadata:", err)
      setError(err instanceof Error ? err.message : "Failed to load metadata")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMetadata()
  }, [refreshMetadata])

  // Get metadata for a specific task
  const getMetadata = useCallback(
    (taskId: string): TaskMetadata | undefined => {
      return metadata[taskId]
    },
    [metadata]
  )

  // Save metadata for a task
  const saveMetadata = useCallback(
    async (data: TaskMetadata): Promise<boolean> => {
      try {
        const response = await fetch("/api/tasks/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to save metadata")
        }

        // Update local state
        setMetadata((prev) => ({
          ...prev,
          [data.task_id]: result.data,
        }))

        return true
      } catch (err) {
        console.error("Error saving task metadata:", err)
        return false
      }
    },
    []
  )

  return {
    metadata,
    isLoading,
    error,
    getMetadata,
    saveMetadata,
    refreshMetadata,
  }
}
