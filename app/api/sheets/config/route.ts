import { NextRequest, NextResponse } from "next/server"
import { isServiceAccountConfigured } from "@/lib/google-sheets"

// GET /api/sheets/config - Check sheets configuration
export async function GET(request: NextRequest) {
  return NextResponse.json({
    serviceAccountConfigured: isServiceAccountConfigured(),
  })
}
