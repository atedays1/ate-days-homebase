// Timeline parser - converts Google Sheets data to TimelineTask structure

import {
  TimelineTask,
  TimelineData,
  Workstream,
  PHASES,
  getMonthIndex,
  getTaskStatus,
  getPhaseForMonth,
} from "./timeline-types"

// Map row labels to workstream IDs - more flexible matching
const WORKSTREAM_PATTERNS: { pattern: RegExp; workstream: Workstream }[] = [
  { pattern: /^brand$/i, workstream: "brand" },
  { pattern: /^product$/i, workstream: "product" },
  { pattern: /^ecommerce$/i, workstream: "ecommerce" },
  { pattern: /^e-commerce$/i, workstream: "ecommerce" },
  { pattern: /^regulatory/i, workstream: "regulatory" },
  { pattern: /^packaging$/i, workstream: "packaging" },
]

function detectWorkstream(text: string): Workstream | null {
  const cleaned = text.trim()
  for (const { pattern, workstream } of WORKSTREAM_PATTERNS) {
    if (pattern.test(cleaned)) {
      return workstream
    }
  }
  return null
}

/**
 * Parse the timeline spreadsheet into structured data
 * 
 * Handles various spreadsheet layouts:
 * - Finds month headers anywhere in the first 10 rows
 * - Detects workstream labels in any column
 * - Extracts tasks from cells in the month columns
 */
