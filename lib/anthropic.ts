import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ChatContext {
  documentName: string
  documentId: string
  content: string
  pageNumber?: number
}

export async function generateRAGResponse(
  query: string,
  contexts: ChatContext[]
): Promise<{ content: string; sources: ChatContext[] }> {
  // Build context string from retrieved documents
  const contextString = contexts
    .map((ctx, i) => {
      const pageInfo = ctx.pageNumber ? ` (Page ${ctx.pageNumber})` : ""
      return `[Source ${i + 1}: ${ctx.documentName}${pageInfo}]\n${ctx.content}`
    })
    .join("\n\n---\n\n")

  const systemPrompt = `You are "AteDays Homebase" - the Lead Growth Strategist for Ate Days, a premium, high-growth D2C supplement brand launching in Q4 2026.

EXPERTISE:
- Clinical research on ingredients (Ashwagandha, L-Theanine, adaptogens, nootropics)
- Performance marketing and paid acquisition strategies
- Subscription-first unit economics and retention optimization
- D2C metrics: CAC, LTV, ROAS, Subscription Churn, AOV

KNOWLEDGE BASE GUIDELINES:

1. Data Grounding: Always prioritize information from the uploaded documents (brand research, personas, GTM plans) before using general knowledge.

2. Citation: When referencing a decision or data point, explicitly mention the source document (e.g., "According to [Brand Guidelines]...").

3. Metric Awareness: Frame insights around key D2C metrics. Flag when metrics are missing or need validation.

TONE AND STYLE:

- Executive Precision: Be concise. Use bullet points for action items and tables for comparisons.
- Strategic & Critical: Don't just summarize; highlight potential risks (e.g., "Our GTM timeline is aggressive for stability testing") and suggest opportunities.
- Brand Alignment: Maintain a tone reflecting our premium, benefits-driven, science-backed identity.

RESPONSE FORMAT:

- Lead with the key insight or answer
- Support with document citations when available
- Flag "⚠️ KEY DECISION REQUIRED" when data is missing or a decision is needed
- End with actionable next steps when appropriate

CONSTRAINTS:
- Do not fabricate data points; if information is not in the documents, clearly state so
- Flag aggressive timelines or assumptions as potential risks
- Suggest ethical upsell and retention opportunities when relevant
- Do not share sensitive company data outside this environment

DOCUMENT CONTEXT:
${contextString}`

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: query,
      },
    ],
  })

  const responseContent = message.content[0]
  if (responseContent.type !== "text") {
    throw new Error("Unexpected response type")
  }

  return {
    content: responseContent.text,
    sources: contexts,
  }
}

// Check if Anthropic is configured
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// Document summary types
export interface DocumentSummary {
  executive_summary: string
  key_insights: string[]
  action_items: { task: string; source: string; priority: "high" | "medium" | "low" }[]
  key_themes: string[]
  important_dates: { date: string; description: string; source: string }[]
}

// Generate a comprehensive summary from document chunks
export async function generateDocumentSummary(
  documentChunks: { content: string; documentName: string }[]
): Promise<DocumentSummary> {
  // Build context from document chunks
  const contextString = documentChunks
    .map((chunk, i) => `[${chunk.documentName}]\n${chunk.content}`)
    .join("\n\n---\n\n")

  const systemPrompt = `You are an executive assistant for Ate Days, a premium D2C supplement brand launching in Q4 2026. 

Your task is to analyze company documents and create a structured summary for the leadership team.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "executive_summary": "A 2-3 sentence overview of the key information across all documents",
  "key_insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "action_items": [
    {"task": "action item description", "source": "document name", "priority": "high"},
    {"task": "another action", "source": "document name", "priority": "medium"}
  ],
  "key_themes": ["theme 1", "theme 2", "theme 3"],
  "important_dates": [
    {"date": "Month Year or specific date", "description": "what happens", "source": "document name"}
  ]
}

Guidelines:
- Extract REAL action items, dates, and insights from the documents
- Priority should be "high", "medium", or "low" based on urgency/importance
- Key insights should be specific findings, not generic statements
- Important dates should include launch dates, deadlines, milestones mentioned
- Keep executive summary concise but informative
- If documents don't contain certain information, use empty arrays`

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Analyze these company documents and provide a structured summary:\n\n${contextString}`,
      },
    ],
  })

  const responseContent = message.content[0]
  if (responseContent.type !== "text") {
    throw new Error("Unexpected response type")
  }

  try {
    // Clean the response - remove markdown code blocks if present
    let jsonText = responseContent.text.trim()
    
    console.log("[Summary] Raw response length:", jsonText.length)
    
    // Remove ```json and ``` if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()
    
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parse the JSON response
    const summary = JSON.parse(jsonText) as DocumentSummary
    console.log("[Summary] Successfully parsed JSON with", summary.key_insights?.length || 0, "insights")
    return summary
  } catch (error) {
    // If parsing fails, return a default structure with the raw text as summary
    console.error("[Summary] Failed to parse JSON. Error:", error)
    console.error("[Summary] Raw response (first 500 chars):", responseContent.text.slice(0, 500))
    
    // Try to extract something useful from the response
    const text = responseContent.text
    
    // If it looks like the response has useful content, use it
    if (text && text.length > 50 && !text.includes("Unable to")) {
      return {
        executive_summary: text.length > 500 ? text.slice(0, 500) + "..." : text,
        key_insights: [],
        action_items: [],
        key_themes: [],
        important_dates: [],
      }
    }
    
    // Otherwise throw to trigger an error response
    throw new Error("Failed to generate valid summary from documents")
  }
}

// Generate a brief summary for a single document
export async function generateSingleDocumentSummary(
  content: string,
  documentName: string
): Promise<{ summary: string; suggestedTags: string[] }> {
  const systemPrompt = `You are an assistant that summarizes business documents for a D2C supplement brand called Ate Days.

Your task is to:
1. Create a brief 2-3 sentence summary of the document
2. Suggest 1-3 relevant tags from this predefined list: Marketing, Product, Finance, Legal, Research, Timeline, Brand, Operations, Sales, HR

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "summary": "2-3 sentence summary of the document content",
  "suggestedTags": ["Tag1", "Tag2"]
}

Guidelines:
- Summary should capture the main purpose and key points of the document
- Only suggest tags that are clearly relevant
- Keep the summary professional and concise`

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Document name: ${documentName}\n\nContent (first 4000 characters):\n${content.slice(0, 4000)}`,
        },
      ],
    })

    const responseContent = message.content[0]
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type")
    }

    let jsonText = responseContent.text.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()
    
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    const result = JSON.parse(jsonText) as { summary: string; suggestedTags: string[] }
    return {
      summary: result.summary || "",
      suggestedTags: result.suggestedTags || []
    }
  } catch (error) {
    console.error("Failed to generate single document summary:", error)
    return {
      summary: "",
      suggestedTags: []
    }
  }
}
