import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createServiceClient } from "@/lib/supabase-server"
import { createEmbeddings } from "@/lib/embeddings"
import {
  processDocument,
  createChunksWithPages,
  getFileType,
  isSupportedMimeType,
} from "@/lib/document-processor"
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
      console.log("Anthropic not configured, skipping summary generation")
      return
    }

    const { summary, suggestedTags } = await generateSingleDocumentSummary(content, documentName)
    
    // Update document with summary
    if (summary) {
      await supabase
        .from("documents")
        .update({ summary })
        .eq("id", documentId)
    }
    
    // Insert tags
    if (suggestedTags && suggestedTags.length > 0) {
      const tagRecords = suggestedTags.map(tag => ({
        document_id: documentId,
        tag
      }))
      await supabase
        .from("document_tags")
        .insert(tagRecords)
        .onConflict("document_id,tag")
    }
    
    console.log(`Generated summary and ${suggestedTags.length} tags for document: ${documentName}`)
  } catch (error) {
    console.error("Failed to generate document summary/tags:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()

    // Create service client for storage operations (bypasses RLS)
    const serviceClient = await createServiceClient()
    
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isSupportedMimeType(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported types: PDF, Excel, CSV` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process the document to extract text
    const processedDoc = await processDocument(buffer, file.name, file.type)

    // Create chunks for embedding
    const chunks = createChunksWithPages(processedDoc)

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any text from the document" },
        { status: 400 }
      )
    }

    // Generate a unique file path for storage
    const fileExtension = file.name.split('.').pop() || 'bin'
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`
    const filePath = `uploads/${uniqueFileName}`

    // Upload file to Supabase Storage (using service client to bypass RLS)
    let storedFilePath: string | null = null
    try {
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from("documents")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        // Continue without file storage - text extraction still works
      } else {
        storedFilePath = uploadData.path
        console.log("File uploaded to storage:", storedFilePath)
      }
    } catch (storageErr) {
      console.error("Storage upload failed:", storageErr)
      // Continue without file storage
    }

    // Insert document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        type: getFileType(file.type),
        size: file.size,
        file_path: storedFilePath,
      })
      .select()
      .single()

    if (docError) {
      console.error("Error inserting document:", docError)
      // Clean up uploaded file if document insert fails
      if (storedFilePath) {
        await serviceClient.storage.from("documents").remove([storedFilePath])
      }
      return NextResponse.json(
        { error: "Failed to save document record" },
        { status: 500 }
      )
    }

    // Create embeddings for all chunks
    const chunkContents = chunks.map((c) => c.content)
    const embeddings = await createEmbeddings(chunkContents)

    // Insert chunks with embeddings
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: document.id,
      content: chunk.content,
      embedding: embeddings[index],
      page_number: chunk.pageNumber || null,
    }))

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords)

    if (chunksError) {
      console.error("Error inserting chunks:", chunksError)
      // Clean up the document record and stored file if chunks fail
      await supabase.from("documents").delete().eq("id", document.id)
      if (storedFilePath) {
        await serviceClient.storage.from("documents").remove([storedFilePath])
      }
      return NextResponse.json(
        { error: "Failed to process document chunks" },
        { status: 500 }
      )
    }

    // Generate per-document summary and tags in the background
    const allContent = chunks.map(c => c.content).join("\n\n")
    generateDocumentSummaryAndTags(document.id, file.name, allContent).catch((err) => {
      console.error("Failed to generate document summary:", err)
    })

    // Trigger global summary regeneration in the background
    triggerSummaryRegeneration().catch((err) => {
      console.error("Failed to trigger summary regeneration:", err)
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        chunksCount: chunks.length,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
