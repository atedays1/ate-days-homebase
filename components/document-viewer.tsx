"use client"

import { useState, useEffect, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import * as XLSX from "xlsx"
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Image as ImageIcon,
  Table,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface DocumentViewerProps {
  documentId: string
  documentName: string
  documentType: string
  onClose: () => void
}

type ViewerMode = "pdf" | "image" | "spreadsheet" | "text" | "loading" | "error"

interface SpreadsheetData {
  headers: string[]
  rows: string[][]
  sheetNames: string[]
  activeSheet: number
}

export function DocumentViewer({
  documentId,
  documentName,
  documentType,
  onClose,
}: DocumentViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [viewerMode, setViewerMode] = useState<ViewerMode>("loading")
  const [error, setError] = useState<string | null>(null)

  // PDF state
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfScale, setPdfScale] = useState(1.0)

  // Image state
  const [imageScale, setImageScale] = useState(1.0)

  // Spreadsheet state
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null)

  // Text state
  const [textContent, setTextContent] = useState<string | null>(null)

  // Determine viewer mode based on document type
  const getViewerMode = (type: string, url: string): ViewerMode => {
    const lowerType = type.toLowerCase()
    
    // Check by document type field
    if (lowerType.includes("pdf")) return "pdf"
    if (lowerType.includes("image") || lowerType.includes("png") || lowerType.includes("jpg") || lowerType.includes("jpeg") || lowerType.includes("gif") || lowerType.includes("webp")) return "image"
    if (lowerType.includes("spreadsheet") || lowerType.includes("excel") || lowerType.includes("csv")) return "spreadsheet"
    if (lowerType.includes("text") || lowerType.includes("document")) return "text"

    // Check by file extension in URL
    const urlLower = url.toLowerCase()
    if (urlLower.includes(".pdf")) return "pdf"
    if (urlLower.includes(".png") || urlLower.includes(".jpg") || urlLower.includes(".jpeg") || urlLower.includes(".gif") || urlLower.includes(".webp")) return "image"
    if (urlLower.includes(".xlsx") || urlLower.includes(".xls") || urlLower.includes(".csv")) return "spreadsheet"
    if (urlLower.includes(".txt") || urlLower.includes(".md")) return "text"

    // Default to text for unknown types
    return "text"
  }

  // Fetch the file URL on mount
  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        const response = await fetch(`/api/documents/file?id=${documentId}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Failed to load file")
          setViewerMode("error")
          return
        }

        setFileUrl(data.url)
        const mode = getViewerMode(documentType, data.url)
        setViewerMode(mode)

        // Load spreadsheet data if needed
        if (mode === "spreadsheet") {
          loadSpreadsheet(data.url)
        } else if (mode === "text") {
          loadTextContent(data.url)
        }
      } catch (err) {
        console.error("Error fetching file:", err)
        setError("Failed to load document")
        setViewerMode("error")
      }
    }

    fetchFileUrl()
  }, [documentId, documentType])

  // Load spreadsheet data
  const loadSpreadsheet = async (url: string) => {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      const sheetNames = workbook.SheetNames
      const firstSheet = workbook.Sheets[sheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })

      if (jsonData.length > 0) {
        setSpreadsheetData({
          headers: (jsonData[0] || []).map(String),
          rows: jsonData.slice(1).map(row => (row || []).map(cell => String(cell ?? ""))),
          sheetNames,
          activeSheet: 0,
        })
      }
    } catch (err) {
      console.error("Error loading spreadsheet:", err)
      setError("Failed to parse spreadsheet")
      setViewerMode("error")
    }
  }

  // Load text content
  const loadTextContent = async (url: string) => {
    try {
      const response = await fetch(url)
      const text = await response.text()
      setTextContent(text)
    } catch (err) {
      console.error("Error loading text:", err)
      setError("Failed to load text content")
      setViewerMode("error")
    }
  }

  // Switch spreadsheet sheet
  const switchSheet = async (sheetIndex: number) => {
    if (!fileUrl || !spreadsheetData) return
    
    try {
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      const sheetName = spreadsheetData.sheetNames[sheetIndex]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

      if (jsonData.length > 0) {
        setSpreadsheetData({
          ...spreadsheetData,
          headers: (jsonData[0] || []).map(String),
          rows: jsonData.slice(1).map(row => (row || []).map(cell => String(cell ?? ""))),
          activeSheet: sheetIndex,
        })
      }
    } catch (err) {
      console.error("Error switching sheet:", err)
    }
  }

  // PDF handlers
  const onPdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const changePage = (delta: number) => {
    setPageNumber((prev) => Math.min(Math.max(1, prev + delta), numPages))
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (viewerMode === "pdf") {
        if (e.key === "ArrowLeft") {
          changePage(-1)
        } else if (e.key === "ArrowRight") {
          changePage(1)
        } else if (e.key === "+" || e.key === "=") {
          setPdfScale((s) => Math.min(s + 0.25, 3))
        } else if (e.key === "-") {
          setPdfScale((s) => Math.max(s - 0.25, 0.5))
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, viewerMode, numPages])

  // Handle download
  const handleDownload = () => {
    if (!fileUrl) return
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = documentName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render appropriate viewer
  const renderViewer = () => {
    switch (viewerMode) {
      case "loading":
        return (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading document...</span>
          </div>
        )

      case "error":
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Unable to display document</p>
            <p className="text-sm mt-2">{error || "This document cannot be viewed"}</p>
          </div>
        )

      case "pdf":
        return (
          <div className="flex flex-col items-center overflow-auto h-full py-4">
            <Document
              file={fileUrl}
              onLoadSuccess={onPdfLoadSuccess}
              loading={
                <div className="flex items-center">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading PDF...
                </div>
              }
              error={
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={pdfScale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        )

      case "image":
        return (
          <div className="flex items-center justify-center h-full overflow-auto p-4">
            <img
              src={fileUrl!}
              alt={documentName}
              style={{ transform: `scale(${imageScale})`, maxWidth: "100%", maxHeight: "100%" }}
              className="object-contain transition-transform"
            />
          </div>
        )

      case "spreadsheet":
        if (!spreadsheetData) {
          return (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )
        }
        
        // Helper to convert column index to letter (0 = A, 1 = B, etc.)
        const getColumnLetter = (idx: number): string => {
          let letter = ""
          let temp = idx
          while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter
            temp = Math.floor(temp / 26) - 1
          }
          return letter
        }
        
        // Calculate max columns needed
        const maxCols = Math.max(
          spreadsheetData.headers.length,
          ...spreadsheetData.rows.map(r => r.length)
        )
        
        return (
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Sheet tabs */}
            {spreadsheetData.sheetNames.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-neutral-100">
                {spreadsheetData.sheetNames.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => switchSheet(idx)}
                    className={`px-4 py-1.5 text-[13px] rounded-t border-x border-t transition-colors ${
                      idx === spreadsheetData.activeSheet
                        ? "bg-white border-neutral-300 text-neutral-900 font-medium -mb-px"
                        : "bg-neutral-200 border-transparent text-neutral-600 hover:bg-neutral-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            
            {/* Spreadsheet grid */}
            <div className="flex-1 overflow-auto">
              <table className="border-collapse w-full">
                {/* Column headers (A, B, C...) */}
                <thead className="sticky top-0 z-20">
                  {/* Column letter row */}
                  <tr className="bg-neutral-100">
                    <th className="sticky left-0 z-30 w-12 min-w-[48px] bg-neutral-200 border-b border-r border-neutral-300" />
                    {Array.from({ length: maxCols }, (_, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-1 text-[11px] font-medium text-neutral-500 text-center border-b border-r border-neutral-300 bg-neutral-100 min-w-[100px]"
                      >
                        {getColumnLetter(idx)}
                      </th>
                    ))}
                  </tr>
                  {/* Data header row */}
                  <tr className="bg-neutral-50">
                    <th className="sticky left-0 z-30 w-12 min-w-[48px] bg-neutral-200 border-b border-r border-neutral-300 text-[11px] font-medium text-neutral-500">
                      1
                    </th>
                    {spreadsheetData.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2 text-[13px] font-semibold text-neutral-800 text-left border-b border-r border-neutral-300 bg-neutral-50 whitespace-nowrap"
                      >
                        {header || ""}
                      </th>
                    ))}
                    {/* Fill remaining columns */}
                    {Array.from({ length: maxCols - spreadsheetData.headers.length }, (_, idx) => (
                      <th
                        key={`empty-${idx}`}
                        className="px-3 py-2 border-b border-r border-neutral-300 bg-neutral-50"
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spreadsheetData.rows.slice(0, 1000).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}
                    >
                      {/* Row number */}
                      <td className="sticky left-0 z-10 w-12 min-w-[48px] bg-neutral-100 border-b border-r border-neutral-300 text-[11px] font-medium text-neutral-500 text-center">
                        {rowIdx + 2}
                      </td>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-1.5 text-[13px] text-neutral-700 border-b border-r border-neutral-200 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                      {/* Fill remaining columns */}
                      {Array.from({ length: maxCols - row.length }, (_, idx) => (
                        <td
                          key={`empty-${idx}`}
                          className="px-3 py-1.5 border-b border-r border-neutral-200"
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Footer status bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t bg-neutral-100 text-[11px] text-neutral-500">
              <span>
                {spreadsheetData.rows.length + 1} rows × {maxCols} columns
              </span>
              {spreadsheetData.rows.length > 1000 && (
                <span className="text-amber-600">
                  Showing first 1,000 rows of {spreadsheetData.rows.length.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )

      case "text":
        return (
          <div className="h-full overflow-auto p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {textContent || "Loading..."}
            </pre>
          </div>
        )

      default:
        return null
    }
  }

  // Get icon for viewer mode
  const getViewerIcon = () => {
    switch (viewerMode) {
      case "pdf":
        return <FileText className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "spreadsheet":
        return <Table className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {getViewerIcon()}
            <span className="font-medium truncate max-w-md">{documentName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!fileUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{renderViewer()}</div>

      {/* Footer with controls */}
      {viewerMode === "pdf" && numPages > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[100px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPdfScale((s) => Math.max(s - 0.25, 0.5))}
              disabled={pdfScale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">{Math.round(pdfScale * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPdfScale((s) => Math.min(s + 0.25, 3))}
              disabled={pdfScale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {viewerMode === "image" && (
        <div className="flex items-center justify-center px-4 py-2 border-t bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setImageScale((s) => Math.max(s - 0.25, 0.25))}
              disabled={imageScale <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">{Math.round(imageScale * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setImageScale((s) => Math.min(s + 0.25, 4))}
              disabled={imageScale >= 4}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
