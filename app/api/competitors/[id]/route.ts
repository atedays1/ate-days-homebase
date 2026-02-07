import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

// GET - Get a single competitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    
    const { id } = await params
    const supabase = await createServiceClient()
    
    const { data: competitor, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", id)
      .single()
    
    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Competitor not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching competitor:", error)
      return NextResponse.json(
        { error: "Failed to fetch competitor" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ competitor })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch competitor" },
      { status: 500 }
    )
  }
}

// PUT - Update a competitor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userAccess } = await requireAuth()
    
    // Only admins can update competitors
    if (userAccess?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const supabase = await createServiceClient()
    const body = await request.json()
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      "name", "description", "website_url", "amazon_url", "logo_url",
      "instagram_url", "tiktok_url", "facebook_url", "twitter_url",
      "linkedin_url", "youtube_url", "category", "tags", "status",
      "notes", "founded_year", "headquarters"
    ]
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }
    
    const { data: competitor, error } = await supabase
      .from("competitors")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Competitor not found" },
          { status: 404 }
        )
      }
      console.error("Error updating competitor:", error)
      return NextResponse.json(
        { error: "Failed to update competitor" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ competitor })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to update competitor" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a competitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userAccess } = await requireAuth()
    
    // Only admins can delete competitors
    if (userAccess?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const supabase = await createServiceClient()
    
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", id)
    
    if (error) {
      console.error("Error deleting competitor:", error)
      return NextResponse.json(
        { error: "Failed to delete competitor" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to delete competitor" },
      { status: 500 }
    )
  }
}
