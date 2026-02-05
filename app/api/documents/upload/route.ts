import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createEmbeddings } from "@/lib/embeddings"
import {
  processDocument,
  createChunksWithPages,
  getFileType,
  isSupportedMimeType,
} from "@/lib/document-processor"
import { requireAuth } from "@/lib/api-auth"

// Helper to trigger summary regeneration
async function triggerSummaryRegeneration() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
  await fetch(`${baseUrl}/api/documents/summarize`, {
    method: "POST",
  })
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
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

    // Insert document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        type: getFileType(file.type),
        size: file.size,
      })
      .select()
      .single()

    if (docError) {
      console.error("Error inserting document:", docError)
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
      // Clean up the document record if chunks fail
      await supabase.from("documents").delete().eq("id", document.id)
      return NextResponse.json(
        { error: "Failed to process document chunks" },
        { status: 500 }
      )
    }

    // Trigger summary regeneration in the background
    // We don't await this to avoid slowing down the upload response
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
