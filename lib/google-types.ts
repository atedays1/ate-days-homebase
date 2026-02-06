// MIME type mappings for Google Workspace files
// This file can be imported from both client and server components

export const GOOGLE_MIME_TYPES = {
  GOOGLE_DOC: "application/vnd.google-apps.document",
  GOOGLE_SHEET: "application/vnd.google-apps.spreadsheet",
  GOOGLE_SLIDES: "application/vnd.google-apps.presentation",
  PDF: "application/pdf",
  PLAIN_TEXT: "text/plain",
  CSV: "text/csv",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

// Map Google Workspace types to export formats
// Note: Export Sheets as XLSX to capture all sheets (CSV only exports first sheet)
export const EXPORT_MIME_MAP: Record<string, string> = {
  [GOOGLE_MIME_TYPES.GOOGLE_DOC]: GOOGLE_MIME_TYPES.PDF,
  [GOOGLE_MIME_TYPES.GOOGLE_SHEET]: GOOGLE_MIME_TYPES.XLSX,
  [GOOGLE_MIME_TYPES.GOOGLE_SLIDES]: GOOGLE_MIME_TYPES.PDF,
}

// Supported file types for import
export const SUPPORTED_DRIVE_TYPES = [
  GOOGLE_MIME_TYPES.GOOGLE_DOC,
  GOOGLE_MIME_TYPES.GOOGLE_SHEET,
  GOOGLE_MIME_TYPES.PDF,
  GOOGLE_MIME_TYPES.XLSX,
  "application/vnd.ms-excel",
  "text/csv",
]

export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

export interface DownloadedFile {
  content: Buffer
  mimeType: string
  name: string
}

export function getGoogleFileTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case GOOGLE_MIME_TYPES.GOOGLE_DOC:
      return "Google Doc"
    case GOOGLE_MIME_TYPES.GOOGLE_SHEET:
      return "Google Sheet"
    case GOOGLE_MIME_TYPES.GOOGLE_SLIDES:
      return "Google Slides"
    case GOOGLE_MIME_TYPES.PDF:
      return "PDF"
    case GOOGLE_MIME_TYPES.XLSX:
    case "application/vnd.ms-excel":
      return "Spreadsheet"
    case "text/csv":
      return "CSV"
    default:
      return "Document"
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  )
}
