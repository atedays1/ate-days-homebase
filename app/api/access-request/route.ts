import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase-server"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const ADMIN_EMAIL = "chris.morell@atedays.com"

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Check if user already has an access record
    const { data: existingAccess } = await serviceClient
      .from("user_access")
      .select("*")
      .eq("email", email)
      .single()

    // If no record exists, create one
    if (!existingAccess) {
      const isAteDaysEmail = email.toLowerCase().endsWith("@atedays.com")

      await serviceClient.from("user_access").insert({
        email,
        name: name || null,
        status: isAteDaysEmail ? "approved" : "pending",
        role: isAteDaysEmail ? "editor" : "viewer",
      })

      // If not an @atedays.com email, send notification to admin
      if (!isAteDaysEmail && resend) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"

          await resend.emails.send({
            from: "AteDays Homebase <noreply@atedays.com>",
            to: ADMIN_EMAIL,
            subject: `New Access Request: ${name || email}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #171717; margin-bottom: 20px;">New Access Request</h2>
                
                <p style="color: #525252; margin-bottom: 16px;">
                  Someone has requested access to AteDays Homebase:
                </p>
                
                <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <p style="margin: 0 0 8px 0; color: #171717;"><strong>Name:</strong> ${name || "Not provided"}</p>
                  <p style="margin: 0; color: #171717;"><strong>Email:</strong> ${email}</p>
                </div>
                
                <a href="${appUrl}/admin/users" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
                  Review Request
                </a>
                
                <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
                  This is an automated message from AteDays Homebase.
                </p>
              </div>
            `,
          })
        } catch (emailError) {
          console.error("Failed to send notification email:", emailError)
          // Don't fail the request if email fails
        }
      } else if (!isAteDaysEmail && !resend) {
        console.log(
          "Resend not configured - skipping email notification for:",
          email
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in access request:", error)
    return NextResponse.json(
      { error: "Failed to process access request" },
      { status: 500 }
    )
  }
}