export function parseTimelineSheet(
  values: string[][],
  backgrounds?: (string | null)[][]
): TimelineData {
  const tasks: TimelineTask[] = []
  
  console.log(`[Timeline Parser] Received ${values.length} rows`)
  
  if (values.length < 2) {
    console.warn("[Timeline Parser] Not enough rows in spreadsheet")
    return { tasks: [], phases: PHASES, lastUpdated: new Date().toISOString() }
  }
  
  // Log first few rows for debugging
  for (let i = 0; i < Math.min(5, values.length); i++) {
    console.log(`[Timeline Parser] Row ${i}:`, values[i]?.slice(0, 15))
  }
  
  // Find the header row with months - scan first 10 rows
  let monthRowIndex = -1
  const colToMonth: Map<number, number> = new Map()
  
  for (let rowIdx = 0; rowIdx < Math.min(10, values.length); rowIdx++) {
    const row = values[rowIdx]
    if (!row) continue
    
    let monthsFoundInRow = 0
    const tempColToMonth: Map<number, number> = new Map()
    
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = (row[colIdx] || "").toString().trim()
      const monthIndex = getMonthIndex(cell)
      if (monthIndex !== undefined) {
        tempColToMonth.set(colIdx, monthIndex)
        monthsFoundInRow++
        console.log(`[Timeline Parser] Found month "${cell}" -> ${monthIndex} at col ${colIdx}`)
      }
    }
    
    // If we found at least 6 months in this row, use it as the header
    if (monthsFoundInRow >= 6) {
      monthRowIndex = rowIdx
      tempColToMonth.forEach((month, col) => colToMonth.set(col, month))
      console.log(`[Timeline Parser] Found month header at row ${rowIdx} with ${monthsFoundInRow} months`)
      break
    }
  }
  
  if (monthRowIndex === -1 || colToMonth.size === 0) {
    console.warn("[Timeline Parser] Could not find month headers in spreadsheet")
    console.log("[Timeline Parser] Looking for months like: Dec, Jan, Feb, Mar, Apr, May, June, July, Aug, Sep, Oct, Nov")
    return { tasks: [], phases: PHASES, lastUpdated: new Date().toISOString() }
  }
  
  // Get the range of month columns
  const monthCols = Array.from(colToMonth.keys()).sort((a, b) => a - b)
  const minMonthCol = monthCols[0]
  const maxMonthCol = monthCols[monthCols.length - 1]
  
  console.log(`[Timeline Parser] Month columns: ${minMonthCol} to ${maxMonthCol}`)
  console.log(`[Timeline Parser] Column to month mapping:`, Object.fromEntries(colToMonth))
  
  // Parse data rows - start after the month header row
  let currentWorkstream: Workstream | null = null
  let workstreamRowCount: Record<Workstream, number> = {
    brand: 0,
    product: 0,
    ecommerce: 0,
    regulatory: 0,
    packaging: 0,
  }
  let taskId = 0
  
  for (let rowIdx = monthRowIndex + 1; rowIdx < values.length; rowIdx++) {
    const row = values[rowIdx]
    if (!row || row.length === 0) continue
    
    // Check all cells before the first month column for workstream labels
    let detectedWorkstream: Workstream | null = null
    for (let col = 0; col < minMonthCol && col < row.length; col++) {
      const cellValue = (row[col] || "").toString()
      const ws = detectWorkstream(cellValue)
      if (ws) {
        detectedWorkstream = ws
        break
      }
    }
    
    if (detectedWorkstream) {
      currentWorkstream = detectedWorkstream
      console.log(`[Timeline Parser] Found workstream "${detectedWorkstream}" at row ${rowIdx}`)
    }
    
    // Skip rows until we find a workstream
    if (!currentWorkstream) continue
    
    // Collect all non-empty cells in month columns
    const cellsInRow: { col: number; name: string; month: number }[] = []
    
    for (let col = minMonthCol; col <= maxMonthCol && col < row.length; col++) {
      const cellValue = (row[col] || "").toString().trim()
      const month = colToMonth.get(col)
      
      // Skip cells that look like they're just month headers repeated or empty
      if (cellValue && cellValue.length > 0 && month !== undefined) {
        // Don't include cells that are just month names (could be repeated headers)
        if (getMonthIndex(cellValue) === undefined) {
          cellsInRow.push({ col, name: cellValue, month })
        }
      }
    }
    
    // Process cells into tasks
    // Group consecutive cells with the same name as spanning tasks
    let i = 0
    while (i < cellsInRow.length) {
      const startCell = cellsInRow[i]
      let endMonth = startCell.month
      let endCol = startCell.col
      
      // Look for consecutive cells with the same task name (merged/spanning task)
      let j = i + 1
      while (j < cellsInRow.length) {
        const nextCell = cellsInRow[j]
        // Check if adjacent column and same name (or adjacent month for spanning)
        if (nextCell.col === endCol + 1 && nextCell.name === startCell.name) {
          endMonth = nextCell.month
          endCol = nextCell.col
          j++
        } else {
          break
        }
      }
      
      // Determine phase based on start month
      const phase = getPhaseForMonth(startCell.month)
      
      tasks.push({
        id: `task-${++taskId}`,
        name: startCell.name,
        workstream: currentWorkstream,
        startMonth: startCell.month,
        endMonth: endMonth,
        phase: phase?.id || 1,
        status: getTaskStatus(startCell.month, endMonth),
        row: workstreamRowCount[currentWorkstream],
      })
      
      i = j
    }
    
    // Increment row count for this workstream if we found tasks or just set the workstream
    if (cellsInRow.length > 0) {
      workstreamRowCount[currentWorkstream]++
    }
  }
  
  console.log(`[Timeline Parser] Extracted ${tasks.length} tasks`)
  
  return {
    tasks,
    phases: PHASES,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Filter tasks by workstream
 */
export function filterByWorkstream(
  tasks: TimelineTask[],
  workstream: Workstream
): TimelineTask[] {
  return tasks.filter(t => t.workstream === workstream)
}

/**
 * Get tasks for the current month
 */
export function getCurrentMonthTasks(tasks: TimelineTask[]): TimelineTask[] {
  return tasks.filter(t => t.status === "in-progress")
}

/**
 * Get upcoming tasks (next 2 months)
 */
export function getUpcomingTasks(tasks: TimelineTask[]): TimelineTask[] {
  const now = new Date()
  const currentMonth = now.getMonth()
  // Convert to fiscal year index (Dec = 0)
  const fiscalMonth = currentMonth === 11 ? 0 : currentMonth + 1
  const upcomingEnd = (fiscalMonth + 2) % 12
  
  return tasks.filter(t => {
    if (t.status === "completed") return false
    return t.startMonth <= upcomingEnd && t.endMonth >= fiscalMonth
  })
}

/**
 * Calculate completion percentage
 */
export function getCompletionStats(tasks: TimelineTask[]): {
  completed: number
  inProgress: number
  upcoming: number
  total: number
  percentComplete: number
} {
  const completed = tasks.filter(t => t.status === "completed").length
  const inProgress = tasks.filter(t => t.status === "in-progress").length
  const upcoming = tasks.filter(t => t.status === "upcoming").length
  const total = tasks.length
  
  return {
    completed,
    inProgress,
    upcoming,
    total,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}
