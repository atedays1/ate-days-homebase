import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    // Get the document to find its file_path
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, name, type, file_path")
      .eq("id", id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    if (!document.file_path) {
      return NextResponse.json(
        { error: "File not available for viewing (only text content was stored)" },
        { status: 404 }
      )
    }

    // Generate a signed URL valid for 1 hour
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.file_path, 3600) // 1 hour = 3600 seconds

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL:", signedUrlError)
      return NextResponse.json(
        { error: "Failed to generate file access URL" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      name: document.name,
      type: document.type,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("File access error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to access file" },
      { status: 500 }
    )
  }
}
