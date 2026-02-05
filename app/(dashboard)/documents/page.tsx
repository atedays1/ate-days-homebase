"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UploadZone } from "@/components/upload-zone"
import { DocumentList } from "@/components/document-list"
import { GoogleDrivePicker } from "@/components/google-drive-picker"
import { FolderOpen, FileText, HardDrive, Loader2 } from "lucide-react"

interface Document {
  id: string
  name: string
  type: string
  size: number
  created_at: string
}

interface PickedFile {
  id: string
  name: string
  mimeType: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      const response = await fetch("/api/documents", {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error("Failed to fetch documents:", response.status)
        setDocuments([])
        return
      }
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      setDocuments([]) // Set empty array on error so UI doesn't hang
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  }

  const handleDriveFilesSelected = async (files: PickedFile[], accessToken: string) => {
    setIsImporting(true)
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    // Process files one at a time for progress feedback
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setImportStatus(`Importing ${i + 1}/${files.length}: ${file.name}`)

      try {
        const response = await fetch("/api/documents/import-drive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: [file], accessToken }),
        })

        const data = await response.json()

        if (response.ok && data.results?.[0]?.success) {
          successCount++
        } else {
          failCount++
          const error = data.results?.[0]?.error || data.error || "Unknown error"
          errors.push(`${file.name}: ${error}`)
          console.error(`Failed to import ${file.name}:`, error)
        }
      } catch (error) {
        failCount++
        errors.push(`${file.name}: Network error`)
        console.error(`Failed to import ${file.name}:`, error)
      }
    }

    // Show final status
    let finalStatus = `Imported ${successCount} file(s)`
    if (failCount > 0) {
      finalStatus += `, ${failCount} failed`
      if (errors.length > 0) {
        finalStatus += `. Error: ${errors[0]}`
      }
    }
    
    setImportStatus(finalStatus)
    fetchDocuments()
    
    // Clear status after 5 seconds
    setTimeout(() => setImportStatus(null), 5000)
    setIsImporting(false)
  }

  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0)
  const formatTotalSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Document Library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload and manage your company documents for AI-powered search
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {documents.length}
              </p>
              <p className="text-xs text-slate-500">Documents</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <HardDrive className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {formatTotalSize(totalSize)}
              </p>
              <p className="text-xs text-slate-500">Total Size</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <FolderOpen className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {new Set(documents.map((d) => d.type)).size}
              </p>
              <p className="text-xs text-slate-500">File Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Zone */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Upload Documents</CardTitle>
            <CardDescription className="text-xs">
              Drag and drop files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadZone onUploadComplete={fetchDocuments} />
            
            {/* Google Drive Import */}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <GoogleDrivePicker 
                onFilesSelected={handleDriveFilesSelected}
                disabled={isImporting}
              />
              {importStatus && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {isImporting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {importStatus}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Documents</CardTitle>
            <CardDescription className="text-xs">
              Manage uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList
              documents={documents}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
