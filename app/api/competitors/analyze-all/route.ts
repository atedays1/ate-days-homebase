import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/api-auth"
import Anthropic from "@anthropic-ai/sdk"

// Analyze a single competitor for pain points and white space opportunities
async function analyzeCompetitor(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  competitor: {
    id: string
    name: string
    description: string | null
    website_url: string | null
  },
  painPoints: Array<{ id: string; name: string; slug: string; description: string }>,
  whiteSpace: Array<{ id: string; name: string; slug: string; description: string; how_atedays_wins: string }>
) {
  const anthropic = new Anthropic()
  
  const prompt = `You are a competitive intelligence analyst for AteDays, a new supplement brand entering the market.

Analyze this competitor and provide insights:

Competitor: ${competitor.name}
Website: ${competitor.website_url || "Unknown"}
Description: ${competitor.description || "No description available"}

Based on the supplement industry research, evaluate this competitor against these PAIN POINT categories:
${painPoints.map((pp, i) => `${i + 1}. ${pp.name} (${pp.slug}): ${pp.description}`).join('\n')}

And these WHITE SPACE opportunities for AteDays to differentiate:
${whiteSpace.map((ws, i) => `${i + 1}. ${ws.name} (${ws.slug}): ${ws.description}`).join('\n')}

Return a JSON object with:
- ai_summary: A 2-3 sentence analysis of this competitor's market position and vulnerabilities
- likely_pain_points: Array of objects with {slug, severity: "high"|"medium"|"low"} for pain points this competitor likely has based on their market segment and business model (be conservative, only include if reasonably confident)
- white_space_scores: Array of objects with {slug, score: 1-10} where 10 means AteDays has the BIGGEST opportunity to differentiate against this competitor in that area

Return ONLY valid JSON:
{"ai_summary": "...", "likely_pain_points": [...], "white_space_scores": [...]}`

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })
    
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.log(`[Analyze] No JSON found for ${competitor.name}`)
      return { success: false, name: competitor.name, error: "No JSON in response" }
    }
    
    const insights = JSON.parse(jsonMatch[0])
    
    // Update competitor with AI summary
    if (insights.ai_summary) {
      await supabase
        .from("competitors")
        .update({ 
          ai_summary: insights.ai_summary,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq("id", competitor.id)
    }
    
    // Insert pain points
    if (insights.likely_pain_points && Array.isArray(insights.likely_pain_points)) {
      for (const pp of insights.likely_pain_points) {
        const painPoint = painPoints.find(p => p.slug === pp.slug)
        if (painPoint) {
          await supabase
            .from("competitor_pain_points")
            .upsert({
              competitor_id: competitor.id,
              pain_point_id: painPoint.id,
              severity: pp.severity || "medium",
              source_type: "ai_detected",
              ai_generated: true,
              ai_confidence: 0.7,
            }, {
              onConflict: "competitor_id,pain_point_id,evidence",
              ignoreDuplicates: true
            })
        }
      }
    }
    
    // Insert white space scores
    if (insights.white_space_scores && Array.isArray(insights.white_space_scores)) {
      for (const ws of insights.white_space_scores) {
        const opportunity = whiteSpace.find(w => w.slug === ws.slug)
        if (opportunity && ws.score >= 1 && ws.score <= 10) {
          await supabase
            .from("competitor_white_space_scores")
            .upsert({
              competitor_id: competitor.id,
              white_space_id: opportunity.id,
              score: ws.score,
              ai_generated: true,
            }, {
              onConflict: "competitor_id,white_space_id"
            })
        }
      }
    }
    
    return { success: true, name: competitor.name, summary: insights.ai_summary }
  } catch (error) {
    console.error(`[Analyze] Error for ${competitor.name}:`, error)
    return { success: false, name: competitor.name, error: String(error) }
  }
}

// POST - Analyze all unanalyzed competitors
export async function POST(request: NextRequest) {
  try {
    const { access } = await requireAuth()
    
    if (access?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    const supabase = await createServiceClient()
    
    // Get pain point categories and white space opportunities
    const [{ data: painPoints }, { data: whiteSpace }] = await Promise.all([
      supabase.from("pain_point_categories").select("id, name, slug, description"),
      supabase.from("white_space_opportunities").select("id, name, slug, description, how_atedays_wins"),
    ])
    
    if (!painPoints || !whiteSpace) {
      return NextResponse.json(
        { error: "Pain points or white space categories not found. Run migrations first." },
        { status: 500 }
      )
    }
    
    // Get all competitors that haven't been analyzed yet
    const { data: unanalyzedCompetitors, error } = await supabase
      .from("competitors")
      .select("id, name, description, website_url")
      .is("ai_analyzed_at", null)
      .order("name")
    
    if (error) {
      console.error("[Analyze All] Query error:", error)
      return NextResponse.json(
        { error: "Failed to fetch competitors" },
        { status: 500 }
      )
    }
    
    if (!unanalyzedCompetitors || unanalyzedCompetitors.length === 0) {
      return NextResponse.json({
        message: "All competitors have already been analyzed",
        analyzed: 0,
        results: []
      })
    }
    
    console.log(`[Analyze All] Starting analysis of ${unanalyzedCompetitors.length} competitors...`)
    
    // Analyze each competitor sequentially to avoid rate limits
    const results = []
    for (const competitor of unanalyzedCompetitors) {
      console.log(`[Analyze All] Analyzing ${competitor.name}...`)
      const result = await analyzeCompetitor(supabase, competitor, painPoints, whiteSpace)
      results.push(result)
      
      // Small delay between API calls to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`[Analyze All] Complete: ${successful} successful, ${failed} failed`)
    
    return NextResponse.json({
      message: `Analyzed ${successful} competitors`,
      analyzed: successful,
      failed,
      results
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Analyze All] Error:", error)
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    )
  }
}
