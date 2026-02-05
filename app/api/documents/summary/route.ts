import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth } from "@/lib/api-auth"

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/documents/summary - Fetch the cached document summary
export async function GET(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    console.log("[Summary GET] Fetching summary from database...")
    
    const { data, error } = await supabase
      .from("document_summary")
      .select("*")
      .eq("summary_type", "main")
      .single()

    if (error) {
      console.log("[Summary GET] Error:", error.code, error.message)
      // PGRST116 = not found (row doesn't exist)
      // 42P01 = relation does not exist (table doesn't exist)
      if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          exists: false,
          summary: null,
        }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        })
      }
      throw new Error(`Failed to fetch summary: ${error.message}`)
    }

    if (!data) {
      console.log("[Summary GET] No data found")
      return NextResponse.json({
        exists: false,
        summary: null,
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      })
    }

    console.log("[Summary GET] Found summary with", data.key_insights?.length || 0, "insights")
    
    return NextResponse.json({
      exists: true,
      summary: data,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("[Summary GET] Error:", error)
    return NextResponse.json({
      exists: false,
      summary: null,
    })
  }
}
