import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/api-auth"
import { createServiceClient } from "@/lib/supabase-server"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function GET() {
  try {
    await requireAdmin()
    
    const serviceClient = createServiceClient()
    
    const { data: users, error } = await serviceClient
      .from("user_access")
      .select("*")
      .order("requested_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    const { email, status, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    
    const updateData: Record<string, string> = {}
    
    if (status) {
      updateData.status = status
      if (status === "approved") {
        updateData.approved_by = auth.user.email
      }
    }
    
    if (role) {
      updateData.role = role
    }

    const { data: updatedUser, error } = await serviceClient
      .from("user_access")
      .update(updateData)
      .eq("email", email)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Send notification email if user was approved
    if (status === "approved" && resend) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
        
        await resend.emails.send({
          from: "AteDays Homebase <noreply@atedays.com>",
          to: email,
          subject: "Your Access Request Has Been Approved",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #171717; margin-bottom: 20px;">Access Approved!</h2>
              
              <p style="color: #525252; margin-bottom: 24px;">
                Great news! Your request to access AteDays Homebase has been approved.
                You can now sign in and access the dashboard.
              </p>
              
              <a href="${appUrl}" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
                Go to Dashboard
              </a>
              
              <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
                This is an automated message from AteDays Homebase.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError)
      }
    }

    // Send notification email if user was denied
    if (status === "denied" && resend) {
      try {
        await resend.emails.send({
          from: "AteDays Homebase <noreply@atedays.com>",
          to: email,
          subject: "Your Access Request Status",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #171717; margin-bottom: 20px;">Access Request Update</h2>
              
              <p style="color: #525252; margin-bottom: 24px;">
                Your request to access AteDays Homebase has been reviewed. 
                Unfortunately, we're unable to grant access at this time.
              </p>
              
              <p style="color: #525252;">
                If you believe this is an error, please contact chris.morell@atedays.com.
              </p>
              
              <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
                This is an automated message from AteDays Homebase.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Failed to send denial email:", emailError)
      }
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
