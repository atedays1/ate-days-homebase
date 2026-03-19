import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth, requireAdmin } from "@/lib/api-auth"

// GET /api/settings?key=timeline_spreadsheet_id
export async function GET(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    const supabase = await createServiceClient()
    
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (key) {
      // Get specific setting
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" which is fine
        throw error
      }

      return NextResponse.json({ value: data?.value || null })
    }

    // Get all settings
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")

    if (error) throw error

    const settings: Record<string, string> = {}
    data?.forEach((row) => {
      settings[row.key] = row.value
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// POST /api/settings
// Body: { key: string, value: string }
export async function POST(request: NextRequest) {
  try {
    // Require admin for modifying settings
    await requireAdmin()
    const supabase = await createServiceClient()
    
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    // Upsert the setting
    const { data, error } = await supabase
      .from("app_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error saving setting:", error)
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    )
  }
}
