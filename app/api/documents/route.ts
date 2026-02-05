import { NextRequest, NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { requireAuth } from "@/lib/api-auth"

// GET - List all documents
export async function GET() {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        documents: [],
        message: "Supabase not configured",
      })
    }

    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching documents:", error)
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a document by ID
export async function DELETE(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      )
    }

    // Delete document (chunks will be deleted via CASCADE)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting document:", error)
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
