import { createServiceClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"

// Analyze a competitor for pain points and white space opportunities
export async function analyzeCompetitorInsights(
  competitorId: string,
  competitorName: string,
  description: string | null,
  websiteUrl: string | null
) {
  try {
    const supabase = await createServiceClient()
    const anthropic = new Anthropic()
    
    // Get pain point categories and white space opportunities from DB
    const [{ data: painPoints }, { data: whiteSpace }] = await Promise.all([
      supabase.from("pain_point_categories").select("id, name, slug, description"),
      supabase.from("white_space_opportunities").select("id, name, slug, description, how_atedays_wins"),
    ])
    
    if (!painPoints || !whiteSpace) {
      console.log("[Analysis] No pain points or white space categories found in DB")
      return
    }
    
    const prompt = `You are a competitive intelligence analyst for AteDays, a new supplement brand entering the market.

Analyze this competitor and provide insights:

Competitor: ${competitorName}
Website: ${websiteUrl || "Unknown"}
Description: ${description || "No description available"}

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

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })
    
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.log("[Analysis] No JSON found in AI response")
      return
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
        .eq("id", competitorId)
    }
    
    // Insert pain points
    if (insights.likely_pain_points && Array.isArray(insights.likely_pain_points)) {
      for (const pp of insights.likely_pain_points) {
        const painPoint = painPoints.find(p => p.slug === pp.slug)
        if (painPoint) {
          await supabase
            .from("competitor_pain_points")
            .upsert({
              competitor_id: competitorId,
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
              competitor_id: competitorId,
              white_space_id: opportunity.id,
              score: ws.score,
              ai_generated: true,
            }, {
              onConflict: "competitor_id,white_space_id"
            })
        }
      }
    }
    
    console.log(`[Analysis] AI insights added for ${competitorName}`)
  } catch (error) {
    console.error("[Analysis] AI insights analysis failed:", error)
    // Don't throw - insights are supplementary
  }
}
