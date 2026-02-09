import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Email recipients for notifications
const NOTIFICATION_EMAILS = ["chris.morell@atedays.com"]

interface CompetitorDiscovery {
  brand_name: string
  website_url: string | null
  description: string | null
}

export async function sendDiscoveryNotification(
  discoveries: CompetitorDiscovery[],
  dashboardUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping notification")
    return { success: false, error: "Resend not configured" }
  }

  if (discoveries.length === 0) {
    console.log("[Email] No discoveries to notify about")
    return { success: true, message: "No discoveries" }
  }

  const competitorsList = discoveries
    .map(d => {
      const url = d.website_url ? ` - ${d.website_url}` : ""
      const desc = d.description ? `<br><span style="color: #6b7280; font-size: 13px;">${d.description}</span>` : ""
      return `<li style="margin-bottom: 12px;"><strong>${d.brand_name}</strong>${url}${desc}</li>`
    })
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
            🔍 ${discoveries.length} New Competitor${discoveries.length > 1 ? "s" : ""} Discovered
          </h1>
        </div>
        
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #4b5563; margin-top: 0;">
            Our weekly scan found ${discoveries.length > 1 ? "these new brands" : "a new brand"} in the supplement market:
          </p>
          
          <ul style="padding-left: 20px; margin: 20px 0;">
            ${competitorsList}
          </ul>
          
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="${dashboardUrl}/competitors" 
               style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Review in Dashboard →
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; margin-bottom: 0;">
            This is an automated notification from AteDays Homebase.
          </p>
        </div>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: "AteDays Homebase <onboarding@resend.dev>",
      to: NOTIFICATION_EMAILS,
      subject: `🔍 ${discoveries.length} New Competitor${discoveries.length > 1 ? "s" : ""} Discovered`,
      html,
    })

    if (error) {
      console.error("[Email] Failed to send:", error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Notification sent successfully to ${NOTIFICATION_EMAILS.join(", ")}`)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[Email] Error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
