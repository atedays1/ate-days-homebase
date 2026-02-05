import { NextRequest, NextResponse } from "next/server"
import { getFullSheet, getSheetWithFormatting, isServiceAccountConfigured } from "@/lib/google-sheets"
import { parseTimelineSheet } from "@/lib/timeline-parser"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    // Get parameters from query string
    const searchParams = request.nextUrl.searchParams
    const spreadsheetId = searchParams.get("spreadsheetId")
    const sheetName = searchParams.get("sheetName") || undefined
    const includeFormatting = searchParams.get("formatting") === "true"
    
    // Get access token from Authorization header (optional if service account configured)
    const authHeader = request.headers.get("Authorization")
    const accessToken = authHeader?.replace("Bearer ", "") || undefined
    
    // Check if we have authentication
    if (!isServiceAccountConfigured() && !accessToken) {
      return NextResponse.json(
        { error: "Missing access token. Please sign in with Google or configure a service account." },
        { status: 401 }
      )
    }
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Missing spreadsheetId parameter" },
        { status: 400 }
      )
    }
    
    // Check if debug mode is requested
    const debug = searchParams.get("debug") === "true"
    
    // Fetch sheet data (will use service account if configured, otherwise OAuth)
    let values: string[][]
    let backgrounds: (string | null)[][] | undefined
    
    console.log(`[Timeline API] Fetching spreadsheet: ${spreadsheetId} (using ${isServiceAccountConfigured() ? "service account" : "OAuth"})`)
    
    if (includeFormatting) {
      const result = await getSheetWithFormatting(spreadsheetId, sheetName, accessToken)
      values = result.values
      backgrounds = result.backgrounds
    } else {
      const result = await getFullSheet(spreadsheetId, sheetName, accessToken)
      values = result.values
    }
    
    console.log(`[Timeline API] Received ${values.length} rows from Google Sheets`)
    
    // Log first few rows for debugging
    if (values.length > 0) {
      console.log(`[Timeline API] First row (${values[0]?.length} cols):`, values[0]?.slice(0, 15))
      if (values.length > 1) {
        console.log(`[Timeline API] Second row:`, values[1]?.slice(0, 15))
      }
      if (values.length > 2) {
        console.log(`[Timeline API] Third row:`, values[2]?.slice(0, 15))
      }
    }
    
    // Parse the timeline data
    const timelineData = parseTimelineSheet(values, backgrounds)
    
    console.log(`[Timeline API] Parsed ${timelineData.tasks.length} tasks`)
    
    // In debug mode, include raw data sample
    const response: Record<string, unknown> = {
      success: true,
      data: timelineData,
      meta: {
        spreadsheetId,
        sheetName,
        rowCount: values.length,
        colCount: values[0]?.length || 0,
        taskCount: timelineData.tasks.length,
      },
    }
    
    if (debug) {
      response.debug = {
        firstRows: values.slice(0, 10).map(row => row?.slice(0, 20)),
        columnCount: values[0]?.length || 0,
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching timeline:", error)
    
    // Handle specific Google API errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("Invalid Credentials")) {
      return NextResponse.json(
        { error: "Invalid or expired token. Please sign in again." },
        { status: 401 }
      )
    }
    
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return NextResponse.json(
        { error: "Spreadsheet not found. Check the spreadsheet ID." },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes("permission") || errorMessage.includes("403")) {
      return NextResponse.json(
        { error: "Permission denied. Make sure you have access to this spreadsheet." },
        { status: 403 }
      )
    }
    
    // Check if it's an auth error from requireAuth
    if (error instanceof Response) {
      return error
    }
    
    return NextResponse.json(
      { error: `Failed to fetch timeline: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // POST can be used to parse raw sheet data without fetching
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const body = await request.json()
    const { values, backgrounds } = body
    
    if (!values || !Array.isArray(values)) {
      return NextResponse.json(
        { error: "Missing or invalid 'values' array" },
        { status: 400 }
      )
    }
    
    const timelineData = parseTimelineSheet(values, backgrounds)
    
    return NextResponse.json({
      success: true,
      data: timelineData,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error parsing timeline:", error)
    return NextResponse.json(
      { error: "Failed to parse timeline data" },
      { status: 500 }
    )
  }
}
