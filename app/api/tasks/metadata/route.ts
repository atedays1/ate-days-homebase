import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth } from "@/lib/api-auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface TaskMetadata {
  id?: string
  task_id: string
  description?: string | null
  status?: "completed" | "in-progress" | "not-started" | null
  start_date?: string | null
  end_date?: string | null
  priority?: "low" | "medium" | "high" | "urgent" | null
  assignee?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// GET - Fetch task metadata by task_id or all metadata
export async function GET(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("task_id")

    if (taskId) {
      // Fetch single task metadata
      const { data, error } = await supabase
        .from("task_metadata")
        .select("*")
        .eq("task_id", taskId)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error
      }

      return NextResponse.json({ data: data || null })
    } else {
      // Fetch all task metadata
      const { data, error } = await supabase
        .from("task_metadata")
        .select("*")
        .order("updated_at", { ascending: false })

      if (error) throw error

      return NextResponse.json({ data: data || [] })
    }
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error fetching task metadata:", error)
    return NextResponse.json(
      { error: "Failed to fetch task metadata" },
      { status: 500 }
    )
  }
}

// POST - Create or update task metadata (upsert)
export async function POST(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const body: TaskMetadata = await request.json()

    if (!body.task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      )
    }

    // Upsert - insert or update if exists
    const { data, error } = await supabase
      .from("task_metadata")
      .upsert(
        {
          task_id: body.task_id,
          description: body.description,
          status: body.status,
          start_date: body.start_date,
          end_date: body.end_date,
          priority: body.priority,
          assignee: body.assignee,
          notes: body.notes,
        },
        {
          onConflict: "task_id",
        }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error saving task metadata:", error)
    return NextResponse.json(
      { error: "Failed to save task metadata" },
      { status: 500 }
    )
  }
}

// DELETE - Remove task metadata
export async function DELETE(request: NextRequest) {
  try {
    // Require authenticated and approved user
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("task_id")

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("task_metadata")
      .delete()
      .eq("task_id", taskId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error deleting task metadata:", error)
    return NextResponse.json(
      { error: "Failed to delete task metadata" },
      { status: 500 }
    )
  }
}
