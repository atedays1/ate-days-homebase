"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  TimelineTask,
  Workstream,
  MONTHS,
  WORKSTREAMS,
  getCurrentMonthIndex,
  getWorkstreamConfig,
} from "@/lib/timeline-types"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  Calendar,
  Flag,
  User,
  FileText,
  ChevronDown,
  Loader2,
  Check,
  X,
} from "lucide-react"
import { useTaskMetadata, TaskMetadata } from "@/hooks/use-task-metadata"

interface HoverCardPosition {
  x: number
  y: number
  taskId: string
}

// Status options for the dropdown
const STATUS_OPTIONS = [
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "in-progress", label: "In Progress", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  { value: "not-started", label: "Not Started", icon: Circle, color: "text-neutral-500", bg: "bg-neutral-100" },
] as const

// Priority options
const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "text-red-600", bg: "bg-red-50" },
  { value: "high", label: "High", color: "text-orange-600", bg: "bg-orange-50" },
  { value: "medium", label: "Medium", color: "text-blue-600", bg: "bg-blue-50" },
  { value: "low", label: "Low", color: "text-neutral-500", bg: "bg-neutral-100" },
] as const

// Editable Task Card Component
function EditableTaskCard({
  task,
  position,
  metadata,
  onSave,
  onClose,
}: {
  task: TimelineTask
  position: { x: number; y: number }
  metadata?: TaskMetadata
  onSave: (data: TaskMetadata) => Promise<boolean>
  onClose: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isPositioned, setIsPositioned] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const [showBelow, setShowBelow] = useState(false)
  const [maxHeight, setMaxHeight] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showStartMonthDropdown, setShowStartMonthDropdown] = useState(false)
  const [showEndMonthDropdown, setShowEndMonthDropdown] = useState(false)
  
  // Date mode: "specific" for exact dates, "month" for month-only selection
  const [dateMode, setDateMode] = useState<"specific" | "month">(
    metadata?.start_date ? "specific" : "month"
  )
  
  // Local form state
  const [description, setDescription] = useState(metadata?.description || "")
  const [status, setStatus] = useState<TaskMetadata["status"]>(
    metadata?.status || (task.status === "upcoming" ? "not-started" : task.status as TaskMetadata["status"])
  )
  const [startDate, setStartDate] = useState(metadata?.start_date || "")
  const [endDate, setEndDate] = useState(metadata?.end_date || "")
  // Month-only selection (0-11 index into MONTHS array)
  const [startMonth, setStartMonth] = useState<number>(task.startMonth)
  const [endMonth, setEndMonth] = useState<number>(task.endMonth)
  const [priority, setPriority] = useState<TaskMetadata["priority"]>(metadata?.priority || null)
  const [assignee, setAssignee] = useState(metadata?.assignee || "")
  
  // Validation - must have at least a start month/date
  const hasValidDate = dateMode === "month" ? true : (startDate !== "")
  
  const wsConfig = getWorkstreamConfig(task.workstream)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    // Add listener after a brief delay to prevent immediate close from the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose])

  // Calculate position before showing - runs once on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frame = requestAnimationFrame(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const padding = 20 // Minimum padding from viewport edges
        const taskBarHeight = 36 // Approximate height of task bar + gap
        
        let newX = position.x
        let newY = position.y
        let shouldShowBelow = false
        const cardHeight = rect.height || 450
        const cardWidth = rect.width || 320

        // Horizontal adjustment - keep card within viewport
        if (position.x + cardWidth / 2 > viewportWidth - padding) {
          newX = viewportWidth - cardWidth / 2 - padding
        } else if (position.x - cardWidth / 2 < padding) {
          newX = cardWidth / 2 + padding
        }

        // Vertical adjustment - find best position
        const spaceAbove = position.y - padding
        const spaceBelow = viewportHeight - position.y - taskBarHeight - padding
        let calculatedMaxHeight: number | null = null
        
        if (spaceAbove >= cardHeight) {
          // Enough space above - show above (default)
          shouldShowBelow = false
          newY = position.y
        } else if (spaceBelow >= cardHeight) {
          // Enough space below - show below
          shouldShowBelow = true
          newY = position.y + taskBarHeight + 16
        } else {
          // Not enough space either way - use the larger space and constrain height
          if (spaceBelow > spaceAbove) {
            // More space below - show below with max height
            shouldShowBelow = true
            newY = position.y + taskBarHeight + 16
            calculatedMaxHeight = spaceBelow - 10
          } else {
            // More space above - show above with max height
            shouldShowBelow = false
            newY = position.y
            calculatedMaxHeight = spaceAbove - 10
          }
        }

        setAdjustedPosition({ x: newX, y: newY })
        setShowBelow(shouldShowBelow)
        setMaxHeight(calculatedMaxHeight)
        setIsPositioned(true)
      }
    })
    
    return () => cancelAnimationFrame(frame)
  }, [position])

  // Save all changes and close
  const handleSaveAndClose = useCallback(async () => {
    if (!hasValidDate) return
    
    // Determine dates to save based on mode
    let saveDates: { start: string | null; end: string | null } = { start: null, end: null }
    
    if (dateMode === "month") {
      // Convert month indices to date strings
      const getDateForMonth = (idx: number) => {
        const calendarMonth = idx === 0 ? 11 : idx - 1
        const year = idx === 0 ? 2025 : 2026
        const monthStr = String(calendarMonth + 1).padStart(2, '0')
        return `${year}-${monthStr}-01`
      }
      saveDates.start = getDateForMonth(startMonth)
      saveDates.end = getDateForMonth(endMonth)
    } else {
      saveDates.start = startDate || null
      saveDates.end = endDate || null
    }
    
    setIsSaving(true)
    await onSave({
      task_id: task.id,
      description: description || null,
      status,
      start_date: saveDates.start,
      end_date: saveDates.end,
      priority,
      assignee: assignee || null,
    })
    setIsSaving(false)
    onClose()
  }, [task.id, description, status, startDate, endDate, startMonth, endMonth, dateMode, priority, assignee, hasValidDate, onSave, onClose])

  // Handle status change (local only, no save)
  const handleStatusChange = (newStatus: TaskMetadata["status"]) => {
    setStatus(newStatus)
    setShowStatusDropdown(false)
  }

  // Handle priority change (local only, no save)
  const handlePriorityChange = (newPriority: TaskMetadata["priority"]) => {
    setPriority(newPriority)
    setShowPriorityDropdown(false)
  }

  // Handle date change (local only, no save)
  const handleDateChange = (field: "start_date" | "end_date", value: string) => {
    if (field === "start_date") setStartDate(value)
    else setEndDate(value)
  }

  // Handle month selection (local only, no save)
  const handleMonthChange = (field: "start" | "end", monthIndex: number) => {
    if (field === "start") {
      setStartMonth(monthIndex)
      // If start is after end, move end to match
      if (monthIndex > endMonth) {
        setEndMonth(monthIndex)
      }
      setShowStartMonthDropdown(false)
    } else {
      setEndMonth(monthIndex)
      setShowEndMonthDropdown(false)
    }
  }

  // Switch date mode
  const handleDateModeChange = (mode: "specific" | "month") => {
    setDateMode(mode)
    if (mode === "month") {
      // Clear specific dates, will use month selection
      setStartDate("")
      setEndDate("")
    }
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[2]
  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === priority)
  const StatusIcon = currentStatus.icon

  const dateRange = task.startMonth === task.endMonth
    ? MONTHS[task.startMonth]
    : `${MONTHS[task.startMonth]} – ${MONTHS[task.endMonth]}`

  return createPortal(
    <div
      ref={cardRef}
      className={cn(
        "fixed z-[100] transition-opacity duration-150",
        isPositioned ? "opacity-100 animate-in fade-in-0 zoom-in-95" : "opacity-0 pointer-events-none"
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      {/* Arrow pointer - top (when showing below) */}
      {showBelow && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white border-l border-t border-neutral-200 rotate-45"
        />
      )}
      <div
        className="bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden w-[320px] flex flex-col"
        style={{
          boxShadow: "0 20px 60px -15px rgba(0,0,0,0.25), 0 8px 20px -5px rgba(0,0,0,0.1)",
          maxHeight: maxHeight ? `${maxHeight}px` : "calc(100vh - 100px)",
        }}
      >
        {/* Colored accent bar */}
        <div
          className="h-2 shrink-0"
          style={{ backgroundColor: wsConfig?.color || "#6b7280" }}
        />
        
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-semibold text-neutral-900 leading-snug flex-1">
              {task.name}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {isSaving ? (
                <div className="p-0.5">
                  <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                </div>
              ) : hasValidDate ? (
                <button
                  onClick={handleSaveAndClose}
                  className="p-0.5 rounded hover:bg-emerald-50 text-emerald-500 hover:text-emerald-600 transition-colors"
                  title="Save and close"
                >
                  <Check className="w-4 h-4" />
                </button>
              ) : (
                <div className="p-0.5 text-neutral-300" title="Please select a date">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <button
                onClick={onClose}
                className="p-0.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                title="Discard changes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: wsConfig?.bgColor || "#f3f4f6" }}
            />
            <span className="text-[11px] text-neutral-500">
              {wsConfig?.label} · {dateRange}
            </span>
          </div>
        </div>
        
        {/* Content - scrollable when constrained */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              <FileText className="w-3 h-3" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-3 py-2 text-[12px] text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 placeholder:text-neutral-400"
              rows={2}
            />
          </div>

          {/* Status */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              <StatusIcon className="w-3 h-3" />
              Status
            </label>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium rounded-md border transition-colors",
                currentStatus.bg,
                currentStatus.color,
                "border-transparent hover:border-neutral-200"
              )}
            >
              <div className="flex items-center gap-2">
                <StatusIcon className="w-3.5 h-3.5" />
                {currentStatus.label}
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 overflow-hidden">
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-neutral-50",
                        option.color
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                Timeline
              </label>
              {/* Mode toggle */}
              <div className="flex rounded-md border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => handleDateModeChange("month")}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors",
                    dateMode === "month" 
                      ? "bg-neutral-900 text-white" 
                      : "bg-white text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  Month
                </button>
                <button
                  onClick={() => handleDateModeChange("specific")}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors border-l border-neutral-200",
                    dateMode === "specific" 
                      ? "bg-neutral-900 text-white" 
                      : "bg-white text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  Specific Dates
                </button>
              </div>
            </div>
            
            {dateMode === "month" ? (
              /* Month selector mode */
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-[10px] text-neutral-400 mb-1 block">Start Month</label>
                  <button
                    onClick={() => setShowStartMonthDropdown(!showStartMonthDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md hover:border-neutral-300"
                  >
                    {MONTHS[startMonth]}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  {showStartMonthDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {MONTHS.map((month, idx) => (
                        <button
                          key={month}
                          onClick={() => handleMonthChange("start", idx)}
                          className={cn(
                            "w-full px-3 py-1.5 text-[12px] text-left transition-colors hover:bg-neutral-50",
                            idx === startMonth && "bg-neutral-100 font-medium"
                          )}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="text-[10px] text-neutral-400 mb-1 block">End Month <span className="text-neutral-300">(optional)</span></label>
                  <button
                    onClick={() => setShowEndMonthDropdown(!showEndMonthDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md hover:border-neutral-300"
                  >
                    {startMonth === endMonth ? (
                      <span className="text-neutral-400">Single month</span>
                    ) : (
                      MONTHS[endMonth]
                    )}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  {showEndMonthDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {/* Single month option */}
                      <button
                        onClick={() => handleMonthChange("end", startMonth)}
                        className={cn(
                          "w-full px-3 py-1.5 text-[12px] text-left transition-colors border-b border-neutral-100",
                          startMonth === endMonth && "bg-neutral-100 font-medium",
                          "hover:bg-neutral-50"
                        )}
                      >
                        Single month ({MONTHS[startMonth]} only)
                      </button>
                      {MONTHS.map((month, idx) => (
                        <button
                          key={month}
                          onClick={() => handleMonthChange("end", idx)}
                          disabled={idx < startMonth}
                          className={cn(
                            "w-full px-3 py-1.5 text-[12px] text-left transition-colors",
                            idx === endMonth && startMonth !== endMonth && "bg-neutral-100 font-medium",
                            idx < startMonth 
                              ? "text-neutral-300 cursor-not-allowed" 
                              : "hover:bg-neutral-50"
                          )}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Specific dates mode */
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange("start_date", e.target.value)}
                      className="w-full px-3 py-2 text-[12px] text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleDateChange("end_date", e.target.value)}
                      className="w-full px-3 py-2 text-[12px] text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
                    />
                  </div>
                </div>
                {!hasValidDate && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Please select a start date
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              <Flag className="w-3 h-3" />
              Priority
            </label>
            <button
              onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium rounded-md border transition-colors",
                currentPriority ? `${currentPriority.bg} ${currentPriority.color}` : "bg-neutral-50 text-neutral-500",
                "border-transparent hover:border-neutral-200"
              )}
            >
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5" />
                {currentPriority?.label || "Set priority"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            
            {showPriorityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => handlePriorityChange(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
                >
                  <Flag className="w-3.5 h-3.5" />
                  No priority
                </button>
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePriorityChange(option.value)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-neutral-50",
                      option.color
                    )}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              <User className="w-3 h-3" />
              Assignee
            </label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assign to someone..."
              className="w-full px-3 py-2 text-[12px] text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>
      
      {/* Arrow pointer - bottom (when showing above) */}
      {!showBelow && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-neutral-200 rotate-45"
        />
      )}
    </div>,
    document.body
  )
}

interface GanttChartProps {
  tasks: TimelineTask[]
  showLegend?: boolean
  showWorkstreamLabels?: boolean
  compact?: boolean
  highlightCurrentMonth?: boolean
  filterWorkstream?: Workstream
  className?: string
}

export function GanttChart({
  tasks,
  showLegend = true,
  showWorkstreamLabels = true,
  compact = false,
  highlightCurrentMonth = true,
  filterWorkstream,
  className,
}: GanttChartProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [cardPosition, setCardPosition] = useState<HoverCardPosition | null>(null)
  const currentMonth = getCurrentMonthIndex()
  
  // Task metadata from Supabase
  const { getMetadata, saveMetadata } = useTaskMetadata()

  // Find the selected task object
  const selectedTaskData = selectedTask ? tasks.find(t => t.id === selectedTask) : null
  const selectedTaskMetadata = selectedTask ? getMetadata(selectedTask) : undefined

  // Handle task click to open card
  const handleTaskClick = useCallback((task: TimelineTask, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    
    // If clicking the same task, close it
    if (selectedTask === task.id) {
      setSelectedTask(null)
      setCardPosition(null)
      return
    }
    
    setSelectedTask(task.id)
    setCardPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      taskId: task.id,
    })
  }, [selectedTask])

  // Handle close
  const handleClose = useCallback(() => {
    setSelectedTask(null)
    setCardPosition(null)
  }, [])

  // Helper to convert date string to fiscal month index
  const dateToFiscalMonth = useCallback((dateStr: string) => {
    const parts = dateStr.split('-')
    const calendarMonth = parseInt(parts[1], 10) - 1 // 0-11 (Jan=0)
    return calendarMonth === 11 ? 0 : calendarMonth + 1
  }, [])

  // Process tasks with effective dates and recalculate rows to prevent overlaps
  const processedTasks = useMemo(() => {
    // Calculate effective dates for each task
    const tasksWithEffectiveDates = tasks.map(task => {
      const taskMeta = getMetadata(task.id)
      let effectiveStartMonth = task.startMonth
      let effectiveEndMonth = task.endMonth
      
      if (taskMeta?.start_date) {
        effectiveStartMonth = dateToFiscalMonth(taskMeta.start_date)
        if (!taskMeta.end_date) {
          effectiveEndMonth = effectiveStartMonth
        }
      }
      
      if (taskMeta?.end_date) {
        effectiveEndMonth = dateToFiscalMonth(taskMeta.end_date)
      }
      
      // Ensure end is not before start
      if (effectiveEndMonth < effectiveStartMonth) {
        effectiveEndMonth = effectiveStartMonth
      }
      
      return {
        ...task,
        effectiveStartMonth,
        effectiveEndMonth,
      }
    })
    
    // Group by workstream and recalculate rows
    const grouped: Record<Workstream, typeof tasksWithEffectiveDates> = {
      brand: [],
      product: [],
      ecommerce: [],
      regulatory: [],
      packaging: [],
    }
    
    for (const task of tasksWithEffectiveDates) {
      grouped[task.workstream].push(task)
    }
    
    // For each workstream, assign rows to prevent overlaps
    const result: Record<string, typeof tasksWithEffectiveDates[0] & { calculatedRow: number }> = {}
    
    for (const [ws, wsTasks] of Object.entries(grouped)) {
      // Sort tasks by start month, then by original row
      const sortedTasks = [...wsTasks].sort((a, b) => {
        if (a.effectiveStartMonth !== b.effectiveStartMonth) {
          return a.effectiveStartMonth - b.effectiveStartMonth
        }
        return a.row - b.row
      })
      
      // Track which rows are occupied at each month
      const rowOccupancy: { startMonth: number; endMonth: number; row: number }[] = []
      
      for (const task of sortedTasks) {
        // Find the first row where this task can fit
        let assignedRow = 0
        let foundRow = false
        
        while (!foundRow) {
          const conflicts = rowOccupancy.some(
            occ => occ.row === assignedRow &&
              !(task.effectiveEndMonth < occ.startMonth || task.effectiveStartMonth > occ.endMonth)
          )
          
          if (!conflicts) {
            foundRow = true
          } else {
            assignedRow++
          }
        }
        
        rowOccupancy.push({
          startMonth: task.effectiveStartMonth,
          endMonth: task.effectiveEndMonth,
          row: assignedRow,
        })
        
        result[task.id] = { ...task, calculatedRow: assignedRow }
      }
    }
    
    return result
  }, [tasks, getMetadata, dateToFiscalMonth])

  // Group tasks by workstream
  const tasksByWorkstream = useMemo(() => {
    const filtered = filterWorkstream
      ? tasks.filter((t) => t.workstream === filterWorkstream)
      : tasks

    const grouped: Record<Workstream, TimelineTask[]> = {
      brand: [],
      product: [],
      ecommerce: [],
      regulatory: [],
      packaging: [],
    }

    for (const task of filtered) {
      grouped[task.workstream].push(task)
    }

    return grouped
  }, [tasks, filterWorkstream])

  // Calculate row heights for each workstream based on processed tasks
  const workstreamHeights = useMemo(() => {
    const heights: Record<Workstream, number> = {
      brand: 0,
      product: 0,
      ecommerce: 0,
      regulatory: 0,
      packaging: 0,
    }

    for (const [ws, wsTasks] of Object.entries(tasksByWorkstream)) {
      let maxRow = -1
      for (const task of wsTasks) {
        const processed = processedTasks[task.id]
        if (processed) {
          maxRow = Math.max(maxRow, processed.calculatedRow)
        }
      }
      heights[ws as Workstream] = maxRow + 1
    }

    return heights
  }, [tasksByWorkstream, processedTasks])

  const rowHeight = compact ? 28 : 36
  const headerHeight = 40
  const monthWidth = compact ? 80 : 100

  // Get visible workstreams
  const visibleWorkstreams = filterWorkstream
    ? WORKSTREAMS.filter((w) => w.id === filterWorkstream)
    : WORKSTREAMS.filter((w) => workstreamHeights[w.id] > 0)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Legend - Workstream colors */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-neutral-500 font-medium">Workstreams:</span>
            {WORKSTREAMS.map((ws) => (
              <div key={ws.id} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: ws.bgColor }}
                />
                <span className="text-neutral-600">{ws.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Click any task to edit</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="overflow-x-auto border border-neutral-200 rounded-lg bg-white">
        <div
          className="relative"
          style={{
            minWidth: showWorkstreamLabels
              ? 160 + monthWidth * 12
              : monthWidth * 12,
          }}
        >
          {/* Header row with months */}
          <div
            className="flex border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10"
            style={{ height: headerHeight }}
          >
            {/* Workstream label column */}
            {showWorkstreamLabels && (
              <div
                className="shrink-0 border-r border-neutral-200 flex items-center px-3"
                style={{ width: 160 }}
              >
                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  Workstream
                </span>
              </div>
            )}

            {/* Month columns */}
            {MONTHS.map((month, idx) => {
              const isCurrentMonth = idx === currentMonth && highlightCurrentMonth
              return (
                <div
                  key={month}
                  className={cn(
                    "shrink-0 flex items-center justify-center border-r border-neutral-100 text-[12px] font-medium",
                    isCurrentMonth 
                      ? "bg-neutral-900 text-white" 
                      : "bg-neutral-50 text-neutral-700"
                  )}
                  style={{ width: monthWidth }}
                >
                  {month}
                </div>
              )
            })}
          </div>

          {/* Workstream rows */}
          {visibleWorkstreams.map((workstream) => {
            const wsTasks = tasksByWorkstream[workstream.id]
            const rowCount = Math.max(workstreamHeights[workstream.id], 1)

            return (
              <div
                key={workstream.id}
                className="flex border-b border-neutral-100 last:border-b-0"
                style={{ height: rowCount * rowHeight }}
              >
                {/* Workstream label */}
                {showWorkstreamLabels && (
                  <div
                    className="shrink-0 border-r border-neutral-200 flex items-start px-3 py-2 bg-neutral-50/50"
                    style={{ width: 160 }}
                  >
                    <span className="text-[12px] font-medium text-neutral-700">
                      {workstream.label}
                    </span>
                  </div>
                )}

                {/* Task area */}
                <div className="relative flex-1">
                  {/* Month grid lines */}
                  <div className="absolute inset-0 flex">
                    {MONTHS.map((month, idx) => {
                      const isCurrentMonth =
                        idx === currentMonth && highlightCurrentMonth
                      return (
                        <div
                          key={month}
                          className={cn(
                            "shrink-0 border-r border-neutral-100",
                            isCurrentMonth && "bg-neutral-100/50"
                          )}
                          style={{ width: monthWidth }}
                        />
                      )
                    })}
                  </div>

                  {/* Current month indicator line */}
                  {highlightCurrentMonth && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-neutral-900 z-20"
                      style={{
                        left: currentMonth * monthWidth + monthWidth / 2,
                      }}
                    />
                  )}

                  {/* Task bars */}
                  {wsTasks.map((task) => {
                    const wsConfig = getWorkstreamConfig(task.workstream)
                    const taskMeta = getMetadata(task.id)
                    const processed = processedTasks[task.id]
                    
                    if (!processed) return null
                    
                    const { effectiveStartMonth, effectiveEndMonth, calculatedRow } = processed
                    
                    const left = effectiveStartMonth * monthWidth
                    const spanMonths = Math.max(1, effectiveEndMonth - effectiveStartMonth + 1)
                    const width = spanMonths * monthWidth - 8
                    const top = calculatedRow * rowHeight + 4
                    const isSelected = selectedTask === task.id
                    
                    // Use metadata status if available, otherwise use task status
                    const displayStatus = taskMeta?.status || task.status
                    const isCompleted = displayStatus === "completed"

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "absolute rounded px-2 py-1 text-[11px] font-medium truncate cursor-pointer transition-all",
                          "border border-transparent hover:border-neutral-300 hover:shadow-sm",
                          isCompleted && "opacity-60",
                          isSelected && "z-30 shadow-md ring-2 ring-neutral-900/20"
                        )}
                        style={{
                          left: left + 4,
                          width,
                          top,
                          height: rowHeight - 8,
                          backgroundColor: wsConfig?.bgColor || "#f3f4f6",
                          color: wsConfig?.color || "#374151",
                        }}
                        onClick={(e) => handleTaskClick(task, e)}
                      >
                        {task.name}
                        {taskMeta?.priority && (
                          <Flag className="inline-block w-2.5 h-2.5 ml-1 opacity-60" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      {!compact && (
        <div className="flex items-center gap-6 text-[11px] text-neutral-500">
          <span>
            <strong className="text-neutral-700">{tasks.length}</strong> tasks
          </span>
          <span>
            <strong className="text-neutral-700">
              {tasks.filter((t) => {
                const meta = getMetadata(t.id)
                return (meta?.status || t.status) === "completed"
              }).length}
            </strong>{" "}
            completed
          </span>
          <span>
            <strong className="text-neutral-700">
              {tasks.filter((t) => {
                const meta = getMetadata(t.id)
                return (meta?.status || t.status) === "in-progress"
              }).length}
            </strong>{" "}
            in progress
          </span>
          <span>
            <strong className="text-neutral-700">
              {tasks.filter((t) => {
                const meta = getMetadata(t.id)
                const status = meta?.status || t.status
                return status === "upcoming" || status === "not-started"
              }).length}
            </strong>{" "}
            upcoming
          </span>
        </div>
      )}

      {/* Editable Task Card */}
      {selectedTaskData && cardPosition && (
        <EditableTaskCard
          task={selectedTaskData}
          position={{ x: cardPosition.x, y: cardPosition.y }}
          metadata={selectedTaskMetadata}
          onSave={saveMetadata}
          onClose={handleClose}
        />
      )}
    </div>
  )
}

// Mini version for embedding in cards
export function GanttChartMini({
  tasks,
  filterWorkstream,
  className,
}: {
  tasks: TimelineTask[]
  filterWorkstream?: Workstream
  className?: string
}) {
  return (
    <GanttChart
      tasks={tasks}
      filterWorkstream={filterWorkstream}
      showLegend={false}
      showWorkstreamLabels={false}
      compact={true}
      highlightCurrentMonth={true}
      className={className}
    />
  )
}
