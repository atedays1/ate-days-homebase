import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { sendDiscoveryNotification } from "@/lib/email"

// POST - Send a test email notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const { access } = await requireAuth()
    
    if (access?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }
    
    // Sample discoveries for test email
    const testDiscoveries = [
      {
        brand_name: "Ritual",
        website_url: "https://ritual.com",
        description: "Essential vitamins made traceable with high-quality ingredients.",
      },
      {
        brand_name: "Athletic Greens",
        website_url: "https://athleticgreens.com",
        description: "Comprehensive daily nutrition in one drink.",
      },
      {
        brand_name: "Seed",
        website_url: "https://seed.com",
        description: "Synbiotic supplements for gut health and digestive wellness.",
      },
    ]
    
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://atedays-homebase.vercel.app"
    const result = await sendDiscoveryNotification(testDiscoveries, dashboardUrl)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Test email sent!",
      id: result.id,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[Test Email] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    )
  }
}
