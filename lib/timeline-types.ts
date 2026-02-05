// Timeline data types for Google Sheets integration

export type Workstream = "brand" | "product" | "ecommerce" | "regulatory" | "packaging"

export interface TimelineTask {
  id: string
  name: string
  workstream: Workstream
  startMonth: number // 0 = Dec, 1 = Jan, ..., 11 = Nov
  endMonth: number
  phase: number // 1-6
  status: "completed" | "in-progress" | "upcoming"
  row: number // Row index within workstream for sub-task grouping
}

export interface TimelinePhase {
  id: number
  name: string
  color: string
  bgColor: string
  startMonth: number
  endMonth: number
}

export interface TimelineData {
  tasks: TimelineTask[]
  phases: TimelinePhase[]
  lastUpdated: string
}

// Month mapping: fiscal year starting December
export const MONTHS = [
  "Dec", "Jan", "Feb", "Mar", "Apr", "May", 
  "June", "July", "Aug", "Sep", "Oct", "Nov"
] as const

// Month variations - keys should be lowercase for case-insensitive matching
const MONTH_INDEX_LOWER: Record<string, number> = {
  "dec": 0, "december": 0,
  "jan": 1, "january": 1,
  "feb": 2, "february": 2,
  "mar": 3, "march": 3,
  "apr": 4, "april": 4,
  "may": 5,
  "jun": 6, "june": 6,
  "jul": 7, "july": 7,
  "aug": 8, "august": 8,
  "sep": 9, "sept": 9, "september": 9,
  "oct": 10, "october": 10,
  "nov": 11, "november": 11,
}

// Export a function for case-insensitive lookup
export function getMonthIndex(text: string): number | undefined {
  const cleaned = text.trim().toLowerCase()
  return MONTH_INDEX_LOWER[cleaned]
}

// Keep MONTH_INDEX for backward compatibility but add all variations
export const MONTH_INDEX: Record<string, number> = {
  // Lowercase
  "dec": 0, "december": 0,
  "jan": 1, "january": 1,
  "feb": 2, "february": 2,
  "mar": 3, "march": 3,
  "apr": 4, "april": 4,
  "may": 5,
  "jun": 6, "june": 6,
  "jul": 7, "july": 7,
  "aug": 8, "august": 8,
  "sep": 9, "sept": 9, "september": 9,
  "oct": 10, "october": 10,
  "nov": 11, "november": 11,
  // Title case
  "Dec": 0, "December": 0,
  "Jan": 1, "January": 1,
  "Feb": 2, "February": 2,
  "Mar": 3, "March": 3,
  "Apr": 4, "April": 4,
  "May": 5,
  "Jun": 6, "June": 6,
  "Jul": 7, "July": 7,
  "Aug": 8, "August": 8,
  "Sep": 9, "Sept": 9, "September": 9,
  "Oct": 10, "October": 10,
  "Nov": 11, "November": 11,
  // Uppercase
  "DEC": 0, "DECEMBER": 0,
  "JAN": 1, "JANUARY": 1,
  "FEB": 2, "FEBRUARY": 2,
  "MAR": 3, "MARCH": 3,
  "APR": 4, "APRIL": 4,
  "MAY": 5,
  "JUN": 6, "JUNE": 6,
  "JUL": 7, "JULY": 7,
  "AUG": 8, "AUGUST": 8,
  "SEP": 9, "SEPT": 9, "SEPTEMBER": 9,
  "OCT": 10, "OCTOBER": 10,
  "NOV": 11, "NOVEMBER": 11,
}

// Workstream configuration with colors matching the spreadsheet
export const WORKSTREAMS: { id: Workstream; label: string; color: string; bgColor: string }[] = [
  { id: "brand", label: "Brand", color: "#ca8a04", bgColor: "#fef9c3" },           // Yellow
  { id: "product", label: "Product", color: "#2563eb", bgColor: "#dbeafe" },       // Blue
  { id: "ecommerce", label: "Ecommerce", color: "#16a34a", bgColor: "#dcfce7" },   // Green
  { id: "regulatory", label: "Regulatory & Market Readiness", color: "#ea580c", bgColor: "#fed7aa" }, // Orange
  { id: "packaging", label: "Packaging", color: "#525252", bgColor: "#e5e5e5" },   // Grey
]

// Helper to get workstream config
export function getWorkstreamConfig(workstream: Workstream) {
  return WORKSTREAMS.find(w => w.id === workstream)
}

// Phase configuration matching the spreadsheet colors
export const PHASES: TimelinePhase[] = [
  { 
    id: 1, 
    name: "Intelligence & Foundation", 
    color: "#3b82f6",
    bgColor: "#dbeafe", 
    startMonth: 0, 
    endMonth: 3 
  },
  { 
    id: 2, 
    name: "Product & Pricing Strategy", 
    color: "#22c55e",
    bgColor: "#dcfce7", 
    startMonth: 4, 
    endMonth: 6 
  },
  { 
    id: 3, 
    name: "Content & Sales Enablement", 
    color: "#eab308",
    bgColor: "#fef9c3", 
    startMonth: 7, 
    endMonth: 8 
  },
  { 
    id: 4, 
    name: "Content Distribution (Demand Gen)", 
    color: "#f97316",
    bgColor: "#fed7aa", 
    startMonth: 4, 
    endMonth: 8 
  },
  { 
    id: 5, 
    name: "Launch", 
    color: "#ef4444",
    bgColor: "#fee2e2", 
    startMonth: 10, 
    endMonth: 10 
  },
  { 
    id: 6, 
    name: "Optimization", 
    color: "#dc2626",
    bgColor: "#fecaca", 
    startMonth: 11, 
    endMonth: 11 
  },
]

// Get phase for a given month
export function getPhaseForMonth(month: number): TimelinePhase | undefined {
  // Check phases in reverse order (later phases take priority for overlaps)
  for (let i = PHASES.length - 1; i >= 0; i--) {
    const phase = PHASES[i]
    if (month >= phase.startMonth && month <= phase.endMonth) {
      return phase
    }
  }
  return undefined
}

// Get current month index (0 = Dec, based on fiscal year)
export function getCurrentMonthIndex(): number {
  const now = new Date()
  const month = now.getMonth() // 0 = January
  // Convert to fiscal year (Dec = 0)
  // December (11) -> 0, January (0) -> 1, etc.
  if (month === 11) return 0 // December
  return month + 1
}

// Calculate task status based on current date
export function getTaskStatus(
  startMonth: number, 
  endMonth: number
): "completed" | "in-progress" | "upcoming" {
  const currentMonth = getCurrentMonthIndex()
  
  if (endMonth < currentMonth) {
    return "completed"
  } else if (startMonth <= currentMonth && endMonth >= currentMonth) {
    return "in-progress"
  }
  return "upcoming"
}
