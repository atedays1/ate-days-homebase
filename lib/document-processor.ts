import pdf from "pdf-parse"
import * as XLSX from "xlsx"
import { chunkTextSemantically } from "./semantic-chunker"

export interface ProcessedDocument {
  text: string
  pages?: { pageNumber: number; content: string }[]
}

export interface TextChunk {
  content: string
  pageNumber?: number
}

// Process PDF files
export async function processPDF(buffer: Buffer): Promise<ProcessedDocument> {
  const data = await pdf(buffer)
  
  // pdf-parse returns all text, we'll treat it as a single page for simplicity
  // For more advanced page-by-page extraction, consider using pdf-lib or pdfjs-dist
  return {
    text: data.text,
    pages: [{ pageNumber: 1, content: data.text }],
  }
}

// Process Excel/CSV files
export function processSpreadsheet(buffer: Buffer, filename: string): ProcessedDocument {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const allText: string[] = []
  const pages: { pageNumber: number; content: string }[] = []

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON for structured data
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
    
    // Convert rows to text
    const sheetText = jsonData
      .map((row) => {
        if (Array.isArray(row)) {
          return row.filter((cell) => cell !== null && cell !== undefined).join(" | ")
        }
        return ""
      })
      .filter((row) => row.trim() !== "")
      .join("\n")

    if (sheetText) {
      allText.push(`[Sheet: ${sheetName}]\n${sheetText}`)
      pages.push({ pageNumber: index + 1, content: sheetText })
    }
  })

  return {
    text: allText.join("\n\n"),
    pages,
  }
}

// Process document based on file type
export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessedDocument> {
  if (mimeType === "application/pdf") {
    return processPDF(buffer)
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "text/csv"
  ) {
    return processSpreadsheet(buffer, filename)
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

// Chunk text into smaller pieces for embedding
// Uses semantic chunking to preserve context and structure
export function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 150
): string[] {
  return chunkTextSemantically(text, maxChunkSize, overlap)
}

// Create chunks with page information
export function createChunksWithPages(
  processedDoc: ProcessedDocument,
  maxChunkSize: number = 1000,
  overlap: number = 100
): TextChunk[] {
  const result: TextChunk[] = []

  if (processedDoc.pages && processedDoc.pages.length > 0) {
    // Process each page separately to maintain page references
    for (const page of processedDoc.pages) {
      const pageChunks = chunkText(page.content, maxChunkSize, overlap)
      for (const content of pageChunks) {
        result.push({
          content,
          pageNumber: page.pageNumber,
        })
      }
    }
  } else {
    // Fall back to full text chunking
    const chunks = chunkText(processedDoc.text, maxChunkSize, overlap)
    for (const content of chunks) {
      result.push({ content })
    }
  }

  return result
}

// Get file type from mime type
export function getFileType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.ms-excel": "Excel",
    "text/csv": "CSV",
  }
  return typeMap[mimeType] || "Unknown"
}

// Supported mime types
export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType)
}
