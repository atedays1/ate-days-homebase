import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

// GET - List pending discoveries
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get("status") || "pending"
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    
    const { data: discoveries, error } = await supabase
      .from("competitor_discoveries")
      .select("*")
      .eq("status", status)
      .order("relevance_score", { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error("Error fetching discoveries:", error)
      return NextResponse.json(
        { error: "Failed to fetch discoveries" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ discoveries: discoveries || [] })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch discoveries" },
      { status: 500 }
    )
  }
}
