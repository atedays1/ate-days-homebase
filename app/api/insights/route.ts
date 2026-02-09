import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"

export interface PainPointCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  sort_order: number
  competitor_count?: number
}

export interface WhiteSpaceOpportunity {
  id: string
  name: string
  slug: string
  description: string
  how_atedays_wins: string
  icon: string
  priority: number
  avg_score?: number
}

export interface MarketInsights {
  pain_points: PainPointCategory[]
  white_space: WhiteSpaceOpportunity[]
  summary: {
    total_competitors: number
    competitors_with_insights: number
    top_pain_point: string | null
    biggest_opportunity: string | null
    avg_opportunity_score: number
  }
}

// GET - Get market-wide insights summary
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    
    const supabase = await createServiceClient()
    
    // Get pain point categories with competitor counts
    const { data: painPoints, error: ppError } = await supabase
      .from("pain_point_categories")
      .select(`
        *,
        competitor_pain_points(count)
      `)
      .order("sort_order", { ascending: true })
    
    if (ppError) {
      console.error("Error fetching pain points:", ppError)
    }
    
    // Get white space opportunities with average scores
    const { data: whiteSpace, error: wsError } = await supabase
      .from("white_space_opportunities")
      .select(`
        *,
        competitor_white_space_scores(score)
      `)
      .order("priority", { ascending: true })
    
    if (wsError) {
      console.error("Error fetching white space:", wsError)
    }
    
    // Get total competitor count
    const { count: totalCompetitors } = await supabase
      .from("competitors")
      .select("*", { count: "exact", head: true })
    
    // Get competitors with at least one pain point or white space score
    const { data: competitorsWithPainPoints } = await supabase
      .from("competitor_pain_points")
      .select("competitor_id")
    
    const { data: competitorsWithScores } = await supabase
      .from("competitor_white_space_scores")
      .select("competitor_id")
    
    const uniqueCompetitorIds = new Set([
      ...(competitorsWithPainPoints || []).map(c => c.competitor_id),
      ...(competitorsWithScores || []).map(c => c.competitor_id),
    ])
    
    // Process pain points with counts
    const processedPainPoints = (painPoints || []).map(pp => ({
      id: pp.id,
      name: pp.name,
      slug: pp.slug,
      description: pp.description,
      icon: pp.icon,
      color: pp.color,
      sort_order: pp.sort_order,
      competitor_count: pp.competitor_pain_points?.[0]?.count || 0,
    }))
    
    // Process white space with average scores
    const processedWhiteSpace = (whiteSpace || []).map(ws => {
      const scores = ws.competitor_white_space_scores?.map((s: { score: number }) => s.score) || []
      const avgScore = scores.length > 0 
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
        : 0
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        how_atedays_wins: ws.how_atedays_wins,
        icon: ws.icon,
        priority: ws.priority,
        avg_score: Math.round(avgScore * 10) / 10,
      }
    })
    
    // Find top pain point (most competitors affected)
    const topPainPoint = processedPainPoints.reduce((max, pp) => 
      (pp.competitor_count || 0) > (max?.competitor_count || 0) ? pp : max
    , processedPainPoints[0])
    
    // Find biggest opportunity (highest average score = biggest gap)
    const biggestOpportunity = processedWhiteSpace.reduce((max, ws) => 
      (ws.avg_score || 0) > (max?.avg_score || 0) ? ws : max
    , processedWhiteSpace[0])
    
    // Calculate overall average opportunity score
    const allScores = processedWhiteSpace.map(ws => ws.avg_score || 0).filter(s => s > 0)
    const avgOpportunityScore = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0
    
    const response: MarketInsights = {
      pain_points: processedPainPoints,
      white_space: processedWhiteSpace,
      summary: {
        total_competitors: totalCompetitors || 0,
        competitors_with_insights: uniqueCompetitorIds.size,
        top_pain_point: topPainPoint?.name || null,
        biggest_opportunity: biggestOpportunity?.name || null,
        avg_opportunity_score: Math.round(avgOpportunityScore * 10) / 10,
      },
    }
    
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Insights] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    )
  }
}
