"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onUploadComplete: () => void
}

interface UploadStatus {
  fileName: string
  status: "uploading" | "success" | "error"
  message?: string
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        // Add to uploads with uploading status
        setUploads((prev) => [
          ...prev,
          { fileName: file.name, status: "uploading" },
        ])

        try {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || "Upload failed")
          }

          // Update status to success
          setUploads((prev) =>
            prev.map((u) =>
              u.fileName === file.name
                ? { ...u, status: "success", message: `${result.document.chunksCount} chunks created` }
                : u
            )
          )

          onUploadComplete()
        } catch (error) {
          // Update status to error
          setUploads((prev) =>
            prev.map((u) =>
              u.fileName === file.name
                ? {
                    ...u,
                    status: "error",
                    message: error instanceof Error ? error.message : "Upload failed",
                  }
                : u
            )
          )
        }
      }

      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status === "uploading"))
      }, 3000)
    },
    [onUploadComplete]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: true,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isDragActive ? "bg-indigo-100" : "bg-slate-100"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragActive ? "text-indigo-600" : "text-slate-500"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              or click to browse. Supports PDF, Excel, CSV
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={`${upload.fileName}-${index}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3",
                upload.status === "uploading" && "border-slate-200 bg-slate-50",
                upload.status === "success" && "border-emerald-200 bg-emerald-50",
                upload.status === "error" && "border-red-200 bg-red-50"
              )}
            >
              {upload.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              )}
              {upload.status === "success" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              {upload.status === "error" && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <FileText className="h-4 w-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {upload.fileName}
                </p>
                {upload.message && (
                  <p
                    className={cn(
                      "text-xs",
                      upload.status === "success" && "text-emerald-600",
                      upload.status === "error" && "text-red-600"
                    )}
                  >
                    {upload.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
