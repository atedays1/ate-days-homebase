import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAuth } from "@/lib/api-auth"

// POST - Add a tag to a document
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const { documentId, tag } = await request.json()

    if (!documentId || !tag) {
      return NextResponse.json(
        { error: "Document ID and tag required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("document_tags")
      .insert({ document_id: documentId, tag })

    if (error) {
      // Ignore unique constraint errors (tag already exists)
      if (error.code === "23505") {
        return NextResponse.json({ success: true, message: "Tag already exists" })
      }
      console.error("Error adding tag:", error)
      return NextResponse.json(
        { error: "Failed to add tag" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// DELETE - Remove a tag from a document
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")
    const tag = searchParams.get("tag")

    if (!documentId || !tag) {
      return NextResponse.json(
        { error: "Document ID and tag required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("document_tags")
      .delete()
      .eq("document_id", documentId)
      .eq("tag", tag)

    if (error) {
      console.error("Error removing tag:", error)
      return NextResponse.json(
        { error: "Failed to remove tag" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
