import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

export interface CompetitorPainPoint {
  id: string
  pain_point: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
  }
  severity: "high" | "medium" | "low"
  evidence: string | null
  source_url: string | null
  source_type: string | null
  ai_generated: boolean
}

export interface CompetitorWhiteSpaceScore {
  id: string
  white_space: {
    id: string
    name: string
    slug: string
    icon: string
    priority: number
  }
  score: number
  notes: string | null
}

export interface CompetitorInsights {
  pain_points: CompetitorPainPoint[]
  white_space_scores: CompetitorWhiteSpaceScore[]
  ai_summary: string | null
  overall_opportunity_score: number | null
}

// GET - Get insights for a specific competitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    
    const { id } = await params
    const supabase = await createServiceClient()
    
    // Get competitor's pain points with category details
    const { data: painPoints, error: ppError } = await supabase
      .from("competitor_pain_points")
      .select(`
        id,
        severity,
        evidence,
        source_url,
        source_type,
        ai_generated,
        pain_point:pain_point_categories(
          id,
          name,
          slug,
          icon,
          color
        )
      `)
      .eq("competitor_id", id)
      .order("created_at", { ascending: false })
    
    if (ppError) {
      console.error("Error fetching pain points:", ppError)
    }
    
    // Get competitor's white space scores
    const { data: whiteSpaceScores, error: wsError } = await supabase
      .from("competitor_white_space_scores")
      .select(`
        id,
        score,
        notes,
        white_space:white_space_opportunities(
          id,
          name,
          slug,
          icon,
          priority
        )
      `)
      .eq("competitor_id", id)
      .order("score", { ascending: false })
    
    if (wsError) {
      console.error("Error fetching white space scores:", wsError)
    }
    
    // Get competitor's AI summary
    const { data: competitor } = await supabase
      .from("competitors")
      .select("ai_summary, overall_opportunity_score")
      .eq("id", id)
      .single()
    
    const response: CompetitorInsights = {
      pain_points: (painPoints || []).map(pp => ({
        id: pp.id,
        pain_point: pp.pain_point as CompetitorPainPoint["pain_point"],
        severity: pp.severity as "high" | "medium" | "low",
        evidence: pp.evidence,
        source_url: pp.source_url,
        source_type: pp.source_type,
        ai_generated: pp.ai_generated,
      })),
      white_space_scores: (whiteSpaceScores || []).map(ws => ({
        id: ws.id,
        white_space: ws.white_space as CompetitorWhiteSpaceScore["white_space"],
        score: ws.score,
        notes: ws.notes,
      })),
      ai_summary: competitor?.ai_summary || null,
      overall_opportunity_score: competitor?.overall_opportunity_score || null,
    }
    
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Competitor Insights] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch competitor insights" },
      { status: 500 }
    )
  }
}

// POST - Add or update pain points/scores for a competitor (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { access } = await requireAuth()
    
    if (access?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const body = await request.json()
    const { pain_points, white_space_scores, ai_summary } = body
    
    const supabase = await createServiceClient()
    
    // Update pain points if provided
    if (pain_points && Array.isArray(pain_points)) {
      for (const pp of pain_points) {
        if (pp.delete && pp.id) {
          await supabase
            .from("competitor_pain_points")
            .delete()
            .eq("id", pp.id)
        } else if (pp.pain_point_id) {
          await supabase
            .from("competitor_pain_points")
            .upsert({
              id: pp.id || undefined,
              competitor_id: id,
              pain_point_id: pp.pain_point_id,
              severity: pp.severity || "medium",
              evidence: pp.evidence || null,
              source_url: pp.source_url || null,
              source_type: pp.source_type || "manual",
              ai_generated: false,
            })
        }
      }
    }
    
    // Update white space scores if provided
    if (white_space_scores && Array.isArray(white_space_scores)) {
      for (const ws of white_space_scores) {
        if (ws.white_space_id) {
          await supabase
            .from("competitor_white_space_scores")
            .upsert({
              competitor_id: id,
              white_space_id: ws.white_space_id,
              score: ws.score || 5,
              notes: ws.notes || null,
              ai_generated: false,
            }, {
              onConflict: "competitor_id,white_space_id"
            })
        }
      }
    }
    
    // Update AI summary if provided
    if (ai_summary !== undefined) {
      await supabase
        .from("competitors")
        .update({ ai_summary })
        .eq("id", id)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Competitor Insights] Error:", error)
    return NextResponse.json(
      { error: "Failed to update competitor insights" },
      { status: 500 }
    )
  }
}
