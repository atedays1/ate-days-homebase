// Google Sheets API integration
// Server-side only - uses googleapis

import { google } from "googleapis"

export interface SheetData {
  values: string[][]
  range: string
}

export interface SpreadsheetInfo {
  id: string
  title: string
  sheets: { sheetId: number; title: string }[]
}

/**
 * Create an authenticated Google Sheets client using service account
 * This doesn't require user login and never expires
 */
function createServiceAccountClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set")
  }
  
  try {
    const serviceAccount = JSON.parse(credentials)
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })
    
    return google.sheets({ version: "v4", auth })
  } catch (error) {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.")
  }
}

/**
 * Create an authenticated Google Sheets client using OAuth access token
 * @deprecated Use service account instead for production
 */
function createOAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.sheets({ version: "v4", auth })
}

/**
 * Check if service account is configured
 */
export function isServiceAccountConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
}

/**
 * Create an authenticated Google Sheets client
 * Prefers service account, falls back to OAuth if access token provided
 */
function createSheetsClient(accessToken?: string) {
  // Prefer service account if configured
  if (isServiceAccountConfigured()) {
    return createServiceAccountClient()
  }
  
  // Fall back to OAuth
  if (accessToken) {
    return createOAuthClient(accessToken)
  }
  
  throw new Error("No authentication configured. Set GOOGLE_SERVICE_ACCOUNT_KEY or provide an access token.")
}

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetInfo(
  spreadsheetId: string,
  accessToken?: string
): Promise<SpreadsheetInfo> {
  const sheets = createSheetsClient(accessToken)
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetId,properties.title,sheets.properties",
  })
  
  return {
    id: response.data.spreadsheetId || spreadsheetId,
    title: response.data.properties?.title || "Untitled",
    sheets: response.data.sheets?.map(s => ({
      sheetId: s.properties?.sheetId || 0,
      title: s.properties?.title || "Sheet",
    })) || [],
  }
}

/**
 * Fetch data from a specific range in a spreadsheet
 */
export async function getSheetData(
  spreadsheetId: string,
  range: string,
  accessToken?: string
): Promise<SheetData> {
  const sheets = createSheetsClient(accessToken)
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  })
  
  return {
    values: (response.data.values as string[][]) || [],
    range: response.data.range || range,
  }
}

/**
 * Fetch the entire first sheet of a spreadsheet
 */
export async function getFullSheet(
  spreadsheetId: string,
  sheetName?: string,
  accessToken?: string
): Promise<SheetData> {
  const sheets = createSheetsClient(accessToken)
  
  // If no sheet name provided, get the first sheet
  let targetSheet = sheetName
  if (!targetSheet) {
    const info = await getSpreadsheetInfo(spreadsheetId, accessToken)
    targetSheet = info.sheets[0]?.title || "Sheet1"
  }
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: targetSheet,
    valueRenderOption: "FORMATTED_VALUE",
  })
  
  return {
    values: (response.data.values as string[][]) || [],
    range: response.data.range || targetSheet,
  }
}

/**
 * Get sheet data with cell formatting (for colors)
 */
export async function getSheetWithFormatting(
  spreadsheetId: string,
  sheetName?: string,
  accessToken?: string
): Promise<{
  values: string[][]
  backgrounds: (string | null)[][]
}> {
  const sheets = createSheetsClient(accessToken)
  
  // Get spreadsheet info to find sheet ID
  const info = await getSpreadsheetInfo(spreadsheetId, accessToken)
  const targetSheet = sheetName 
    ? info.sheets.find(s => s.title === sheetName) 
    : info.sheets[0]
  
  if (!targetSheet) {
    throw new Error(`Sheet "${sheetName || "first sheet"}" not found`)
  }
  
  // Get both values and formatting
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [targetSheet.title],
    includeGridData: true,
  })
  
  const sheetData = response.data.sheets?.[0]?.data?.[0]
  const rowData = sheetData?.rowData || []
  
  const values: string[][] = []
  const backgrounds: (string | null)[][] = []
  
  for (const row of rowData) {
    const rowValues: string[] = []
    const rowBackgrounds: (string | null)[] = []
    
    for (const cell of row.values || []) {
      // Get formatted value
      rowValues.push(cell.formattedValue || "")
      
      // Get background color
      const bg = cell.effectiveFormat?.backgroundColor
      if (bg && (bg.red !== 1 || bg.green !== 1 || bg.blue !== 1)) {
        const r = Math.round((bg.red || 0) * 255)
        const g = Math.round((bg.green || 0) * 255)
        const b = Math.round((bg.blue || 0) * 255)
        rowBackgrounds.push(`rgb(${r},${g},${b})`)
      } else {
        rowBackgrounds.push(null)
      }
    }
    
    values.push(rowValues)
    backgrounds.push(rowBackgrounds)
  }
  
  return { values, backgrounds }
}
