import { NextRequest, NextResponse } from "next/server"
import { supabase, Document, DocumentChunk } from "@/lib/supabase"
import { createEmbedding, createEmbeddings } from "@/lib/embeddings"
import { processPDF, processSpreadsheet, chunkText } from "@/lib/document-processor"
import { downloadDriveFile, getGoogleFileTypeLabel, GOOGLE_MIME_TYPES } from "@/lib/google"
import { requireAuth } from "@/lib/api-auth"
import { generateSingleDocumentSummary, isAnthropicConfigured } from "@/lib/anthropic"

// Helper to trigger summary regeneration
async function triggerSummaryRegeneration() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
  await fetch(`${baseUrl}/api/documents/summarize`, {
    method: "POST",
  })
}

// Helper to generate and save document summary and tags
async function generateDocumentSummaryAndTags(
  documentId: string,
  documentName: string,
  content: string
) {
  try {
    if (!isAnthropicConfigured()) {
      return
    }

    const { summary, suggestedTags } = await generateSingleDocumentSummary(content, documentName)
    
    if (summary) {
      await supabase
        .from("documents")
        .update({ summary })
        .eq("id", documentId)
    }
    
    if (suggestedTags && suggestedTags.length > 0) {
      const tagRecords = suggestedTags.map(tag => ({
        document_id: documentId,
        tag
      }))
      await supabase
        .from("document_tags")
        .insert(tagRecords)
    }
  } catch (error) {
    console.error("Failed to generate document summary/tags:", error)
  }
}

interface DriveFileInput {
  id: string
  name: string
  mimeType: string
}

interface ImportResult {
  fileId: string
  fileName: string
  success: boolean
  error?: string
  documentId?: string
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const { files, accessToken } = (await request.json()) as {
      files: DriveFileInput[]
      accessToken: string
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token provided" },
        { status: 400 }
      )
    }

    const results: ImportResult[] = []

    for (const file of files) {
      try {
        // Download the file from Google Drive
        const downloadedFile = await downloadDriveFile(
          file.id,
          accessToken,
          file.name,
          file.mimeType
        )

        // Extract text based on file type
        let text: string

        if (downloadedFile.mimeType === GOOGLE_MIME_TYPES.PDF || 
            downloadedFile.mimeType === "application/pdf") {
          const processed = await processPDF(downloadedFile.content)
          text = processed.text
        } else if (
          downloadedFile.mimeType === GOOGLE_MIME_TYPES.CSV ||
          downloadedFile.mimeType === "text/csv" ||
          downloadedFile.mimeType === GOOGLE_MIME_TYPES.XLSX ||
          downloadedFile.mimeType === "application/vnd.ms-excel" ||
          downloadedFile.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          const processed = processSpreadsheet(downloadedFile.content, downloadedFile.name)
          text = processed.text
        } else if (downloadedFile.mimeType === "text/plain") {
          text = downloadedFile.content.toString("utf-8")
        } else {
          // Try to parse as text
          text = downloadedFile.content.toString("utf-8")
        }

        if (!text || text.trim().length === 0) {
          results.push({
            fileId: file.id,
            fileName: file.name,
            success: false,
            error: "Could not extract text from file",
          })
          continue
        }

        // Chunk the text
        const chunks = chunkText(text)

        // Determine file type for metadata
        const fileType = getGoogleFileTypeLabel(file.mimeType)

        // Determine file extension from mime type or original name
        let fileExtension = downloadedFile.name.split('.').pop() || 'bin'
        if (downloadedFile.mimeType === 'application/pdf') fileExtension = 'pdf'
        else if (downloadedFile.mimeType === 'text/csv') fileExtension = 'csv'
        else if (downloadedFile.mimeType.includes('spreadsheet')) fileExtension = 'xlsx'

        // Generate unique file path and upload to Supabase Storage
        const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`
        const filePath = `uploads/${uniqueFileName}`
        let storedFilePath: string | null = null

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, downloadedFile.content, {
              contentType: downloadedFile.mimeType,
              upsert: false,
            })

          if (uploadError) {
            console.error("Storage upload error for Drive import:", uploadError)
          } else {
            storedFilePath = uploadData.path
            console.log("Drive file uploaded to storage:", storedFilePath)
          }
        } catch (storageErr) {
          console.error("Storage upload failed for Drive import:", storageErr)
        }

        // Create document record
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .insert({
            name: downloadedFile.name,
            type: fileType,
            size: downloadedFile.content.length,
            file_path: storedFilePath,
          })
          .select()
          .single()

        if (docError) {
          console.error("Error creating document:", docError)
          // Clean up stored file if document creation fails
          if (storedFilePath) {
            await supabase.storage.from("documents").remove([storedFilePath])
          }
          results.push({
            fileId: file.id,
            fileName: file.name,
            success: false,
            error: `Database error: ${docError.message}`,
          })
          continue
        }

        // Generate embeddings in batch (much faster)
        const embeddings = await createEmbeddings(chunks)
        
        const chunkInserts: Partial<DocumentChunk>[] = chunks.map((content, i) => ({
          document_id: doc.id,
          content,
          page_number: i + 1,
          embedding: embeddings[i],
        }))

        const { error: chunksError } = await supabase
          .from("document_chunks")
          .insert(chunkInserts)

        if (chunksError) {
          console.error("Error creating chunks:", chunksError)
          // Clean up the document and stored file if chunks failed
          await supabase.from("documents").delete().eq("id", doc.id)
          if (storedFilePath) {
            await supabase.storage.from("documents").remove([storedFilePath])
          }
          results.push({
            fileId: file.id,
            fileName: file.name,
            success: false,
            error: `Error storing document chunks: ${chunksError.message}`,
          })
          continue
        }

        // Generate summary and tags in background
        generateDocumentSummaryAndTags(doc.id, downloadedFile.name, text).catch(err => {
          console.error("Failed to generate summary for imported doc:", err)
        })

        results.push({
          fileId: file.id,
          fileName: file.name,
          success: true,
          documentId: doc.id,
        })
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          fileId: file.id,
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    // Trigger summary regeneration if any files were successfully imported
    if (successCount > 0) {
      triggerSummaryRegeneration().catch((err) => {
        console.error("Failed to trigger summary regeneration:", err)
      })
    }

    return NextResponse.json({
      message: `Imported ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
      results,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "Failed to import files from Google Drive" },
      { status: 500 }
    )
  }
}
