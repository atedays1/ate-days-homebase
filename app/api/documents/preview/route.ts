import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Document ID required" }, { status: 400 })
  }

  try {
    const supabase = await createServiceClient()

    // Get document chunks (first few for preview)
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("content, page_number")
      .eq("document_id", id)
      .order("page_number", { ascending: true })
      .limit(3)

    if (error) {
      console.error("Error fetching document chunks:", error)
      return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 })
    }

    // Combine chunks into preview text
    const preview = chunks
      .map(chunk => chunk.content)
      .join("\n\n")
      .slice(0, 2000) // Limit to ~2000 chars

    return NextResponse.json({ preview })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
